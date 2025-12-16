import { ResourceTypesOrString } from "../../resource-types.ts";

export interface ResourceDatastoreStripHandler {
  getResourceType(): ResourceTypesOrString;
  stripDatastoreContent(datastoreContent: any, type: string): void;
}
