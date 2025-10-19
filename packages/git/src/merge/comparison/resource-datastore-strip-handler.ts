export interface ResourceDatastoreStripHandler {
  getResourceType(): string;
  stripDatastoreContent(datastoreContent: any, type: string): void;
}
