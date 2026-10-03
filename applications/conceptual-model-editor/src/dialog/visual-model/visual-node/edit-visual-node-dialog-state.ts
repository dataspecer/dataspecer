import { isVisualNode, VisualModel } from "@dataspecer/visual-model";
import { CmeReference, CmeRelationshipProfileMandatoryLevel } from "../../../dataspecer/cme-model/model";
import { createLogger } from "../../../application";
import { InvalidState } from "../../../application/error";
import { ModelGraphContextType } from "../../../context/model-context";
import { EntityDsIdentifier } from "../../../dataspecer/entity-model";
import { isSemanticModelRelationship } from "@dataspecer/semantic-model";
import { getDomainAndRange } from "../../../util/relationship-utils";
import { isSemanticModelRelationshipProfile } from "@dataspecer/profile-model";
import { asMandatoryLevel } from "../../../dataspecer/cme-model/adapter/adapter-utilities";
import { languageStringToStringNext } from "../../../utilities/string";

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

export interface ContentItem {

  identifier: EntityDsIdentifier;

  label: string;

  mandatoryLevel: CmeRelationshipProfileMandatoryLevel | null;

};

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

  const entities = graphContext.getEntities();
  const entity = entities[visualNode.representedEntity] ?? null;
  if (entity === null) {
    LOG.error("Can not find represented entity.", { entity: representedEntity });
    throw new InvalidState();
  }

  const contentMap: Record<string, ContentItem> = {};
  const inactiveContent: ContentItem[] = []

  // Relationships
  Object.values(entities)
    .map(item => item.aggregatedEntity)
    .filter(item => isSemanticModelRelationship(item))
    .forEach(item => {
      const { domain, range } = getDomainAndRange(item);
      if (domain === null || domain.concept !== entity.id || range === null) {
        return;
      }
      const content: ContentItem = {
        identifier: item.id,
        label: languageStringToStringNext([language], range.name),
        mandatoryLevel: null,
      };
      console.log({item, content});
      if (visualNode.content.includes(item.id)) {
        contentMap[item.id] = content;
      } else {
        inactiveContent.push(content);
      }
    });

  // Relationships profile
  Object.values(entities)
    .map(item => item.aggregatedEntity)
    .filter(item => isSemanticModelRelationshipProfile(item))
    .forEach(item => {
      const { domain, range } = getDomainAndRange(item);
      if (domain === null || domain.concept !== entity.id || range === null) {
        return;
      }
      const content: ContentItem = {
        identifier: item.id,
        label: languageStringToStringNext([language], range.name),
        mandatoryLevel: asMandatoryLevel(range.tags),
      };
      console.log(domain, range, content);
      if (visualNode.content.includes(item.id)) {
        contentMap[item.id] = content;
      } else {
        inactiveContent.push(content);
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
