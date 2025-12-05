import { SemanticModelRelationshipProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { getDomainAndRange } from "./relationship-utils";
import { representCardinality, representUndefinedCardinality } from "../dialog/utilities/dialog-utilities";
import { getLocalizedStringFromLanguageString } from "./language-utils";
import { getFallbackDisplayName, getNameLanguageString } from "./name-utils";
import { Entity } from "@dataspecer/core-v2";
import { VisualEntity, VisualModel } from "@dataspecer/visual-model";
import { getVisualDiagramNodeMappingsByRepresented } from "@/action/utilities";

export const shortenStringTo = (modelId: string | null, length: number = 20) => {
  if (!modelId) {
    return modelId;
  }
  return modelId.length > length ? `...${modelId.substring(modelId.length - (length - 3))}` : modelId;
};

/**
 * @returns Returns the entity label which is used in diagram component as the entity label.
 */
export function getEntityLabelToShowInDiagram(
  language: string,
  entity: null | Entity,
) {
  return getLocalizedStringFromLanguageString(getNameLanguageString(entity), language)
    ?? getFallbackDisplayName(entity) ?? "";
}

/**
 * @returns Returns attribute's profile label WITHOUT enlisting the labels for the profileOf entities.
 */
export function createAttributeProfileLabel(
  language: string,
  attributeProfile: SemanticModelRelationshipProfile,
) {
  const { range } = getDomainAndRange(attributeProfile);
  const cardinality = representCardinality(range?.cardinality);
  const cardinalityLabel = representUndefinedCardinality().identifier === cardinality.identifier
    ? "" : " [" + cardinality.label + "]";
  const label = getEntityLabelToShowInDiagram(language, attributeProfile) + cardinalityLabel;
  return label;
}

export type VisualsForRepresentedWrapper = (identifier: string) => VisualEntity[];

/**
 * With the introduction of visual diagram nodes, we would like to also return
 * the visual diagram node as the represented entity - but only in some cases,
 * which is one of the reasons why it is not part of the VisualModel
 * (other reason is that it would complicate the model + we would need access to all other
 * existing VisualModels, which would destroy the fact that it should be separate concept).
 */
export function createGetVisualEntitiesForRepresentedGlobalWrapper(
  availableVisualModels: VisualModel[],
  visualModel: VisualModel
): VisualsForRepresentedWrapper {
  const { classToVisualDiagramNodeMappingRaw } =
    getVisualDiagramNodeMappingsByRepresented(availableVisualModels, visualModel);
  return (identifier: string) => {
    const directEntitiesInModel = visualModel.getVisualEntitiesForRepresented(identifier);
    const indirectEntitiesInModel = classToVisualDiagramNodeMappingRaw[identifier]
      ?.map(visualDiagramNode => visualModel.getVisualEntity(visualDiagramNode))
      ?.filter(visualDiagramNode => visualDiagramNode !== null) ?? [];
    return directEntitiesInModel.concat(indirectEntitiesInModel)
  }
}