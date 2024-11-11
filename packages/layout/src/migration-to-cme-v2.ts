import { ModelVisualInformation, VisualEntity, VisualNode } from "@dataspecer/core-v2/visual-model";

// TODO: For now I will just fix it this simple way ... I still kind of find the type weird, but maybe it is better than having
//       "Record<string, VisualEntity>" everywhere

// Newly the actual mapping in cme-v2 is using the id of visual entity as key
type VisualEntityIdentifier = string;
export type VisualEntities = Record<VisualEntityIdentifier, VisualEntity>;
export type VisualEntitiesAllType = Record<VisualEntityIdentifier, VisualEntity | ModelVisualInformation>;
