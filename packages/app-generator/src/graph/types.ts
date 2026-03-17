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
  Rest = 'rest',
  File = 'file',
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
  config?: Record<string, unknown>;
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
