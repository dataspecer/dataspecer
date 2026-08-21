import type { Lens, QueryContext, Schema } from 'ldkit';
import { createLens, QueryEngine } from 'ldkit';
import { DataFactory, type RDF } from 'ldkit/rdf';
import { DELETE, OPTIONAL, SELECT } from 'ldkit/sparql';

import {
  type AggregateDescriptor,
  type EntityModel,
  type FieldDescriptor,
  fieldValues,
} from '../types/aggregate.ts';
import { isSafeAbsoluteIri } from '../forms/iri.ts';
import type {
  DataSource,
  DeleteArgs,
  IdentifiedMutationArgs,
  IncomingReference,
  MutationArgs,
  ReadDetailArgs,
  ReadListArgs,
  ReadListResult,
  ReadListSort,
  ReferenceListArgs,
  ReferenceOption,
} from './data-source.ts';
import {
  DataSourceKind,
  DEFAULT_READ_LIST_SORT,
  INCOMING_REFERENCE_LIMIT,
  isListFieldSortable,
} from './data-source.ts';

const FALLBACK_LABEL_PROPERTIES = [
  'http://purl.org/dc/terms/title',
  'http://www.w3.org/2004/02/skos/core#prefLabel',
  'http://www.w3.org/2000/01/rdf-schema#label',
];
const dataFactory = new DataFactory();

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

  async readList<TModel extends EntityModel>(
    args: ReadListArgs<TModel>
  ): Promise<ReadListResult<TModel>> {
    const lens = this.resolveTarget(args.aggregate).lens;
    const skip = (args.page - 1) * args.pageSize;
    const iriQuery = buildPageIriQuery(args.aggregate, args.pageSize, skip, args.sort);
    const [total, iriBindings] = await Promise.all([
      lens.count(),
      new QueryEngine().queryBindings(iriQuery, this.context()).then(readBindings),
    ]);
    const iris = iriBindings.map((binding) =>
      toSafeNamedNodeValue(binding.get('iri'), 'List result IRI')
    );
    if (iris.length === 0) {
      return { items: [], total };
    }

    const items = (await lens.findByIris(iris)).map((entity) => toModel<TModel>(entity));
    const itemById = new Map(items.map((item) => [item.id, item]));
    return {
      // findByIris does not preserve the order of the requested IRIs
      items: iris.flatMap((iri) => {
        const item = itemById.get(iri);
        return item ? [item] : [];
      }),
      total,
    };
  }

  async readDetail<TModel extends EntityModel>(
    args: ReadDetailArgs<TModel>
  ): Promise<TModel | null> {
    requireSafeAbsoluteIri(args.id, 'Entity IRI');
    const lens = this.resolveTarget(args.aggregate).lens;
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
    requireSafeAbsoluteIri(args.id, 'Entity IRI');
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
    requireSafeAbsoluteIri(args.id, 'Entity IRI');
    const { fields, lens } = this.resolveTarget(args.aggregate, args.fieldPath);
    const inverseDeleteQuery = buildInverseDeleteQuery(inverseWritableFields(fields), args.id);
    await this.executeUpdate(inverseDeleteQuery);
    await lens.delete(args.id);
  }

  async listIncomingReferences(id: string): Promise<IncomingReference[]> {
    const stream = await new QueryEngine().queryBindings(
      buildIncomingReferencesQuery(id),
      this.context()
    );
    const bindings = readBindings(stream);
    return bindings.map((binding) => ({
      subject: binding.get('subject')!.value,
      predicate: binding.get('predicate')!.value,
    }));
  }

  async listByType(args: ReferenceListArgs): Promise<ReferenceOption[]> {
    const query = buildReferenceOptionsQuery(args);
    const displayProperties = referenceDisplayProperties(args);

    // This SELECT is not tied to a schema, so it runs directly on the query engine with the same
    // endpoint context as the lenses.
    const stream = await new QueryEngine().queryBindings(query, this.context());
    const bindings = readBindings(stream);

    const valuesByIri = new Map<string, Array<Set<string>>>();
    for (const binding of bindings) {
      const iri = binding.get('iri')!.value;
      const values = valuesByIri.get(iri) ?? displayProperties.map(() => new Set<string>());
      displayProperties.forEach((_, index) => {
        const value = binding.get(`value${index}`)?.value;
        if (value !== undefined) {
          values[index].add(value);
        }
      });
      if (!valuesByIri.has(iri)) {
        valuesByIri.set(iri, values);
      }
    }
    return [...valuesByIri].map(([id, values]) => {
      const sortedValues = values.map((fieldValues) => [...fieldValues].sort());
      const labelValues =
        args.displayProperties.length > 0
          ? sortedValues.flat()
          : (sortedValues.find((fieldValues) => fieldValues.length > 0) ?? []);
      const label = labelValues.join(', ');
      return { id, label: label || id };
    });
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
      fetch: throwOnFailedRequest,
    };
  }
}

export function buildPageIriQuery(
  aggregate: Pick<AggregateDescriptor, 'name' | 'classIri' | 'fields'>,
  take: number,
  skip: number,
  sort: ReadListSort = DEFAULT_READ_LIST_SORT
): string {
  const classNode = toSparqlNamedNode(aggregate.classIri, 'Aggregate class IRI');
  if (sort.kind === 'iri') {
    const order = sort.direction === 'asc' ? 'ASC(STR(?iri))' : 'DESC(STR(?iri))';
    return SELECT.DISTINCT`?iri`.WHERE`?iri a ${classNode} .`.ORDER_BY`${order}`
      .LIMIT(take)
      .OFFSET(skip)
      .build();
  }

  const field = aggregate.fields.find((candidate) => candidate.path === sort.fieldPath);
  if (!field || !isListFieldSortable(field)) {
    throw new Error(`Field "${aggregate.name}.${sort.fieldPath}" cannot be used for list sorting.`);
  }

  const propertyNode = toSparqlNamedNode(field.propertyIri, 'Sort property IRI');
  const valueOrder = sort.direction === 'asc' ? 'ASC(?sortValue)' : 'DESC(?sortValue)';
  return SELECT`?iri (MIN(?value) AS ?sortValue)`
    .WHERE`?iri a ${classNode} . OPTIONAL { ?iri ${propertyNode} ?value . }`.GROUP_BY`?iri`
    .ORDER_BY`ASC(!BOUND(?sortValue)) ${valueOrder} ASC(STR(?iri))`
    .LIMIT(take)
    .OFFSET(skip)
    .build();
}

export function buildIncomingReferencesQuery(entityId: string): string {
  const entityNode = toSparqlNamedNode(entityId, 'Entity IRI');
  return SELECT.DISTINCT`?subject ?predicate`.WHERE`?subject ?predicate ${entityNode} .`
    .ORDER_BY`STR(?subject) STR(?predicate)`
    .LIMIT(INCOMING_REFERENCE_LIMIT)
    .build();
}

export function buildReferenceOptionsQuery(args: ReferenceListArgs): string {
  const classNode = toSparqlNamedNode(args.classIri, 'Reference target class IRI');
  const displayProperties = referenceDisplayProperties(args);
  const valueVariables = displayProperties.map((_, index) => `?value${index}`);
  const pageQuery = SELECT.DISTINCT`?iri`.WHERE`?iri a ${classNode} .`.ORDER_BY`STR(?iri)`.LIMIT(
    200
  );
  const optionalPatterns = displayProperties.map((propertyIri, index) => {
    const predicate = toSparqlNamedNode(propertyIri, 'Reference display property IRI');
    return OPTIONAL`?iri ${predicate} ${valueVariables[index]} .`;
  });

  return SELECT`?iri ${valueVariables.join(' ')}`.WHERE`{ ${pageQuery} } ${optionalPatterns}`
    .ORDER_BY`STR(?iri)`.build();
}

function referenceDisplayProperties(args: ReferenceListArgs): readonly string[] {
  return args.displayProperties.length > 0 ? args.displayProperties : FALLBACK_LABEL_PROPERTIES;
}

/**
 * Builds the reversed triples LDKit cannot write through an `@inverse` schema property.
 */
export function buildInverseInsertQuads<TModel extends EntityModel>(
  fields: readonly FieldDescriptor[],
  payload: TModel
): RDF.Quad[] {
  if (fields.length === 0) {
    return [];
  }

  const entityNode = toSparqlNamedNode(payload.id as string, 'Entity IRI');
  const record = payload as Record<string, unknown>;
  return fields.flatMap((field) => {
    const predicate = toSparqlNamedNode(field.propertyIri as string, 'Inverse predicate IRI');
    return referenceIds(record[field.propertyName], field).map((targetId) =>
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
  const predicates = fields.map((field) =>
    toSparqlNamedNode(field.propertyIri as string, 'Inverse predicate IRI')
  );
  if (predicates.length === 0) {
    return null;
  }

  const entityNode = toSparqlNamedNode(entityId, 'Entity IRI');
  return DELETE`?target ?predicate ${entityNode}`.WHERE`
    VALUES ?predicate { ${predicates} }
    ?target ?predicate ${entityNode}
  `.build();
}

export function toSparqlNamedNode(value: string, label: string): RDF.NamedNode {
  return dataFactory.namedNode(requireSafeAbsoluteIri(value, label));
}

/** Returns a store-provided named-node IRI only when it is safe to pass back into LDKit. */
export function toSafeNamedNodeValue(term: RDF.Term | undefined, label: string): string {
  if (term?.termType !== 'NamedNode') {
    throw new Error(`${label} must be a safe absolute named-node IRI.`);
  }
  return requireSafeAbsoluteIri(term.value, label);
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
function referenceIds(value: unknown, field: FieldDescriptor): string[] {
  return fieldValues(value, field).flatMap((entry) => {
    const id = typeof entry === 'string' ? entry : (entry as { id: string }).id;
    return id === '' ? [] : [id];
  });
}

// LDKit's QueryEngine buffers the SPARQL JSON response before returning its result stream.
function readBindings(stream: RDF.ResultStream<RDF.Bindings>): RDF.Bindings[] {
  const bindings: RDF.Bindings[] = [];
  for (let binding = stream.read(); binding !== null; binding = stream.read()) {
    bindings.push(binding);
  }
  return bindings;
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
      if (nested !== '') {
        result.$id = requireSafeAbsoluteIri(nested, 'Payload id');
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

function requireSafeAbsoluteIri(value: unknown, label: string): string {
  if (typeof value !== 'string' || !isSafeAbsoluteIri(value)) {
    throw new Error(`${label} must be a safe absolute IRI.`);
  }
  return value;
}

/**
 * LDKit checks the response of a query but not of an update, so an endpoint that rejects a write
 * would resolve as a success and the application would report data as saved that never was. Every
 * request the engine makes goes through here instead.
 */
const throwOnFailedRequest: typeof fetch = async (input, init) => {
  const response = await fetch(input, init);
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(
      `The endpoint rejected the request: ${response.status} ${response.statusText}.`
    );
  }
  return response;
};
