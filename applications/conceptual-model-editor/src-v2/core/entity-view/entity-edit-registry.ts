import { EntityIdentifier } from "@dataspecer/core/entity-model";
import { CmeProviderEvent } from "../cme-provider";
import { createRegistry } from "../shared/registry";
import { ModelIdentifier } from "@dataspecer/core/model";

export const entityViewPreviewRegistry =
  createRegistry<EntityPreviewContribution>();

/**
 * An entity preview used when multiple entities are selected.
 * Each preview is rendered as an item in a list.
 */
export interface EntityPreviewContribution {

  id: string;

  onProviderEvent(event: CmeProviderEvent): void;

  canRenderPreview(entity: EntityIdentifier, model: ModelIdentifier): boolean;

  createPreviewComponent(entity: EntityIdentifier, model: ModelIdentifier): React.ElementType<{}>;

}

export const entityViewDetailRegistry =
  createRegistry<EntityDetailContribution>();

/**
 * An entity detail view.
 */
export interface EntityDetailContribution {

  id: string;

  onProviderEvent(event: CmeProviderEvent): void;

  canRenderDetail(entity: EntityIdentifier, model: ModelIdentifier): boolean;

}

export const entityViewEditRegistry =
  createRegistry<EntityEditContribution>();

/**
 * An entity edit view.
 */
export interface EntityEditContribution {

  id: string;

  onProviderEvent(event: CmeProviderEvent): void;

  canRenderEdit(entity: EntityIdentifier, model: ModelIdentifier): boolean;

}
