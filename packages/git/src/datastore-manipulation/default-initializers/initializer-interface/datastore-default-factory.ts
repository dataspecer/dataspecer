import { ResourceTypes } from "../../../resource-types.ts";
import { DatastoreInitializerFallback } from "../implementations/fallback-model.ts";
import { DatastoreInitializerForSemanticModel } from "../implementations/semantic-model.ts";
import { DatastoreInitializerForVisualModel } from "../implementations/visual-model.ts";

/**
 * @deprecated Probably Deprecated (and should be removed) together with all the related initializers. The idea was to always extract only relevant fields
 *  when copying specific resource type. However, it is just better to copy everything and replace each iri occurrence. Then we just send to the backend the stripped version,
 *  which will be the actual part where we get only the relevant fields.
 *  But maybe it still makes sense to create only part of it, that is why we put deprecated tag to it and not straight up remove it.
 */
export interface DatastoreInitializer {
  createDatastoreFromAnother(iriInOther: string, iriInNew: string, otherDatastore: string): any;
}

/**
 * @deprecated See {@link DatastoreInitializer} for more info
 */
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
