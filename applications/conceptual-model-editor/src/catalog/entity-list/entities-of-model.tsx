import { useEffect, useMemo, useState } from "react";

import type { Entity, EntityModel } from "@dataspecer/core-v2/entity-model";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { ExternalSemanticModel } from "@dataspecer/core-v2/semantic-model/simplified";
import {
  type SemanticModelClass,
  type SemanticModelRelationship,
  isSemanticModelAttribute,
  isSemanticModelClass,
  isSemanticModelGeneralization,
  isSemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";

import { useClassesContext } from "../../context/classes-context";
import { useModelGraphContext } from "../../context/model-context";
import { InputEntityRow } from "../components/input-row";
import { RowHierarchy } from "./row-hierarchy";
import { shortenStringTo } from "../../util/utils";
import { ActionsContextType, useActions } from "../../action/actions-react-binding";
import { ExpandModelButton } from "../components/expand-model";
import { type VisualEntity, VisualNode, isVisualNode, isVisualRelationship } from "@dataspecer/core-v2/visual-model";
import {
  isSemanticModelClassProfile,
  isSemanticModelRelationshipProfile,
  SemanticModelClassProfile,
  SemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { getDomainAndRange } from "../../util/relationship-utils";
import { getRemovedAndAdded } from "../../action/utilities";
import { isSemanticModelAttributeProfile } from "../../dataspecer/semantic-model";

export enum EntityType {
  Class = "class",
  Relationship = "relationship",
  Attribute = "attribute",
  Profile = "profile",
}

type EntityTypes = SemanticModelClass | SemanticModelRelationship |
  SemanticModelClassProfile | SemanticModelRelationshipProfile;

const DEFAULT_MODEL_COLOR = "#000069";

/**
 * @returns entities of given type.
 */
const getEntitiesByType = (entityType: EntityType, model: EntityModel): EntityTypes[] => {
  switch (entityType) {
  case EntityType.Class:
    return Object.values(model.getEntities())
      .filter(isSemanticModelClass);
  case EntityType.Relationship:
    return Object.values(model.getEntities())
      .filter(isSemanticModelRelationship)
      .filter((entity) => !isSemanticModelAttribute(entity));
  case EntityType.Attribute:
    return Object.values(model.getEntities())
      .filter(isSemanticModelAttribute);
  case EntityType.Profile:
    return Object.values(model.getEntities())
      .filter(isUsageOrProfile);
  }
};

const isUsageOrProfile = (
  what: Entity | null
): what is SemanticModelClassProfile | SemanticModelRelationshipProfile => {
  return isSemanticModelClassProfile(what) || isSemanticModelRelationshipProfile(what);
};

/**
 * Render list of entities of given type for given model.
 */
export const EntitiesOfModel = (props: {
  model: EntityModel;
  entityType: EntityType;
}) => {
  const { model, entityType } = props;
  //
  const actions = useActions();
  const { allowedClasses, setAllowedClasses } = useClassesContext();
  const { aggregatorView } = useModelGraphContext();
  const activeVisualModel = useMemo(() => aggregatorView.getActiveVisualModel(), [aggregatorView]);
  // We could utilize Set, but since the list of visible is probably small,
  // this should be fine as well.
  const [listCollapsed, setListCollapsed] = useState(false);
  const [visible, setVisible] = useState<string[]>([]);
  const [color, setColor] = useState(DEFAULT_MODEL_COLOR);

  const aggregatedEntities = aggregatorView.getEntities();
  const entities: EntityTypes[] = getEntitiesByType(entityType, model)
    .map(item => (aggregatedEntities[item.id]?.aggregatedEntity ?? item) as EntityTypes);

  /**
   * Initialize.
   */
  useEffect(() => {
    if (activeVisualModel === null) {
      // We need to wait to get the model.
      return;
    }
    // Load what we need from the visual model.
    const nextVisible: string[] = [];
    activeVisualModel.getVisualEntities().forEach(entity => {
      const represented = getRepresented(entity);
      if (represented !== null) {
        nextVisible.push(represented);
        if (isVisualNode(entity)) {
          entity.content.forEach(attribute => {
            nextVisible.push(attribute);
          });
        }
      }
    });

    setVisible(nextVisible);
    setColor(activeVisualModel.getModelColor(model.getId()) ?? DEFAULT_MODEL_COLOR);

    // Subscribe to changes, so we can keep the visible list up to date.
    const unsubscribe = activeVisualModel.subscribeToChanges({
      modelColorDidChange(identifier, next) {
        if (identifier === model.getId()) {
          setColor(next ?? DEFAULT_MODEL_COLOR);
        }
      },
      visualEntitiesDidChange(entities) {
        for (const { previous, next } of entities) {
          if (previous === null && next !== null) {
            // Create.
            const represented = getRepresented(next);
            if (represented !== null) {
              setVisible(prev => {
                const newVisible = [...prev, represented];
                if (isVisualNode(next)) {
                  newVisible.push(...next.content);
                }
                return newVisible;
              });
            }
          } else if (previous !== null && next === null) {
            // Delete
            setVisible(prev => {
              const represented = getRepresented(previous);
              if (represented === null) {
                return prev;
              }
              const index = prev.indexOf(represented);
              if (index === -1) {
                return prev;
              }

              let newVisible = [
                ...prev.slice(0, index),
                ...prev.slice(index + 1, prev.length),
              ];
              if (isVisualNode(previous)) {
                newVisible = newVisible.filter(visibleElement => !previous.content.includes(visibleElement));
              }
              return newVisible;
            });
          } else if (previous !== null && next !== null) {
            // Update
            if (isVisualNode(next)) {
              const { removed: removedAtrtibutes, added: addedAttributes } =
                getRemovedAndAdded((previous as VisualNode).content, next.content);
              setVisible(prev => {
                const newVisible = [...prev];
                for (const removedAttribute of removedAtrtibutes) {
                  const index = newVisible.indexOf(removedAttribute);
                  // We have to remove only the first occurrence,
                  // because of the fact that the attribute can be present on multiple nodes.
                  newVisible.splice(index, 1);
                }
                newVisible.push(...addedAttributes);
                return newVisible;
              });
            }
          }
        }
      },
    });

    return () => {
      setVisible([]);
      unsubscribe();
    };

  }, [activeVisualModel, model]);

  /**
     * Add surrounding of an entity to the entity model.
     * This functionality is available only for ExternalSemanticModel.
     */
  const handleExpansion = async (model: EntityModel, identifier: string) => {
    if (!(model instanceof ExternalSemanticModel)) {
      return;
    }
    if (allowedClasses.includes(identifier)) {
      setAllowedClasses(allowedClasses.filter((allowed) => allowed !== identifier));
      await model.releaseClassSurroundings(identifier);
    } else {
      setAllowedClasses([...allowedClasses, identifier]);
      await model.allowClassSurroundings(identifier);
    }
  };

  const handleAddToView = (model: EntityModel, entity: Entity) => {
    if (isSemanticModelClass(entity)) {
      actions.addClassToVisualModel(model.getId(), entity.id, null);
    } else if (isSemanticModelAttribute(entity)) {
      const domain = getDomainAndRange(entity).domain?.concept;
      actions.addAttributeToVisualModel(entity.id, domain ?? null);
    } else if (isSemanticModelAttributeProfile(entity)) {
      const domain = getDomainAndRange(entity).domain?.concept;
      actions.addAttributeToVisualModel(entity.id, domain ?? null);
    } else if (isSemanticModelRelationship(entity)) {
      actions.addRelationToVisualModel(model.getId(), entity.id);
    } else if (isSemanticModelGeneralization(entity)) {
      actions.addGeneralizationToVisualModel(model.getId(), entity.id);
    }
  };

  const handleDeleteFromView = (entity: Entity) => {
    if (isSemanticModelAttribute(entity) || isSemanticModelAttributeProfile(entity)) {
      actions.removeAttributesFromVisualModel([entity.id]);
    }
    else {
      actions.removeFromVisualModelByRepresented([entity.id]);
    }
  };

  const handleDeleteEntity = async (model: InMemorySemanticModel | ExternalSemanticModel, identifier: string) => {
    await actions.deleteFromSemanticModels([{ identifier, sourceModel: model.getId() }]);
  };

  const handleSetViewportToEntity = (identifier: string, entityNumberToBeCentered: number) => {
    actions.centerViewportToVisualEntityByRepresented(model.getId(), identifier, entityNumberToBeCentered);
  };

  // Rendering section.
  const displayName = model.getAlias() ?? shortenStringTo(model.getId());
  return (
    <li style={{ backgroundColor: color }}>
      <div className="flex flex-row justify-between">
        <h4>
          Ⓜ {displayName}
        </h4>
        <div className="flex flex-row">
          {renderAddButton(actions, entityType, model)}
          <ExpandModelButton isOpen={listCollapsed} onClick={() => setListCollapsed(!listCollapsed)} />
        </div>
      </div>
      {listCollapsed ? null : (
        <ul id={`infinite-scroll-${model.getId()}`} className="ml-1">
          {entities.map((entity: EntityTypes) => (
            <RowHierarchy
              key={entity.id}
              entity={entity}
              indent={0}
              handlers={{
                handleAddEntityToActiveView: handleAddToView,
                handleRemoveEntityFromActiveView: handleDeleteFromView,
                handleExpansion,
                handleRemoval: handleDeleteEntity,
                handleTargeting: handleSetViewportToEntity,
              }}
              onCanvas={visible}
            />
          ))}
          {renderExternalSemanticModelSearch(entityType, model)}
        </ul>
      )}
    </li>
  );
};

function getRepresented(entity: VisualEntity): string | null {
  if (isVisualNode(entity)) {
    return entity.representedEntity;
  } else if (isVisualRelationship(entity)) {
    return entity.representedRelationship;
  } else {
    return null;
  }
}

/**
 * Render input to add a class.
 * This is search box for ExternalSemanticModel and a "add" button for InMemorySemanticModel.
 */
function renderExternalSemanticModelSearch(type: EntityType, model: EntityModel) {
  if (type !== EntityType.Class) {
    return null;
  }
  if (model instanceof ExternalSemanticModel) {
    const onClick = (search: string) => {
      model.search(search).then(async found => {
        for (const item of found) {
          // We need to use IRI as ExternalSemanticModel,
          // or sgov in time of writing, does not support identifier.
          if (item.iri === null) {
            continue;
          }
          await model.allowClass(item.iri);
        }
      }).catch(console.error);
    };
    return <InputEntityRow onClickHandler={onClick} />;
  }
  return null;
}

function renderAddButton(actions: ActionsContextType, type: EntityType, model: EntityModel) {
  if (!(model instanceof InMemorySemanticModel) || type === EntityType.Profile) {
    return null;
  }

  const onAdd = () => {
    switch (type) {
    case EntityType.Class:
      actions.openCreateClassDialog(model.getId());
      break;
    case EntityType.Attribute:
      actions.openCreateAttributeDialogForModel(model.getId());
      break;
    case EntityType.Relationship:
      actions.openCreateAssociationDialog(model.getId());
      break;
    }
  };

  return (
    <div className="flex flex-row justify-between whitespace-nowrap pb-1 pt-0.5">
      &nbsp;
      <button className="ml-2 px-1" onClick={onAdd}>➕</button>
    </div>
  )
}
