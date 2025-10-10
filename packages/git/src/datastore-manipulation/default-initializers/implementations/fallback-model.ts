import { DatastoreInitializer } from "../initializer-interface/datastore-default-factory.ts";

/**
 * This exists only, because sometimes we want to just copy the whole datastore and also to have reasonable default instead of throwing error.
 */
export class DatastoreInitializerFallback implements DatastoreInitializer {
  createDatastoreFromAnother(iriInOther: string, iriInNew: string, otherDatastore: string): any {
    otherDatastore.replaceAll(iriInOther, iriInNew);
    return otherDatastore;
  }
}
