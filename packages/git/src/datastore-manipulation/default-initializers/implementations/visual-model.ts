import { DatastoreInitializer } from "../initializer-interface/datastore-default-factory.ts";

export class DatastoreInitializerForVisualModel implements DatastoreInitializer {
  createDatastoreFromAnother(iriInOther: string, iriInNew: string, otherDatastore: string): any {
    return otherDatastore;
  }
}