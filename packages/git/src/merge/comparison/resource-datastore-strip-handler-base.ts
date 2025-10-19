import { ResourceDatastoreStripHandler } from "./resource-datastore-strip-handler.ts";

/**
 * Returns the object stripped by the values - Note that the given parameter ({@link datastoreContent}) is modified.
 */
export type DatastoreStripHandlerMethod = (datastoreContent: any) => any;

export class ResourceDatastoreStripHandlerBase implements ResourceDatastoreStripHandler {
  /**
   * This creates method which handles stripping of specific datastore type
   */
  public createHandlerMethodForDatastoreType(datastoreType: string): DatastoreStripHandlerMethod {
    return (datastoreContent: any) => {return this.stripDatastoreContent(datastoreContent, datastoreType)};
  }

  protected resourceType: string;

  constructor(resourceType: string) {
    this.resourceType = resourceType;
  }

  getResourceType() {
    return this.resourceType;
  }

  stripDatastoreContent(datastoreContent: any, type: string): any {
    if (type === "meta") {
      // Strip Export data
      for (const [key, value] of Object.entries(datastoreContent)) {
        if (key.startsWith("_")) {
          delete datastoreContent[key];
        }
      }
      delete datastoreContent["metadata"];
    }

    // For every type (including meta) strip iri
    delete datastoreContent["iri"];
    return datastoreContent;
  }
}
