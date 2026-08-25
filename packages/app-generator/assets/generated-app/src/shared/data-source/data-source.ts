import type { AggregateDescriptor, EntityModel, FieldDescriptor } from '../types/aggregate.ts';

export type SortDirection = 'asc' | 'desc';

export type ReadListSort =
  | { kind: 'iri'; direction: SortDirection }
  | { kind: 'field'; fieldPath: string; direction: SortDirection };

export const DEFAULT_READ_LIST_SORT: ReadListSort = { kind: 'iri', direction: 'asc' };
export const INCOMING_REFERENCE_LIMIT = 10;

export interface IncomingReference {
  subject: string;
  predicate: string;
}

export interface ReadListArgs<TModel extends EntityModel> {
  aggregate: AggregateDescriptor<TModel>;
  page: number;
  pageSize: number;
  sort: ReadListSort;
}

export interface ReadListResult<TModel extends EntityModel> {
  items: TModel[];
  total: number;
}

export interface ReadDetailArgs<TModel extends EntityModel> {
  aggregate: AggregateDescriptor<TModel>;
  id: string;
}

export interface MutationArgs<TModel extends EntityModel> {
  aggregate: AggregateDescriptor<TModel>;
  /** Path to an inline composition target within the aggregate. Empty means the aggregate root. */
  fieldPath?: readonly string[];
  /** Selects the concrete write schema when the entity target has specializations. */
  specializationIri?: string;
  payload: TModel;
}

export interface IdentifiedMutationArgs<TModel extends EntityModel> extends MutationArgs<TModel> {
  id: string;
}

export interface DeleteArgs<TModel extends EntityModel> {
  aggregate: AggregateDescriptor<TModel>;
  /** Path to an inline composition target within the aggregate. Empty means the aggregate root. */
  fieldPath?: readonly string[];
  id: string;
}

/** A selectable reference target: the entity IRI and a human label for the reference picker. */
export interface ReferenceOption {
  id: string;
  label: string;
}

export interface ReferenceListArgs {
  classIri: string;
  displayProperties: readonly string[];
}

export interface DataSource {
  readList<TModel extends EntityModel>(args: ReadListArgs<TModel>): Promise<ReadListResult<TModel>>;
  readDetail<TModel extends EntityModel>(args: ReadDetailArgs<TModel>): Promise<TModel | null>;
  create<TModel extends EntityModel>(args: MutationArgs<TModel>): Promise<TModel>;
  update<TModel extends EntityModel>(args: IdentifiedMutationArgs<TModel>): Promise<TModel>;
  delete<TModel extends EntityModel>(args: DeleteArgs<TModel>): Promise<void>;
  /** Lists up to ten RDF references to the entity. */
  listIncomingReferences(id: string): Promise<IncomingReference[]>;
  /**
   * Lists candidate targets of a reference by RDF class and formats them from the requested
   * primitive fields. Optional because only sources that can answer a type query provide it.
   */
  listByType?(args: ReferenceListArgs): Promise<ReferenceOption[]>;
}

export function isListFieldSortable(
  field: FieldDescriptor
): field is FieldDescriptor & { propertyIri: string } {
  return (
    field.kind === 'primitive' &&
    field.formControl !== 'multilingual' &&
    !field.many &&
    !field.isReverse &&
    Boolean(field.propertyIri)
  );
}
