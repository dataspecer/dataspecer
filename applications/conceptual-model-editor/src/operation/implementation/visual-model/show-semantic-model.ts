import { isVisualNode } from "@dataspecer/visual-model";
import { XY } from "@dataspecer/layout";
import {
  isSemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";

import { ModelDsIdentifier } from "../../../dataspecer/entity-model";
import { getDomainAndRangeConcepts } from "../../../util/relationship-utils";
import {
  CmeExecutionContext,
  CmeOperationArguments,
  CmeOperationResult,
  MissingModel,
} from "../../operation";
import { cmeOperationExecutorRegistry } from "../../operation-registry";
import {
  findWritableVisualModel,
  getAllEntities,
  getAttributesForDomain,
  getEntityModels,
  NodeDimensions,
} from "./visual-model-utilities";
import { isClassOrClassProfile } from "./visual-model-additions";
import { EntityToShow, showEntities } from "./show-entities";

export function showSemanticModelOperation(
  args: Omit<ShowSemanticModelArguments, "type">,
): ShowSemanticModelArguments {
  return {
    type: ShowSemanticModelType,
    ...args,
  };
}

const ShowSemanticModelType =
  "show-semantic-model-operation";

interface ShowSemanticModelArguments extends CmeOperationArguments {

  type: typeof ShowSemanticModelType;

  visualModel: ModelDsIdentifier;

  /**
   * Model to show the entities of.
   */
  semanticModel: ModelDsIdentifier;

  /**
   * Used for a node with no visible neighbors, usually the viewport center.
   */
  fallbackPosition: XY;

  nodeDimensions?: NodeDimensions;

}

type ShowSemanticModelResult =
  CmeOperationResult<ShowSemanticModelArguments>;

cmeOperationExecutorRegistry.register(
  ShowSemanticModelType,
  { execute: showSemanticModelExecutor });

/**
 * Relationships are shown when classes are added, relationship profiles
 * are added explicitly.
 * Classes already in the visual model get all their attributes.
 *
 * @throws CmeOperationExecutionFailed
 */
export async function showSemanticModelExecutor(
  context: CmeExecutionContext,
  args: ShowSemanticModelArguments,
): Promise<ShowSemanticModelResult> {
  const visualModel = findWritableVisualModel(context, args.visualModel);
  const model = getEntityModels(context)
    .find(item => item.getId() === args.semanticModel);
  if (model === undefined) {
    throw new MissingModel();
  }
  const modelEntities = Object.values(model.getEntities());

  // Classes and class profiles.
  const classes = modelEntities
    .filter(isClassOrClassProfile)
    .map(item => item.id);
  const classesInVisualModel = classes
    .filter(item => visualModel.hasVisualEntityForRepresented(item));

  // Relationship profiles with both ends present.
  const isPresent = (identifier: string | null) => identifier !== null
    && (classes.includes(identifier)
      || visualModel.hasVisualEntityForRepresented(identifier));
  const relationshipProfiles = modelEntities
    .filter(isSemanticModelRelationshipProfile)
    .filter(item => {
      const { domain, range } = getDomainAndRangeConcepts(item);
      return isPresent(domain) && isPresent(range);
    })
    .map(item => item.id);

  const entitiesToShow: EntityToShow[] = [...classes, ...relationshipProfiles]
    .filter(item => !visualModel.hasVisualEntityForRepresented(item))
    .map(identifier => ({ identifier, position: null }));

  await showEntities(
    context, visualModel, entitiesToShow,
    args.fallbackPosition, args.nodeDimensions);

  // Show hidden attributes of classes which were already visible.
  const allEntities = getAllEntities(context).map(item => item.entity);
  for (const identifier of classesInVisualModel) {
    const attributes = getAttributesForDomain(allEntities, identifier);
    const nodes = visualModel.getVisualEntitiesForRepresented(identifier)
      .filter(isVisualNode);
    for (const node of nodes) {
      const missing = attributes.filter(item => !node.content.includes(item));
      if (missing.length > 0) {
        visualModel.updateVisualEntity(node.id, {
          content: [...node.content, ...missing],
        });
      }
    }
  }

  return { args };
}
