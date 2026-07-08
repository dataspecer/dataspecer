export enum Operation {
  Create = 'Create',
  ReadList = 'ReadList',
  ReadDetail = 'ReadDetail',
  Update = 'Update',
  Delete = 'Delete',
}

export enum EdgeType {
  Transition = 'transition',
  Redirect = 'redirect',
}

export enum DatasourceType {
  Rdf = 'rdf',
}

export enum AssociationKind {
  Composition = 'composition',
  Aggregation = 'aggregation',
}

export enum DeletePolicy {
  Cascade = 'cascade',
}

export type AssociationConfig = Record<string, AssociationKind>;

export type DeleteConfig = Record<string, DeletePolicy>;

export interface ApplicationNodeConfig {
  pageTitle?: string;
  associations?: AssociationConfig;
  delete?: DeleteConfig;
}

export interface DatasourceConfig {
  id: string;
  type: DatasourceType;
  endpoint: string;
}

export interface ApplicationNode {
  id: string;
  aggregateIri: string;
  operation: Operation;
  config?: ApplicationNodeConfig;
}

export interface ApplicationEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
}

export interface ApplicationGraph {
  name: string;
  dataSpecificationIri: string;
  datasources: DatasourceConfig[];
  nodes: ApplicationNode[];
  edges: ApplicationEdge[];
}
