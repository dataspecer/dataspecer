import { ResourceTypes } from "../../../resource-types.ts";
import { DatastoreInitializerFallback } from "../implementations/fallback-model.ts";
import { DatastoreInitializerForSemanticModel } from "../implementations/semantic-model.ts";
import { DatastoreInitializerForVisualModel } from "../implementations/visual-model.ts";

/**
 * @deprecated TODO RadStr: Probably Deprecated (and should be removed) and all the related initializer, but maybe not we will see. The idea was to always extract only relevant fields
 *  to copy for the resource type. However it is just better to replace each iri occurrence. But maybe it still makes sense to create only part of it, that is why I still keep it. Yeah but probably just remove
 */
export interface DatastoreInitializer {
  createDatastoreFromAnother(iriInOther: string, iriInNew: string, otherDatastore: string): any;
}

export class DatastoreDefaultsFactory {
  private constructor() {}    // Behave as non-initializable class

  public static getDatastoreDefaultInitializer(resourceType: ResourceTypes): DatastoreInitializer {
    switch(resourceType) {
      case "http://dataspecer.com/resources/local/visual-model":
        return new DatastoreInitializerForVisualModel();
      case "http://dataspecer.com/resources/local/semantic-model":
        return new DatastoreInitializerForSemanticModel();
      default:
        console.info(`The datastore of type ${resourceType} does not have implemented initializer`);
        return new DatastoreInitializerFallback();
    }
  }
}