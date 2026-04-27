import { ResourceTypesOrString } from "../../resource-types.ts";
import { ResourceDatastoreStripHandler, StripResult } from "./resource-datastore-strip-handler.ts";


/**
 * Returns the object stripped by the values - Note that the given parameter ({@link datastoreContent}) is modified.
 */
export type DatastoreStripHandlerMethod = (datastoreContent: any, shouldStrip: boolean) => StripResult;

export class ResourceDatastoreStripHandlerBase implements ResourceDatastoreStripHandler {
  /**
   * This creates method which handles stripping of specific datastore type
   */
  public createHandlerMethodForDatastoreType(datastoreType: string): DatastoreStripHandlerMethod {
    return (datastoreContent: any, shouldStrip: boolean) => {return this.stripDatastoreContent(datastoreContent, datastoreType, shouldStrip)};
  }

  protected resourceType: ResourceTypesOrString;

  constructor(resourceType: ResourceTypesOrString) {
    this.resourceType = resourceType;
  }

  getResourceType() {
    return this.resourceType;
  }

  stripDatastoreContent(datastoreContent: any, type: string, shouldStrip: boolean): StripResult {
    const strippedValues: any = {};

    // For every type (including meta) strip iri

    if (type === "meta") {
      extendAndDelete(strippedValues, datastoreContent, "iri", shouldStrip);
      // Strip Export data
      extendAndDelete(strippedValues, datastoreContent, "metadata", shouldStrip);

      for (const [key, value] of Object.entries(datastoreContent)) {
        if (key.startsWith("_")) {
          extendAndDelete(strippedValues, datastoreContent, key, shouldStrip);
        }
      }
    }

    return {
      strippedValues,
      strippedDatastore: datastoreContent,
    };
  }

  // /**
  //  * @todo TODO RadStr: ... we were stripping based on datastore type, but in the end we probably just need to strip the meta file.
  //  *                           Because the iri replacement handles the unnecessary diffs
  //  */
  // stripDatastoreContent(datastoreContent: any, type: string, shouldStrip: boolean): StripResult {
  //   const strippedValues: any = {};

  //   // For every type (including meta) strip iri
  //   extendAndDelete(strippedValues, datastoreContent, "iri", shouldStrip);

  //   if (type === "meta") {
  //     // Strip Export data
  //     extendAndDelete(strippedValues, datastoreContent, "metadata", shouldStrip);

  //     for (const [key, value] of Object.entries(datastoreContent)) {
  //       if (key.startsWith("_")) {
  //         extendAndDelete(strippedValues, datastoreContent, key, shouldStrip);
  //       }
  //     }
  //   }
  //   else {
  //     if (this.resourceType === "http://dataspecer.com/resources/local/visual-model") {
  //       extendAndDelete(strippedValues, datastoreContent, "modelId", shouldStrip);
  //     }
  //     else if(this.resourceType === "http://dataspecer.com/resources/local/semantic-model") {
  //       extendAndDelete(strippedValues, datastoreContent, "modelId", shouldStrip);
  //       extendAndDelete(strippedValues, datastoreContent, "baseIri", shouldStrip);
  //     }
  //   }

  //   return {
  //     strippedValues,
  //     strippedDatastore: datastoreContent,
  //   };
  // }
}

function extendAndDelete(objectToExtend: any, objectToDeleteFrom: any, key: string, shouldRemoveField: boolean) {
  objectToExtend[key] = objectToDeleteFrom[key];
  if (shouldRemoveField) {
    delete objectToDeleteFrom[key];
  }
}
