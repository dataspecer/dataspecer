import { ResourceTypesOrString } from "../../resource-types.ts";

/**
 * The values that were removed during the stripping and the datastore without the values.
 */
export type StripResult = {
  strippedValues: any;
  strippedDatastore: any;
};

export interface ResourceDatastoreStripHandler {
  getResourceType(): ResourceTypesOrString;
  /**
   * @param shouldStrip if true then it actually performs the stripping and modifies the {@link datastoreContent} by removing the fields.
   *  If false then it does not do that and only returns the values which would have been removed (note that those values are returned even if the parameter is true).
   */
  stripDatastoreContent(datastoreContent: any, type: string, shouldStrip: boolean): StripResult;
}
