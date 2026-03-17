import type { AggregateDescriptor, EntityModel } from '../types/aggregate.ts';

export enum DataSourceKind {
  Rdf = 'rdf',
  File = 'file',
  Rest = 'rest',
  Other = 'other',
}

export interface Order {
  property: string;
  direction: 'asc' | 'desc';
}

export interface ReadListArgs<TModel extends EntityModel> {
  aggregate: AggregateDescriptor<TModel>;
  page?: number;
  pageSize?: number;
  orderBy?: Order;
}

export interface ReadDetailArgs<TModel extends EntityModel> {
  aggregate: AggregateDescriptor<TModel>;
  id: string;
}

export interface MutationArgs<TModel extends EntityModel> {
  aggregate: AggregateDescriptor<TModel>;
  payload: TModel;
}

export interface IdentifiedMutationArgs<TModel extends EntityModel> extends MutationArgs<TModel> {
  id: string;
}

export interface DeleteArgs<TModel extends EntityModel> {
  aggregate: AggregateDescriptor<TModel>;
  id: string;
}

export interface DataSource {
  kind: DataSourceKind;
  readList<TModel extends EntityModel>(args: ReadListArgs<TModel>): Promise<TModel[]>;
  readDetail<TModel extends EntityModel>(args: ReadDetailArgs<TModel>): Promise<TModel | null>;
  create<TModel extends EntityModel>(args: MutationArgs<TModel>): Promise<TModel>;
  update<TModel extends EntityModel>(args: IdentifiedMutationArgs<TModel>): Promise<TModel>;
  delete<TModel extends EntityModel>(args: DeleteArgs<TModel>): Promise<void>;
}
