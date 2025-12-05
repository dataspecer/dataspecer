import { VisualModelData, VisualEntity } from "@dataspecer/visual-model";

// Newly the actual mapping in cme-v2 is using the id of visual entity as key
type VisualEntityIdentifier = string;
export type LayoutedVisualEntity = {
    visualEntity: VisualEntity,
    isOutsider: boolean,
};
export type LayoutedVisualEntities = Record<VisualEntityIdentifier, LayoutedVisualEntity>;
export type VisualEntities = Record<VisualEntityIdentifier, VisualEntity>;
export type VisualEntitiesWithModelVisualInformation = Record<VisualEntityIdentifier, VisualEntity | VisualModelData>;
