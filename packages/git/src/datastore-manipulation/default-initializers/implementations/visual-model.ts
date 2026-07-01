import { DatastoreInitializer } from "../initializer-interface/datastore-default-factory.ts";

/**
 * @deprecated
 */
export class DatastoreInitializerForVisualModel implements DatastoreInitializer {
  createDatastoreFromAnother(iriInOther: string, iriInNew: string, otherDatastore: string): any {
    return otherDatastore;
  }
}