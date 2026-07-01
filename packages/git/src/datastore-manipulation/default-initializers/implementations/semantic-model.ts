import { DatastoreInitializer } from "../initializer-interface/datastore-default-factory.ts";

/**
 * @deprecated
 */
export class DatastoreInitializerForSemanticModel implements DatastoreInitializer {
  createDatastoreFromAnother(iriInOther: string, iriInNew: string, otherDatastore: string): any {
    return otherDatastore;
  }
}