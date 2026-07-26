import type { Lens, Schema, QueryContext } from 'ldkit';
import { createLens, QueryEngine } from 'ldkit';
import { DataFactory, type RDF } from 'ldkit/rdf';
import { sparql } from 'ldkit/sparql';

import type { AggregateDescriptor, EntityModel, FieldDescriptor } from '../types/aggregate.ts';
import type {
  DataSource,
  DeleteArgs,
  IdentifiedMutationArgs,
  MutationArgs,
  ReadDetailArgs,
  ReadListArgs,
  ReferenceOption,
} from './data-source.ts';
import { DataSourceKind } from './data-source.ts';

const LABEL_PREDICATES = [
  'http://www.w3.org/2000/01/rdf-schema#label',
  'http://www.w3.org/2004/02/skos/core#prefLabel',
  'http://purl.org/dc/terms/title',
];
const dataFactory = new DataFactory();
const absoluteIri = /^[a-z][a-z0-9+.-]*:/i;
// SPARQL IRIREF does not allow these characters unescaped. Rejecting them also prevents a value
// from closing `<...>` and injecting another update into a generated query.
const forbiddenIriCharacters = /[\u0000-\u0020<>"{}|^`\\]/u;

export type LdkitSchemaMap = Record<string, Schema>;

/**
 * Reads data from a SPARQL endpoint through LDKit lenses. Schemas are keyed by aggregate IRI.
 */
export class RdfLdkitDataSource implements DataSource {
  readonly kind: DataSourceKind = DataSourceKind.Rdf;

  constructor(
    private readonly endpoint: string,
    private readonly schemas: LdkitSchemaMap
  ) {}

  async readList<TModel extends EntityModel>(args: ReadListArgs<TModel>): Promise<TModel[]> {
    const lens = this.buildLens(args.aggregate);
    // TODO: Handle args.orderBy and pagination in the generated list page
    const result = await lens.find({
      take: args.pageSize ?? 100,
      skip: ((args.page ?? 1) - 1) * (args.pageSize ?? 100),
    });

    return result.map((entity) => toModel<TModel>(entity));
  }

  async readDetail<TModel extends EntityModel>(
    args: ReadDetailArgs<TModel>
  ): Promise<TModel | null> {
    const lens = this.buildLens(args.aggregate);
    const result = await lens.findByIri(args.id);
    return result ? toModel<TModel>(result) : null;
  }

  async create<TModel extends EntityModel>(args: MutationArgs<TModel>): Promise<TModel> {
    // LDKit's insert ignores @inverse and would write an inverse relation forward, so inverse
    // fields are kept out of the lens payload and their reversed triples are written separately.
    const { fields, lens } = this.resolveTarget(args.aggregate, args.fieldPath);
    const inverseFields = inverseWritableFields(fields);
    const forwardPayload = omitFields(args.payload, inverseFields);
    const inverseQuads = buildInverseInsertQuads(inverseFields, args.payload);

    const entity = toLdkitEntity(forwardPayload, 'create') as Parameters<typeof lens.insert>[0];
    await lens.insert(entity);
    if (inverseQuads.length > 0) {
      await lens.insertData(...inverseQuads);
    }
    return args.payload;
  }

  async update<TModel extends EntityModel>(args: IdentifiedMutationArgs<TModel>): Promise<TModel> {
    const payload = { ...args.payload, id: args.id };
    const payloadRecord = payload as unknown as Record<string, unknown>;
    const { fields, lens } = this.resolveTarget(args.aggregate, args.fieldPath);
    const inverseFields = inverseWritableFields(fields).filter((field) =>
      Object.hasOwn(payloadRecord, field.propertyName)
    );
    const forwardPayload = omitFields(payload, inverseFields);
    const inverseDeleteQuery = buildInverseDeleteQuery(inverseFields, args.id);
    const inverseQuads = buildInverseInsertQuads(inverseFields, payload);

    const entity = toLdkitEntity(forwardPayload, 'update');
    if (entity && typeof entity === 'object' && Object.keys(entity).some((key) => key !== '$id')) {
      await lens.update(entity as Parameters<typeof lens.update>[0]);
    }
    await this.executeUpdate(inverseDeleteQuery);
    if (inverseQuads.length > 0) {
      await lens.insertData(...inverseQuads);
    }
    return payload;
  }

  private async executeUpdate(query: string | null): Promise<void> {
    if (query === null) {
      return;
    }
    await new QueryEngine().queryVoid(query, this.context());
  }

  async delete<TModel extends EntityModel>(args: DeleteArgs<TModel>): Promise<void> {
    // TODO: Implement recursive composition cascade and incoming reference checks.
    const { fields, lens } = this.resolveTarget(args.aggregate, args.fieldPath);
    const inverseDeleteQuery = buildInverseDeleteQuery(inverseWritableFields(fields), args.id);
    await this.executeUpdate(inverseDeleteQuery);
    await lens.delete(args.id);
  }

  async listByType(classIri: string): Promise<ReferenceOption[]> {
    const labelPath = LABEL_PREDICATES.map((predicate) => `<${predicate}>`).join('|');
    const classNode = toSparqlNamedNode(classIri, 'Reference target class IRI');
    const query = sparql`SELECT DISTINCT ?iri ?label WHERE {
  ?iri a ${classNode} .
  OPTIONAL { ?iri ${labelPath} ?label }
} LIMIT 200`;

    // This SELECT is not tied to a schema, so it runs directly on the query engine with the same
    // endpoint context as the lenses.
    const stream = await new QueryEngine().queryBindings(query, this.context());
    const bindings = await collectStream(stream);

    // Keep the first label seen per IRI, so a repeated label does not duplicate the option. IRIs
    // without a label fall back to the IRI itself.
    const labels = new Map<string, string>();
    for (const binding of bindings) {
      const iri = binding.get('iri')?.value;
      if (iri && !labels.has(iri)) {
        labels.set(iri, binding.get('label')?.value ?? iri);
      }
    }
    return [...labels].map(([id, label]) => ({ id, label }));
  }

  private buildLens<TModel extends EntityModel>(
    aggregate: AggregateDescriptor<TModel>,
    fieldPath: readonly string[] = []
  ): Lens<Schema> {
    return this.resolveTarget(aggregate, fieldPath).lens;
  }

  private resolveTarget<TModel extends EntityModel>(
    aggregate: AggregateDescriptor<TModel>,
    fieldPath: readonly string[] = []
  ): { fields: FieldDescriptor[]; lens: Lens<Schema> } {
    const rootSchema = this.schemas[aggregate.iri];
    if (!rootSchema) {
      throw new Error(`Missing LDKit schema for aggregate "${aggregate.name}".`);
    }
    let fields = aggregate.fields;
    let schema = rootSchema;
    const traversed: string[] = [];

    for (const segment of fieldPath) {
      traversed.push(segment);
      const field = fields.find((candidate) => candidate.path === segment);
      const property = field ? schema[field.propertyName] : undefined;
      const nestedSchema =
        property && typeof property === 'object' && '@schema' in property
          ? property['@schema']
          : undefined;
      if (!field?.fields || !nestedSchema || typeof nestedSchema !== 'object') {
        throw new Error(
          `Missing LDKit schema for inline entity "${aggregate.name}.${traversed.join('.')}".`
        );
      }
      fields = field.fields;
      schema = nestedSchema;
    }

    return {
      fields,
      lens: createLens(schema, this.context()),
    };
  }

  private context(): QueryContext {
    return {
      sources: [this.endpoint],
    };
  }
}

/**
 * Builds the reversed triples LDKit cannot write through an `@inverse` schema property.
 */
export function buildInverseInsertQuads<TModel extends EntityModel>(
  fields: readonly FieldDescriptor[],
  payload: TModel
): RDF.Quad[] {
  const entityId = payload.id;
  if (fields.length === 0 || typeof entityId !== 'string' || entityId === '') {
    return [];
  }

  const entityNode = toSparqlNamedNode(entityId, 'Entity IRI');
  const record = payload as Record<string, unknown>;
  return fields.flatMap((field) => {
    if (!field.propertyIri) {
      return [];
    }
    const predicate = toSparqlNamedNode(field.propertyIri, 'Inverse predicate IRI');
    return referenceIds(record[field.propertyName]).map((targetId) =>
      dataFactory.quad(
        toSparqlNamedNode(targetId, 'Inverse relation target IRI'),
        predicate,
        entityNode
      )
    );
  });
}

export function buildInverseDeleteQuery(
  fields: readonly FieldDescriptor[],
  entityId: string
): string | null {
  const predicates = fields.flatMap((field) =>
    field.propertyIri ? [toSparqlNamedNode(field.propertyIri, 'Inverse predicate IRI')] : []
  );
  if (predicates.length === 0) {
    return null;
  }

  const entityNode = toSparqlNamedNode(entityId, 'Entity IRI');
  return sparql`DELETE { ?target ?predicate ${entityNode} }
WHERE {
  VALUES ?predicate { ${predicates} }
  ?target ?predicate ${entityNode}
}`;
}

export function toSparqlNamedNode(value: string, label: string): RDF.NamedNode {
  if (!absoluteIri.test(value) || forbiddenIriCharacters.test(value)) {
    throw new Error(`${label} must be a safe absolute IRI.`);
  }
  return dataFactory.namedNode(value);
}

function inverseWritableFields(fields: readonly FieldDescriptor[]): FieldDescriptor[] {
  return fields.filter((field) => field.isReverse && field.propertyIri);
}

function omitFields<TModel extends EntityModel>(
  payload: TModel,
  fields: readonly FieldDescriptor[]
): Record<string, unknown> {
  const result = { ...payload } as Record<string, unknown>;
  for (const field of fields) {
    delete result[field.propertyName];
  }
  return result;
}

// Extracts target IRIs from entity IRI objects (or bare IRI strings when no target class was
// available). Empty ids are skipped so an unset reference contributes no triple.
function referenceIds(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  return values
    .map((entry) =>
      typeof entry === 'string'
        ? entry
        : entry && typeof entry === 'object'
          ? (entry as { id?: unknown }).id
          : undefined
    )
    .filter((id): id is string => typeof id === 'string' && id !== '');
}

// Drains an LDKit result stream into an array. The stream is event based, so this resolves once
// all items have arrived.
function collectStream<T>(stream: RDF.ResultStream<T>): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const items: T[] = [];
    stream.on('data', (item: T) => items.push(item));
    stream.on('end', () => resolve(items));
    stream.on('error', reject);
  });
}

// LDKit exposes the entity IRI as $id, at the root and in nested entities. The generated models
// use id, so the rename is applied recursively. Dates and other non-plain values pass through.
function toModel<TModel extends EntityModel>(entity: unknown): TModel {
  return normalizeIds(entity) as TModel;
}

function normalizeIds(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeIds);
  }
  if (value === null || typeof value !== 'object' || value instanceof Date) {
    return value;
  }
  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(source)) {
    if (key === '$id') {
      continue;
    }
    result[key] = normalizeIds(nested);
  }
  if (typeof source.$id === 'string') {
    result.id = source.$id;
  }
  return result;
}

// Converts generated model ids to LDKit's $id form. Update keeps null and empty arrays because
// Lens.update uses them to clear supplied properties.
export function toLdkitEntity(value: unknown, mode: 'create' | 'update'): unknown {
  if (Array.isArray(value)) {
    const entries = value
      .map((entry) => toLdkitEntity(entry, mode))
      .filter((entry) => entry !== undefined);
    return mode === 'update' || entries.length > 0 ? entries : undefined;
  }
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return mode === 'update' ? null : undefined;
  }
  if (value === '') {
    return undefined;
  }
  if (typeof value !== 'object' || value instanceof Date) {
    return value;
  }
  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(source)) {
    if (key === 'id') {
      if (typeof nested === 'string' && nested !== '') {
        result.$id = nested;
      }
      continue;
    }
    const converted = toLdkitEntity(nested, mode);
    if (converted !== undefined) {
      result[key] = converted;
    }
  }
  // An object that keeps no properties (for example an unset reference) is dropped entirely.
  return Object.keys(result).length > 0 ? result : undefined;
}
