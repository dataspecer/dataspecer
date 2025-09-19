import { isVisualNode, VisualModel } from "@dataspecer/visual-model";
import { CmeReference } from "../../../dataspecer/cme-model/model";
import { configuration, createLogger } from "../../../application";
import { InvalidState } from "../../../application/error";
import { ModelGraphContextType } from "../../../context/model-context";
import {
  createUiModelState,
  UiRelationship,
  UiRelationshipProfile,
  wrapUiModelStateToUiModelApi
} from "../../../dataspecer/ui-model";

const LOG = createLogger(import.meta.url);

export interface EditVisualNodeDialogState {

  /**
   * Primary data language for the dialog.
   */
  language: string;

  /**
   * Identifier of the represented entity.
   */
  representedEntity: CmeReference;

  /**
   * Active and visible content.
   */
  activeContent: ContentItem[];

  /**
   * Items that can be part of the node content.
   */
  inactiveContent: ContentItem[];

}

export type ContentItem = UiRelationship | UiRelationshipProfile;

/**
 * @throws InvalidState
 */
export function createEditVisualNodeState(
  graphContext: ModelGraphContextType,
  visualModel: VisualModel,
  visualEntityIdentifier: string,
  language: string,
): EditVisualNodeDialogState {

  const visualNode = visualModel.getVisualEntity(visualEntityIdentifier);
  if (visualNode === null || !isVisualNode(visualNode)) {
    LOG.error("Invalid visual entity.",
      { identifier: visualEntityIdentifier, visualEntity: visualNode });
    throw new InvalidState();
  }

  const representedEntity: CmeReference = {
    identifier: visualNode.representedEntity,
    model: visualNode.model,
  };

  const uiModelState = createUiModelState(
    graphContext.aggregatorView,
    [...graphContext.models.values()],
    language,
    configuration().languagePreferences,
    visualModel,
    configuration().defaultModelColor);

  const uiModelApi = wrapUiModelStateToUiModelApi(uiModelState);
  const entity = uiModelApi.getEntity(representedEntity);
  if (entity === null) {
    LOG.error("Can not find represented entity.", { entity: representedEntity });
    throw new InvalidState();
  }

  const contentMap: Record<string, ContentItem> = {};
  const inactiveContent: ContentItem[] = []

  // Relationships
  uiModelState.relationships
    .filter(item => item.domain === entity)
    .forEach(item => {
      if (visualNode.content.includes(item.identifier)) {
        contentMap[item.identifier] = item;
      } else {
        inactiveContent.push(item);
      }
    });

  // Relationships profile
  uiModelState.relationshipProfiles
    .filter(item => item.domain === entity)
    .forEach(item => {
      if (visualNode.content.includes(item.identifier)) {
        contentMap[item.identifier] = item;
      } else {
        inactiveContent.push(item);
      }
    });

  const activeContent = visualNode.content
    .map(identifier => contentMap[identifier])
    .filter(item => item !== undefined);

  return {
    language,
    representedEntity,
    inactiveContent,
    activeContent,
  };
}
