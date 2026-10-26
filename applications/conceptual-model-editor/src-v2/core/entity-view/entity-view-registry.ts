import { EntityIdentifier } from "@dataspecer/core/entity-model";
import { CmeListener } from "../cme-provider";
import { createRegistry } from "../shared/registry";
import { ModelIdentifier } from "@dataspecer/core/model";

export const entityViewPreviewRegistry =
  createRegistry<EntityPreviewContribution>();

/**
 * Contribution of an entity preview in entity view.
 */
export interface EntityPreviewContribution extends CmeListener {

  id: string;

  canRenderPreview(entity: EntityIdentifier, model: ModelIdentifier): boolean;

  previewComponent: React.ElementType<{
    entity: EntityIdentifier, model: ModelIdentifier,
  }>;

}

export const entityViewDetailRegistry =
  createRegistry<EntityDetailContribution>();

/**
 * Contribution of an entity detail view in entity view.
 */
export interface EntityDetailContribution extends CmeListener {

  id: string;

  canRenderDetail(entity: EntityIdentifier, model: ModelIdentifier): boolean;

  detailComponent: React.ElementType<{
    entity: EntityIdentifier, model: ModelIdentifier,
  }>;

}
