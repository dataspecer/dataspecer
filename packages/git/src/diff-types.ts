import { DatastoreInfo } from "./export-import-data-api.ts";
import { FilesystemNode } from "./export-import-data-api.ts";


// TODO RadStr: Move elsewhere in code. Used both in backend and DiffTree dialog
export type ComparisonData = {
  oldVersion: FilesystemNode | null;
  affectedDataStore: DatastoreInfo;
  newVersion: FilesystemNode | null;
}