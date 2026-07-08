import type { Lens, Schema, QueryContext } from 'ldkit';
import { createLens, QueryEngine } from 'ldkit';
import type { RDF } from 'ldkit/rdf';

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

// Label predicates tried, in order, when building a reference option label.
const LABEL_PREDICATES = [
  'http://www.w3.org/2000/01/rdf-schema#label',
  'http://www.w3.org/2004/02/skos/core#prefLabel',
  'http://purl.org/dc/terms/title',
];

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
    const inverseFields = inverseWritableFields(args.aggregate.fields);
    const forwardPayload = omitFields(args.payload, inverseFields);

    const lens = this.buildLens(args.aggregate);
    const entity = denormalizeIds(forwardPayload) as Parameters<typeof lens.insert>[0];
    await lens.insert(entity);
    await this.writeInverseLinks(inverseFields, args.payload);
    return args.payload;
  }

  async update<TModel extends EntityModel>(args: IdentifiedMutationArgs<TModel>): Promise<TModel> {
    const payload = { ...args.payload, id: args.id };
    const inverseFields = inverseWritableFields(args.aggregate.fields);
    const forwardPayload = omitFields(payload, inverseFields);

    const lens = this.buildLens(args.aggregate);
    const entity = denormalizeIds(forwardPayload) as Parameters<typeof lens.update>[0];
    await lens.update(entity);
    await this.deleteInverseLinks(inverseFields, args.id);
    await this.writeInverseLinks(inverseFields, payload);
    return payload;
  }

  // Writes an inverse relation as `<target> <predicate> <entity>`, the direction LDKit reads but
  // does not write. One triple per referenced target, for single and repeating inverse fields.
  private async writeInverseLinks<TModel extends EntityModel>(
    fields: readonly FieldDescriptor[],
    payload: TModel
  ): Promise<void> {
    const entityId = payload.id;
    if (fields.length === 0 || typeof entityId !== 'string' || entityId === '') {
      return;
    }

    const record = payload as Record<string, unknown>;
    const triples = fields.flatMap((field) =>
      referenceIds(record[field.propertyName]).map(
        (targetId) => `<${targetId}> <${field.propertyIri as string}> <${entityId}>`
      )
    );
    if (triples.length === 0) {
      return;
    }

    await new QueryEngine().queryVoid(`INSERT DATA { ${triples.join(' . ')} }`, this.context());
  }

  private async deleteInverseLinks(
    fields: readonly FieldDescriptor[],
    entityId: string
  ): Promise<void> {
    for (const field of fields) {
      if (!field.propertyIri) {
        continue;
      }
      await new QueryEngine().queryVoid(
        `DELETE WHERE { ?target <${field.propertyIri}> <${entityId}> }`,
        this.context()
      );
    }
  }

  async delete<TModel extends EntityModel>(args: DeleteArgs<TModel>): Promise<void> {
    // TODO: Implement recursive composition cascade and incoming reference checks.
    await this.deleteInverseLinks(inverseWritableFields(args.aggregate.fields), args.id);
    const lens = this.buildLens(args.aggregate);
    await lens.delete(args.id);
  }

  async listByType(classIri: string, limit = 200): Promise<ReferenceOption[]> {
    const labelPath = LABEL_PREDICATES.map((predicate) => `<${predicate}>`).join('|');
    const query = `SELECT DISTINCT ?iri ?label WHERE {
  ?iri a <${classIri}> .
  OPTIONAL { ?iri ${labelPath} ?label }
} LIMIT ${limit}`;

    // A SELECT by class rather than by a fixed schema, so it runs on the query engine directly
    // instead of a lens. Reuses the same endpoint context the lenses read through.
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
    aggregate: AggregateDescriptor<TModel>
  ): Lens<Schema> {
    const schema = this.schemas[aggregate.iri];
    if (!schema) {
      throw new Error(`Missing LDKit schema for aggregate "${aggregate.name}".`);
    }
    return createLens(schema, this.context());
  }

  private context(): QueryContext {
    return {
      sources: [this.endpoint],
    };
  }
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

// Extracts the target IRIs from a reference field value, which is an entity IRI object or an
// array of them. Empty ids are skipped so an unset reference contributes no triple.
function referenceIds(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  return values
    .map((entry) =>
      entry && typeof entry === 'object' ? (entry as { id?: unknown }).id : undefined
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

// Reverse of normalizeIds for writes: the generated models use id, LDKit expects $id. Empty
// strings, null, undefined, and empty arrays are dropped so an unset optional field is not
// written as an empty value. Returns undefined when the whole value drops out.
function denormalizeIds(value: unknown): unknown {
  if (Array.isArray(value)) {
    const entries = value.map(denormalizeIds).filter((entry) => entry !== undefined);
    return entries.length > 0 ? entries : undefined;
  }
  if (value === null || value === undefined || value === '') {
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
    const converted = denormalizeIds(nested);
    if (converted !== undefined) {
      result[key] = converted;
    }
  }
  // An object that keeps no properties (for example an unset reference) is dropped entirely.
  return Object.keys(result).length > 0 ? result : undefined;
}
