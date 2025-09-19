import {
  type SemanticModelClass,
  type SemanticModelRelationship,
  isSemanticModelAttribute,
  isSemanticModelClass,
  isSemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { ExternalSemanticModel } from "@dataspecer/core-v2/semantic-model/simplified";
import { type Entity, type EntityModel } from "@dataspecer/core-v2/entity-model";

import { EntityRow } from "./entity-row";
import { sourceModelOfEntity } from "../../util/model-utils";
import { useModelGraphContext } from "../../context/model-context";
import { useClassesContext } from "../../context/classes-context";
import { getDomainAndRange } from "../../util/relationship-utils";
import { findSourceModelOfEntity } from "../../service/model-service";
import {
  isSemanticModelClassProfile,
  isSemanticModelRelationshipProfile,
  SemanticModelClassProfile,
  SemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { isSemanticModelAttributeProfile } from "../../dataspecer/semantic-model";
import { VisualModel } from "@dataspecer/visual-model";

export const RowHierarchy = (props: {
  entity: SemanticModelClass | SemanticModelRelationship
  | SemanticModelClassProfile | SemanticModelRelationshipProfile;
  handlers: {
    handleAddEntityToActiveView: (model: EntityModel, entity: Entity) => void;
    handleRemoveEntityFromActiveView: (entity: Entity) => void;
    handleExpansion: (model: EntityModel, classId: string) => Promise<void>;
    handleRemoval: (model: InMemorySemanticModel | ExternalSemanticModel, entityId: string) => Promise<void>;
    handleTargeting: (entityId: string, entityNumberToBeCentered: number) => void;
  };
  indent: number;
  /**
   * List of entities represented on canvas.
   */
  onCanvas: string[];
}) => {
  const { models, aggregatorView } = useModelGraphContext();
  const { classProfiles, relationshipProfiles, classes, allowedClasses } = useClassesContext();
  const { entity } = props;

  // We need this to get access to ends of the profile.
  const aggregatedEntity = aggregatorView.getEntities()[props.entity.id]?.aggregatedEntity ?? null;

  const sourceModel = sourceModelOfEntity(entity.id, [...models.values()]);

  const isClassOrProfile = isSemanticModelClass(aggregatedEntity) || isSemanticModelClassProfile(aggregatedEntity);

  const isRelationshipOrProfile = isSemanticModelRelationship(aggregatedEntity)
    || isSemanticModelRelationshipProfile(aggregatedEntity);

  const isAttributeOrAttributeProfile = isSemanticModelAttribute(aggregatedEntity) ||
    isSemanticModelAttributeProfile(aggregatedEntity);

  const expansionHandler =
    isSemanticModelClass(entity) && sourceModel instanceof ExternalSemanticModel
      ? {
        toggleHandler: () => props.handlers.handleExpansion(sourceModel, entity.id),
        expanded: () => allowedClasses.includes(entity.id),
      }
      : null;

  const showDrawingHandler = isClassOrProfile ||
    (isAttributeOrAttributeProfile &&
      isAttributeDomainInVisualModel(aggregatorView.getActiveVisualModel(), aggregatedEntity)) ||
    (isRelationshipOrProfile && hasBothEndsInVisualModel(aggregatedEntity, aggregatorView.getActiveVisualModel()));

  const drawingHandler = !showDrawingHandler || sourceModel === undefined ? null : {
    addToViewHandler: () => props.handlers.handleAddEntityToActiveView(sourceModel, entity),
    removeFromViewHandler: () => props.handlers.handleRemoveEntityFromActiveView(entity),
  };

  const removalHandler =
    sourceModel instanceof InMemorySemanticModel || sourceModel instanceof ExternalSemanticModel
      ? { remove: () => props.handlers.handleRemoval(sourceModel, entity.id) }
      : null;

  const thisEntityProfiles = [
    ...classProfiles.filter(item => item.profiling.includes(entity.id)),
    ...relationshipProfiles.filter(item => item.ends.find(end => end.profiling.includes(entity.id)) !== undefined),
  ];

  const targetHandler = {
    centerViewportOnEntityHandler: (entityNumberToBeCentered: number) =>
      props.handlers.handleTargeting(entity.id, entityNumberToBeCentered),
    isTargetable: props.onCanvas.includes(entity.id) ||
      isSemanticModelAttribute(entity) ||
      isSemanticModelAttributeProfile(entity),
  };

  const model = findSourceModelOfEntity(entity.id, models);
  if (model === null) {
    console.error("Entity was not rendered as model is null.", { entity });
    return null;
  }

  return (
    <div
      className="flex flex-col"
      style={
        props.indent > 0 && sourceModel
          ? { backgroundColor: aggregatorView.getActiveVisualModel()?.getModelColor(sourceModel?.getId()) ?? "white" }
          : {}
      }
    >
      <EntityRow
        offset={props.indent}
        model={model.getId()}
        entity={entity}
        key={
          entity.id +
          (aggregatorView.getActiveVisualModel()?.getId() ?? "mId") +
          classes.length.toString()
        }
        expandable={expansionHandler}
        drawable={drawingHandler}
        removable={removalHandler}
        targetable={targetHandler}
        sourceModel={sourceModel}
        isOnCanvas={props.onCanvas.includes(entity.id)}
      />
      {thisEntityProfiles.map((p) => (
        <RowHierarchy
          key={p.id + entity.id + (aggregatorView.getActiveViewId() ?? "view-id")}
          entity={p}
          indent={props.indent + 1}
          handlers={props.handlers}
          onCanvas={props.onCanvas}
        />
      ))}
    </div>
  );
};

function isAttributeDomainInVisualModel(
  visualModel: VisualModel | null,
  attribute: SemanticModelRelationship | SemanticModelRelationshipProfile,
): boolean {
  if (visualModel === null) {
    return false;
  }

  let domainConcept = "";
  if (isSemanticModelRelationship(attribute)) {
    const { domain } = getDomainAndRange(attribute);
    domainConcept = domain?.concept ?? "";
  } else {
    const { domain } = getDomainAndRange(attribute);
    domainConcept = domain?.concept ?? "";
  }

  const isDomainOnCanvas = visualModel.hasVisualEntityForRepresented(domainConcept);
  return isDomainOnCanvas;
}

/**
 * Return true, when both ends of a relationship are on the canvas.
 */
const hasBothEndsInVisualModel = (
  entity: SemanticModelRelationship | SemanticModelRelationshipProfile,
  visualModel: VisualModel | null,
) => {
  if (visualModel === null) {
    return false;
  }
  if (visualModel.hasVisualEntityForRepresented(entity.id)) {
    // We do separate if so we can exit early if it is on canvas.
    // Also solves connection to visual diagram node.
    // Note that if we wanted to return true in cases when
    // the end is present in visual diagram node,
    // but the relationship itself is not present on canvas.
    // We would have to use the getRepresentedGlobalWrapper method.
    return true;
  }

  let domainConcept = "";
  let rangeConcept = "";
  if (isSemanticModelRelationship(entity)) {
    const domainAndRange = getDomainAndRange(entity);
    domainConcept = domainAndRange.domain?.concept ?? "";
    rangeConcept = domainAndRange.range?.concept ?? "";
  } else {
    const domainAndRange = getDomainAndRange(entity);
    domainConcept = domainAndRange.domain?.concept ?? "";
    rangeConcept = domainAndRange.range?.concept ?? "";
  }

  const isDomainOnCanvas = visualModel.hasVisualEntityForRepresented(domainConcept);
  const isRangeOnCanvas = visualModel.hasVisualEntityForRepresented(rangeConcept);
  return isDomainOnCanvas && isRangeOnCanvas;
};
