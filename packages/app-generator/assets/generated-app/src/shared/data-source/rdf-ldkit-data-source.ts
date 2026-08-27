import type { Lens, Options, QueryContext, Schema } from 'ldkit';
import { createLens, QueryEngine } from 'ldkit';
import type { RDF } from 'ldkit/rdf';

import {
  type AggregateDescriptor,
  type EntityModel,
  type EntityRecord,
  type FieldDescriptor,
} from '../types/aggregate.ts';
import { requireSafeAbsoluteIri } from '../forms/iri.ts';
import { isInlineCompositionField } from '../forms/entity-target.ts';
import { effectiveFields } from '../forms/specialization.ts';
import { referencePreservingEngine } from './reference-preserving-engine.ts';
import type {
  DataSource,
  DeleteArgs,
  IdentifiedMutationArgs,
  IncomingReference,
  MutationArgs,
  ReadDetailArgs,
  ReadListArgs,
  ReadListResult,
  ReferenceListArgs,
  ReferenceOption,
} from './data-source.ts';
import {
  normalizeLdkitEntity,
  requireNamedCompositionIris,
  toLdkitEntity,
} from './ldkit-entity-mapping.ts';
import {
  buildIncomingReferencesQuery,
  buildInverseDeleteQuery,
  buildInverseInsertQuads,
  buildPageIriQuery,
  buildReferenceOptionsQuery,
  referenceDisplayProperties,
  toSafeNamedNodeValue,
} from './rdf-request-builders.ts';

/**
 * LDKit uses schemas for both querying and encoding. Lists omit compositions to keep paging
 * bounded, details expand inline compositions without filtering child types, and writes use
 * target-specific types and IRI links so each entity is saved separately.
 */
export interface LdkitSchemaBundle {
  detail: Schema;
  list: Schema;
  /** Write schemas keyed by JSON-encoded inline field paths. The aggregate root uses `[]`. */
  writes: Record<string, Schema>;
  /** Field paths followed by specialization IRIs. */
  specializationWrites: Record<string, Record<string, Schema>>;
}

export type LdkitSchemaMap = Record<string, LdkitSchemaBundle>;

/** Reads and writes a SPARQL endpoint through LDKit lenses. */
export class RdfLdkitDataSource implements DataSource {
  constructor(
    private readonly endpoint: string,
    private readonly schemas: LdkitSchemaMap,
  ) {}

  async readList<TModel extends EntityModel>(
    args: ReadListArgs<TModel>,
  ): Promise<ReadListResult<TModel>> {
    const schemas = this.requireSchemas(args.aggregate);
    const lens = createLens(schemas.list, this.readContext(args.aggregate.fields, schemas.list));
    const skip = (args.page - 1) * args.pageSize;
    const iriQuery = buildPageIriQuery(args.aggregate, args.pageSize, skip, args.sort);
    // page distinct entity IRIs before loading fields, otherwise one entity can produce multiple
    // SPARQL rows and consume several LIMIT/OFFSET slots
    const [total, iriBindings] = await Promise.all([
      lens.count(),
      new QueryEngine().queryBindings(iriQuery, this.context()).then(readBindings),
    ]);
    const iris = iriBindings.map((binding) =>
      toSafeNamedNodeValue(binding.get('iri'), 'List result IRI'),
    );
    if (iris.length === 0) {
      return { items: [], total };
    }

    const items = (await lens.findByIris(iris)).map(
      (entity) => normalizeLdkitEntity(entity, args.aggregate.fields) as TModel,
    );
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
    args: ReadDetailArgs<TModel>,
  ): Promise<TModel | null> {
    requireSafeAbsoluteIri(args.id, 'Entity IRI');
    const schemas = this.requireSchemas(args.aggregate);
    const lens = createLens(
      schemas.detail,
      this.readContext(args.aggregate.fields, schemas.detail),
    );
    const result = await lens.findByIri(args.id);
    if (!result) {
      return null;
    }
    const model = normalizeLdkitEntity(result, args.aggregate.fields) as TModel;
    requireNamedCompositionIris(model as EntityRecord, args.aggregate.fields);
    return model;
  }

  async create<TModel extends EntityModel>(args: MutationArgs<TModel>): Promise<TModel> {
    // LDKit's insert ignores @inverse and would write an inverse relation forward, so inverse
    // fields are kept out of the lens payload and their reversed triples are written separately.
    const { fields, lens } = this.resolveWriteTarget(
      args.aggregate,
      args.fieldPath,
      args.specializationIri,
    );
    const inverseFields = inverseWritableFields(fields);
    const forwardPayload = omitFields(args.payload, inverseFields);
    const inverseQuads = buildInverseInsertQuads(inverseFields, args.payload);

    const entity = toLdkitEntity(forwardPayload, 'create', fields) as Parameters<
      typeof lens.insert
    >[0];
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
    const { fields, lens } = this.resolveWriteTarget(
      args.aggregate,
      args.fieldPath,
      args.specializationIri,
    );
    // replace only inverse fields present in the payload, absent fields keep their stored values
    const inverseFields = inverseWritableFields(fields).filter((field) =>
      Object.hasOwn(payloadRecord, field.propertyName),
    );
    const forwardPayload = omitFields(payload, inverseFields);
    const inverseDeleteQuery = buildInverseDeleteQuery(inverseFields, args.id);
    const inverseQuads = buildInverseInsertQuads(inverseFields, payload);

    const entity = toLdkitEntity(forwardPayload, 'update', fields);
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
    const { fields } = this.resolveEntityTarget(args.aggregate, args.fieldPath);
    const inverseDeleteQuery = buildInverseDeleteQuery(inverseWritableFields(fields), args.id);
    await this.executeUpdate(inverseDeleteQuery);
    // delete through LDKit removes every subject triple without inspecting the schema
    await createLens({ '@type': args.aggregate.classIri }, this.context()).delete(args.id);
  }

  async listIncomingReferences(id: string): Promise<IncomingReference[]> {
    const stream = await new QueryEngine().queryBindings(
      buildIncomingReferencesQuery(id),
      this.context(),
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

    // this query is not tied to a schema, run it directly with the same endpoint context
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
      // explicit display fields are combined, fallback predicates use the first one with a value
      const labelValues =
        args.displayProperties.length > 0
          ? sortedValues.flat()
          : (sortedValues.find((fieldValues) => fieldValues.length > 0) ?? []);
      const label = labelValues.join(', ');
      return { id, label: label || id };
    });
  }

  private requireSchemas<TModel extends EntityModel>(
    aggregate: AggregateDescriptor<TModel>,
  ): LdkitSchemaBundle {
    const schemas = this.schemas[aggregate.iri];
    if (!schemas) {
      throw new Error(`Missing LDKit schemas for aggregate "${aggregate.name}".`);
    }
    return schemas;
  }

  private resolveEntityTarget<TModel extends EntityModel>(
    aggregate: AggregateDescriptor<TModel>,
    fieldPath: readonly string[] = [],
  ): { fields: FieldDescriptor[]; key: string; targetField?: FieldDescriptor } {
    let fields = aggregate.fields;
    let targetField: FieldDescriptor | undefined;
    const traversed: string[] = [];

    for (const segment of fieldPath) {
      traversed.push(segment);
      const field = fields.find((candidate) => candidate.path === segment);
      if (!field || !isInlineCompositionField(field)) {
        throw new Error(`Missing inline entity target "${aggregate.name}.${traversed.join('.')}".`);
      }
      targetField = field;
      fields = field.fields;
    }

    return {
      fields,
      key: JSON.stringify(fieldPath),
      ...(targetField ? { targetField } : {}),
    };
  }

  private resolveWriteTarget<TModel extends EntityModel>(
    aggregate: AggregateDescriptor<TModel>,
    fieldPath: readonly string[] = [],
    specializationIri?: string,
  ): { fields: FieldDescriptor[]; lens: Lens<Schema> } {
    const schemas = this.requireSchemas(aggregate);
    const target = this.resolveEntityTarget(aggregate, fieldPath);
    const specializedSchemas = schemas.specializationWrites[target.key];

    if (specializedSchemas) {
      if (!specializationIri) {
        throw new Error(
          `Write target "${aggregate.name}.${fieldPath.join('.')}" requires a specialization.`,
        );
      }
      const schema = specializedSchemas[specializationIri];
      const specialization = target.targetField?.specializations?.find(
        (candidate) => candidate.specializationIri === specializationIri,
      );
      if (!schema || !specialization) {
        throw new Error(
          `Unknown specialization "${specializationIri}" for "${aggregate.name}.${fieldPath.join('.')}".`,
        );
      }
      const shape = {
        fields: target.fields,
        specializations: target.targetField?.specializations,
      };
      return {
        fields: effectiveFields(shape, { __specializationIri: specializationIri }),
        lens: createLens(schema, this.context()),
      };
    }

    if (specializationIri) {
      throw new Error(
        `Write target "${aggregate.name}.${fieldPath.join('.')}" has no specializations.`,
      );
    }
    const schema = schemas.writes[target.key];
    if (!schema) {
      throw new Error(`Missing LDKit write schema for "${aggregate.name}.${fieldPath.join('.')}".`);
    }
    return { fields: target.fields, lens: createLens(schema, this.context()) };
  }

  private context(): QueryContext {
    return {
      sources: [this.endpoint],
      fetch: throwOnFailedRequest,
    };
  }

  private readContext(fields: readonly FieldDescriptor[], schema: Schema): Options {
    const engine = referencePreservingEngine(fields, schema);
    return engine ? { ...this.context(), engine } : this.context();
  }
}

function inverseWritableFields(fields: readonly FieldDescriptor[]): FieldDescriptor[] {
  return fields.filter((field) => field.isReverse && field.propertyIri);
}

function omitFields<TModel extends EntityModel>(
  payload: TModel,
  fields: readonly FieldDescriptor[],
): Record<string, unknown> {
  const result = { ...payload } as Record<string, unknown>;
  for (const field of fields) {
    delete result[field.propertyName];
  }
  return result;
}

// LDKit's QueryEngine buffers the SPARQL JSON response before returning its result stream.
function readBindings(stream: RDF.ResultStream<RDF.Bindings>): RDF.Bindings[] {
  const bindings: RDF.Bindings[] = [];
  for (let binding = stream.read(); binding !== null; binding = stream.read()) {
    bindings.push(binding);
  }
  return bindings;
}

/** Rejects failed query and update responses, including writes that LDKit does not check itself. */
const throwOnFailedRequest: typeof fetch = async (input, init) => {
  const response = await fetch(input, init);
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(
      `The endpoint rejected the request: ${response.status} ${response.statusText}.`,
    );
  }
  return response;
};
