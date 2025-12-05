import { ClassesContextType } from "../context/classes-context";
import { ModelGraphContextType } from "../context/model-context";
import { sourceModelOfEntity } from "../util/model-utils";
import { Entity, EntityModel } from "@dataspecer/core-v2";
import {
  SemanticModelClass,
  SemanticModelGeneralization,
  SemanticModelRelationship,
  isSemanticModelClass,
  isSemanticModelRelationship
} from "@dataspecer/core-v2/semantic-model/concepts";
import {
  VisualEntity,
  VisualModel,
  isVisualNode,
  isVisualProfileRelationship,
  isVisualRelationship
} from "@dataspecer/visual-model";
import { Selections } from "./filter-selection-action";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import {
  isSemanticModelClassProfile,
  isSemanticModelRelationshipProfile,
  SemanticModelClassProfile,
  SemanticModelRelationshipProfile
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { createLogger } from "../application";

const LOG = createLogger(import.meta.url);

export type ClassesContextEntities = {
    classes: SemanticModelClass[],
    relationships: SemanticModelRelationship[],
    generalizations: SemanticModelGeneralization[],
    classProfiles: SemanticModelClassProfile[],
    relationshipProfiles: SemanticModelRelationshipProfile[],
    rawEntities: (Entity | null)[],
};

/**
 * Type representing all the possible extensions of the selection.
 */
export enum ExtensionType {
    Association,
    AssociationSource,
    AssociationTarget,

    Generalization,
    GeneralizationParent,
    GeneralizationChild,

    ProfileEdge,
    ProfileEdgeSource,
    ProfileEdgeTarget,

    ClassProfile,
    ClassProfileParent,
    ClassProfileChild,
};

/**
 * Type representing additional visibility filter on the result.
 * The visibility filter is almost always applied to both nodes and edges.
 * Only in the OnlyVisibleNodes option, the visibility of edges is ignored -
 * This option is used fror example when we want to find edge of to be added node
 */
export enum VisibilityFilter {
    OnlyVisible,
    OnlyNonVisible,
    All,
    OnlyVisibleNodes
};

type SelectionExtension = {
    selectionExtension: Selections,
    /**
     * By which edges was the node added to the extension.
     * So identifier of the node is the key and identifiers of the corresponding edges are in the value.
     */
    nodesToEdgesMapping: Record<string, string[]>,
}

/**
 * @param usingSemanticIdentifiers If set to true,
 *  we also check all classes and class profiles in {@link contextEntities}
 *  (if the {@link contextEntities} are null then the check is skipped),
 *   if the semantic entity represented by {@link classId} is part of it.
 *  (if set to false, then we don't check because we expect that since we know the visual entity,
 *   we already checked that the semantic exists).
 *  We do that to filter out things like owl:Thing which are not part of the model.
 */
const addToSelectionExtension = (
  selectionExtensionToExtend: SelectionExtension,
  classId: string,
  edgeWhichAddedClass: EdgeWhichAddedClass,
  usingSemanticIdentifiers: boolean,
  contextEntities: ClassesContextEntities | null
) => {
  const nodeSelection = selectionExtensionToExtend.selectionExtension.nodeSelection;
  if(usingSemanticIdentifiers && contextEntities !== null) {
    const existsInEntities = isClassOrClassProfile(classId, contextEntities);
    if(!existsInEntities) {
      return;
    }
  }
  if(!nodeSelection.includes(classId)) {
    nodeSelection.push(classId);
  }
  if(isEdgeWhichAddedClassNotClassProfileEdge(edgeWhichAddedClass)) {
    selectionExtensionToExtend.selectionExtension.edgeSelection.push(edgeWhichAddedClass);
    if(selectionExtensionToExtend.nodesToEdgesMapping[classId] === undefined) {
      selectionExtensionToExtend.nodesToEdgesMapping[classId] = [];
    }
    selectionExtensionToExtend.nodesToEdgesMapping[classId].push(edgeWhichAddedClass);
  }
}

const createEmptySelectionExtension = (): SelectionExtension => {
  return {
    selectionExtension: {
      nodeSelection: [],
      edgeSelection: [],
    },
    nodesToEdgesMapping: {},
  };
}

export type NodeSelection = {
    identifiers: string[],
    areIdentifiersFromVisualModel: boolean,
};

/**
 * Implementation note: Even when we get visual ids on input, we are working with the semantic ones,
 * We get the correct form of id right at the end of the process, which is in the
 * {@link addToExtensionIfSatisfiesVisibilityFilter} method.
 * @param semanticModelFilter Null if all models should be considered, otherwise record with modelID as key and
 * true as value if the model should be considered, false if it shouldn't be.
 * Models which are not part of the semanticModelFilter, are by default not considered.
 * @param shouldExtendByNodeDuplicates When you don't know, just ignore this parameter, it is by default set to true.
 * If set to true then the node extension is extended by node duplicates (both before extension and after).
 * Logically this parameter is used only when the given nodeIdentifiers are visual.
 * @returns The result after performing the extension corresponding to given arguments.
 * The result contains only the extension!
 * The removal of duplicities and concat with the selection given on input is on the caller of the method.
 * The returned identifiers are either semantic of visual. Identifiers of visual entities are returned,
 * when the property areIdentifiersFromVisualModel on {@link nodeSelection} equals true
 * AND the visibility filter is set to "ONLY-VISIBLE" (it doesn't make sense otherwise,
 * because in such case we are referencing entities which are not part of the visual model)
 */
export const extendSelectionAction = (
  notifications: UseNotificationServiceWriterType,
  graph: ModelGraphContextType,
  classesContext: ClassesContextType | null,
  nodeSelection: NodeSelection,
  extensionTypes: ExtensionType[],
  visibilityFilter: VisibilityFilter,
  semanticModelFilter: Record<string, boolean> | null,
  shouldExtendByNodeDuplicates: boolean = true
): SelectionExtension => {
  if(classesContext === null) {
    notifications.error("Classes context is null");
    return createEmptySelectionExtension();
  }

  const entities: ClassesContextEntities = JSON.parse(JSON.stringify(classesContext));
  const visualModel = graph.aggregatorView.getActiveVisualModel();

  if(visualModel === null && nodeSelection.areIdentifiersFromVisualModel) {
    notifications.error("The identifiers are from visual model, but the visual model is null");
    return createEmptySelectionExtension();
  }

  const selectionExtension: SelectionExtension = createEmptySelectionExtension();

  const shouldPerformExtensionByNodeDuplicates = shouldExtendByNodeDuplicates &&
                                                 nodeSelection.areIdentifiersFromVisualModel;
  let nodeSelectionToExtend = nodeSelection;
  let newlyAddedNodes: string[] = [];
  if(shouldPerformExtensionByNodeDuplicates) {
    const selectionWithDuplicates = getNewNodeSelectionExtendedByNodeDuplicates(visualModel!, nodeSelection);
    nodeSelectionToExtend = selectionWithDuplicates.extendedNodeSelection;
    newlyAddedNodes = selectionWithDuplicates.newlyAddedNodes;
  }

  for(const extensionType of extensionTypes) {
    switch(extensionType) {
    case ExtensionType.Association:
      extendThroughAssociationSources(
        nodeSelectionToExtend, visibilityFilter, selectionExtension, entities, visualModel);
      extendThroughAssociationTargets(
        nodeSelectionToExtend, visibilityFilter, selectionExtension, entities, visualModel);
      break;
    case ExtensionType.AssociationTarget:
      extendThroughAssociationTargets(
        nodeSelectionToExtend, visibilityFilter, selectionExtension, entities, visualModel);
      break;
    case ExtensionType.AssociationSource:
      extendThroughAssociationSources(
        nodeSelectionToExtend, visibilityFilter, selectionExtension, entities, visualModel);
      break;
    case ExtensionType.ProfileEdge:
      extendThroughProfileEdgeSources(
        nodeSelectionToExtend, visibilityFilter, selectionExtension, entities, visualModel);
      extendThroughProfileEdgeTargets(
        nodeSelectionToExtend, visibilityFilter, selectionExtension, entities, visualModel);
      break;
    case ExtensionType.ProfileEdgeSource:
      extendThroughProfileEdgeSources(
        nodeSelectionToExtend, visibilityFilter, selectionExtension, entities, visualModel);
      break;
    case ExtensionType.ProfileEdgeTarget:
      extendThroughProfileEdgeTargets(
        nodeSelectionToExtend, visibilityFilter, selectionExtension, entities, visualModel);
      break;
    case ExtensionType.Generalization:
      extendThroughGeneralizationParents(
        nodeSelectionToExtend, visibilityFilter, selectionExtension, entities, visualModel);
      extendThroughGeneralizationChildren(
        nodeSelectionToExtend, visibilityFilter, selectionExtension, entities, visualModel);
      break;
    case ExtensionType.GeneralizationChild:
      extendThroughGeneralizationChildren(
        nodeSelectionToExtend, visibilityFilter, selectionExtension, entities, visualModel);
      break;
    case ExtensionType.GeneralizationParent:
      extendThroughGeneralizationParents(
        nodeSelectionToExtend, visibilityFilter, selectionExtension, entities, visualModel);
      break;
    case ExtensionType.ClassProfile:
      extendThroughClassProfileParents(
        nodeSelectionToExtend, visibilityFilter, selectionExtension, entities, visualModel);
      extendThroughClassProfileChildren(
        nodeSelectionToExtend, visibilityFilter, selectionExtension, entities, visualModel);
      break;
    case ExtensionType.ClassProfileParent:
      extendThroughClassProfileParents(
        nodeSelectionToExtend, visibilityFilter, selectionExtension, entities, visualModel);
      break;
    case ExtensionType.ClassProfileChild:
      extendThroughClassProfileChildren(
        nodeSelectionToExtend, visibilityFilter, selectionExtension, entities, visualModel);
      break;
    }
  }

  if(shouldPerformExtensionByNodeDuplicates) {
    extendExtensionByNodeDuplicates(visualModel!, selectionExtension, newlyAddedNodes);
  }

  if(semanticModelFilter === null) {
    return selectionExtension;
  }
  return filterExtensionUsingSemanticModelFilters(selectionExtension, semanticModelFilter, graph.models);
};

function getNewNodeSelectionExtendedByNodeDuplicates(
  visualModel: VisualModel,
  nodeSelection: NodeSelection,
) {
  const extendedNodeSelection = {
    ...nodeSelection
  };
  const newlyAddedNodes = [];
  const visualEntities = visualModel.getVisualEntities();
  const selectedNodesAsNodes = extendedNodeSelection.identifiers
    .map(id => visualModel!.getVisualEntity(id))
    .filter(node => node !== null);
  const selectedNodesAsClasses = selectedNodesAsNodes.filter(isVisualNode).map(node => node.representedEntity);
  for(const [_, visualEntity] of visualEntities) {
    if(isVisualNode(visualEntity)) {
      const isPresentInNodeSelection = selectedNodesAsClasses.includes(visualEntity.representedEntity);
      const isNewlyPresentInNodeSelection = !extendedNodeSelection.identifiers.includes(visualEntity.identifier);
      if(isPresentInNodeSelection && isNewlyPresentInNodeSelection) {
        extendedNodeSelection.identifiers.push(visualEntity.identifier);
        newlyAddedNodes.push(visualEntity.identifier);
      }
    }
  }
  return {
    extendedNodeSelection,
    newlyAddedNodes,
  };
}

function extendExtensionByNodeDuplicates(
  visualModel: VisualModel,
  selectionExtension: SelectionExtension,
  newlyAddedNodesAtStartOfExtension: string[],
) {
  selectionExtension.selectionExtension.nodeSelection.push(...newlyAddedNodesAtStartOfExtension);
  const visualEntities = visualModel.getVisualEntities();
  for(const [_, visualEntity] of visualEntities) {
    if(isVisualNode(visualEntity)) {
      if(!selectionExtension.selectionExtension.nodeSelection.includes(visualEntity.identifier)) {
        continue;
      }
      const representations = visualModel.getVisualEntitiesForRepresented(visualEntity.representedEntity);
      if(representations.length === 0) {
        LOG.error("While extending through node duplicates, " +
          "we noticed that visual node can't be found when it is looked up through represented entity");
        continue;
      }
      for(const node of representations) {
        if(!selectionExtension.selectionExtension.nodeSelection.includes(node.identifier)) {
          selectionExtension.selectionExtension.nodeSelection.push(node.identifier);
        }
      }
    }
  }
}

/**
 * @returns All the models which should be considered (the value in map is set to True)
 */
const getRelevantModelsForExtension = (
  semanticModelFilter: Record<string, boolean>,
  models: Map<string, EntityModel>
): EntityModel[] => {
  const relevantModels = Object.entries(semanticModelFilter).map(([modelId, isConsidered]) => {
    if(isConsidered) {
      return models.get(modelId);
    }
    else {
      return null;
    }
  }).filter(model => model !== null && model !== undefined);

  return relevantModels;
};

function filterExtensionUsingSemanticModelFilters(
  extension: SelectionExtension,
  semanticModelFilter: Record<string, boolean>,
  models: Map<string, EntityModel>
): SelectionExtension {
  const relevantModels = getRelevantModelsForExtension(semanticModelFilter, models);
  extension.selectionExtension.nodeSelection.map(extendedClassId => {
    if(sourceModelOfEntity(extendedClassId, relevantModels) === undefined) {
      for (const edgeIdentifier of extension.nodesToEdgesMapping[extendedClassId]) {
        const index = extension.selectionExtension.edgeSelection.findIndex(id => id === edgeIdentifier);
        extension.selectionExtension.edgeSelection.splice(index, 1);
      }
      delete extension.nodesToEdgesMapping[extendedClassId];
      return null;
    }
    else {
      return extendedClassId;
    }
  }).filter(id => id !== null);

  return extension;
}

//
//

/**
 * @returns Returns true if given {@link entityId} can be found in given {@link visualModel}. False otherwise.
 */
export function isEntityInVisualModel(
  visualModel: VisualModel,
  entityId: string,
  isEntityIdVisualId: boolean,
): boolean {
  let visualEntity: VisualEntity | null;
  if(isEntityIdVisualId) {
    visualEntity = visualModel.getVisualEntity(entityId);
  }
  else {
    visualEntity = visualModel.getVisualEntitiesForRepresented(entityId)[0] ?? null;
  }
  const isInVisualModel = visualEntity !== null;
  return isInVisualModel;
}

type SourceOrTarget = "SOURCE" | "TARGET";
type AssociationType = "CLASSIC" | "PROFILE-EDGE";

const getTheOtherEndForSTType = (end: SourceOrTarget): SourceOrTarget => {
  return end === "SOURCE" ? "TARGET" : "SOURCE";
};

const convertSTTypeToEndIndex = (end: SourceOrTarget): 0 | 1 => {
  if(end === "SOURCE") {
    return 0;
  }

  return 1;
};

enum SpecialEdge {
    FromClassProfileToProfiledClass,
    FromProfiledClassToClassProfile,
};

// At first we just used string | "FROM_CLASS_PROFILE_TO_PROFILED_CLASS" | "FROM_PROFILED_CLASS_TO_CLASS_PROFILE"
// but it was all string, so actually you could easily make mistake, since IDE wasn't autocompleting correctly
// On other side the enum also isn't perfect, we have to recase to string even we know what the given value is string.
type EdgeWhichAddedClass = string | SpecialEdge;

function isEdgeWhichAddedClassNotClassProfileEdge(
  edgeWhichAddedClass: EdgeWhichAddedClass
): edgeWhichAddedClass is string {
  return typeof edgeWhichAddedClass === "string";
}

/**
 * Adds {@link classIdToAdd} to {@link extension} if it passes the {@link visibilityFilter}.
 */
function addToExtensionIfSatisfiesVisibilityFilter(
  extension: SelectionExtension,
  visibilityFilter: VisibilityFilter,
  classIdToAdd: string,
  edgeWhichAddedClass: EdgeWhichAddedClass,
  visualModel: VisualModel | null,
  extendedNode: string,
  isExtendedNodeVisualId: boolean,
  contextEntities: ClassesContextEntities | null,
): void {
  if(handleTrivialVisibilityFilters(extension, visibilityFilter, classIdToAdd,
    edgeWhichAddedClass, visualModel, contextEntities)) {
    return;
  }
  visualModel = visualModel as VisualModel;   // We know this from the previous method call

  const isClassInVisualModel = isEntityInVisualModel(visualModel, classIdToAdd, false);
  const isProfileClassEdge = !isEdgeWhichAddedClassNotClassProfileEdge(edgeWhichAddedClass);
  let isSemanticEdgeInVisualModel = false;
  if(isProfileClassEdge) {
    if(visualModel === null || visibilityFilter !== VisibilityFilter.OnlyVisible || !isExtendedNodeVisualId) {
      isSemanticEdgeInVisualModel = true;
    }
    else {
      const visualEntities = visualModel.getVisualEntities();
      for(const [_visualEntityId, visualEntity] of visualEntities) {
        if(isVisualProfileRelationship(visualEntity)) {
          const visualSource = visualModel.getVisualEntity(visualEntity.visualSource);
          const visualTarget = visualModel.getVisualEntity(visualEntity.visualTarget);
          if(visualSource === null || !isVisualNode(visualSource) ||
              visualTarget === null || !isVisualNode(visualTarget)) {
            LOG.error("Relationship doesn't have visual end, returning. Something is wrong.")
            return;
          }
          const ends = edgeWhichAddedClass === SpecialEdge.FromClassProfileToProfiledClass ?
            [visualSource, visualTarget] :
            [visualTarget, visualSource];
          if(ends[0].identifier === extendedNode && ends[1].representedEntity === classIdToAdd) {
            isSemanticEdgeInVisualModel = true;
            edgeWhichAddedClass = visualEntity.identifier;
            break;
          }
        }
      }
    }
  }
  else {
    // We know that it is string
    isSemanticEdgeInVisualModel = isEntityInVisualModel(visualModel, edgeWhichAddedClass as string, false);
  }

  if((visibilityFilter === VisibilityFilter.OnlyVisible && isClassInVisualModel && isSemanticEdgeInVisualModel) ||
        (visibilityFilter === VisibilityFilter.OnlyVisibleNodes && isClassInVisualModel)) {
    if(isExtendedNodeVisualId && visibilityFilter === VisibilityFilter.OnlyVisible) {     // Then we want visual IDs
      const visualNodesForTheAddedClass = visualModel.getVisualEntitiesForRepresented(classIdToAdd);
      let edgesWhichAddedVisualNodes;
      if(isProfileClassEdge) {
        // We know that it is string, because we have explicitly set it above
        const edge = visualModel.getVisualEntity(edgeWhichAddedClass as string)
        edgesWhichAddedVisualNodes = edge === null ? [] : [edge];
      }
      else {
        // Must be string representing id
        edgesWhichAddedVisualNodes = visualModel.getVisualEntitiesForRepresented(edgeWhichAddedClass as string);
      }

      if(visualNodesForTheAddedClass.length === 0 || edgesWhichAddedVisualNodes.length === 0) {
        // Shouldn't happen
        console.warn("Entities which should be part of visual model are not");
        return;
      }
      for(const visualNodeToAddToSelection of visualNodesForTheAddedClass) {
        const edgesWhichAddedTheNode = edgesWhichAddedVisualNodes
          .filter(edge => hasEdgeEndInNode(visualNodeToAddToSelection.identifier, edge));
        for (const edgeWhichAddedTheNode of edgesWhichAddedTheNode) {
          addToSelectionExtension(
            extension, visualNodeToAddToSelection.identifier, edgeWhichAddedTheNode.identifier, false, null);
        }
      }
    }
    else {          // We want semantic IDs
      addToSelectionExtension(extension, classIdToAdd, edgeWhichAddedClass, true, contextEntities);
    }
  }
  else if(visibilityFilter === VisibilityFilter.OnlyNonVisible && !isClassInVisualModel) {
    // Not sure about the semantics of the filters for edges,
    // So we just check the visibility of the class
    addToSelectionExtension(extension, classIdToAdd, edgeWhichAddedClass, true, contextEntities);
  }
}

const hasEdgeEndInNode = (node: string, edge: VisualEntity) => {
  if(isVisualRelationship(edge) || isVisualProfileRelationship(edge)) {
    return edge.visualSource === node || edge.visualTarget === node;
  }
  return false;
}

/**
 * @returns Returns true if the trivial case was handled.
 *          That is visibility filter was either {@link VisibilityFilter.ALL} or
 *          when {@link visualModel} === null
 */
function handleTrivialVisibilityFilters(
  extension: SelectionExtension,
  visibilityFilter: VisibilityFilter,
  classIdToAdd: string,
  edgeWhichAddedClass: EdgeWhichAddedClass,
  visualModel: VisualModel | null,
  contextEntities: ClassesContextEntities | null,
): boolean {
  if(visibilityFilter === VisibilityFilter.All) {
    addToSelectionExtension(extension, classIdToAdd, edgeWhichAddedClass, true, contextEntities);
    return true;
  }

  if(visualModel === null) {
    if(visibilityFilter === VisibilityFilter.OnlyNonVisible) {
      addToSelectionExtension(extension, classIdToAdd, edgeWhichAddedClass, true, contextEntities);
    }
    return true;
  }

  return false;
}

function isClassOrClassProfile(
  classIdentifier: string,
  contextEntities: ClassesContextEntities
) {
  return !(contextEntities.classes.find(cclass => cclass.id === classIdentifier) === undefined &&
            contextEntities.classProfiles.find(profile => profile.id === classIdentifier) === undefined);
}

/**
 * The internal function used for the extension through associations (and profiled associations),
 * the type of association is decided through
 * {@link associationType} and the direction is decided through {@link directionOfExtension}.
 * The result of extension is put inside {@link outputToExtend}
 * (non-destructively - i.e. the parameter is extended by the result).
 */
function extendThroughAssociation(
  nodeSelection: NodeSelection,
  visibilityFilter: VisibilityFilter,
  directionOfExtension: SourceOrTarget,
  associationType: AssociationType,
  outputToExtend: SelectionExtension,
  contextEntities: ClassesContextEntities,
  visualModel: VisualModel | null
): void {
  const checkForAssociatedClassOrClassProfile = (
    classInSelection: string,
    endContainingClassInSelection: SourceOrTarget,
    relationship: SemanticModelRelationship | SemanticModelRelationshipProfile
  ) => {
    // Maybe possible issues with attributes?
    const endIndex = convertSTTypeToEndIndex(endContainingClassInSelection);
    const otherEndIndex = convertSTTypeToEndIndex(getTheOtherEndForSTType(endContainingClassInSelection));
    const otherEndId = relationship.ends[otherEndIndex]?.concept;

    if(relationship.ends[endIndex]?.concept === classInSelection && otherEndId !== null) {
      let classOnOtherEnd: SemanticModelClass | SemanticModelClassProfile | undefined = contextEntities.classes
        .find(cclass => cclass.id === otherEndId);
      if(classOnOtherEnd === undefined) {
        classOnOtherEnd = contextEntities.classProfiles.find(profile => profile.id === otherEndId);
      }
      return classOnOtherEnd;
    }
    else {
      return null;
    }
  };

  //
  //

  for(const selectedClassId of nodeSelection.identifiers) {
    const selectedClassSemanticId = getSemanticClassIdentifier(
      selectedClassId, nodeSelection.areIdentifiersFromVisualModel, visualModel);
    if(selectedClassSemanticId === null) {
      LOG.error("Can't find selected class in list of existing, skipping");
      continue;
    }

    if(!isClassOrClassProfile(selectedClassSemanticId, contextEntities)) {
      LOG.error("Selected class is neither class or class profile, returning");
      return;
    }

    let relationshipsToCheck: (SemanticModelRelationship | SemanticModelRelationshipProfile)[] = [];
    if(associationType === "PROFILE-EDGE") {
      relationshipsToCheck = [...contextEntities.relationshipProfiles];
    }
    else if(associationType === "CLASSIC") {
      relationshipsToCheck = [...contextEntities.relationships];
    }

    const extension: {
      classInExtension: SemanticModelClass | SemanticModelClassProfile,
      edgeAddingClass: string
    }[] = [];

    for(let i = 0; i < relationshipsToCheck.length; i++) {
      const extensionCandidate = checkForAssociatedClassOrClassProfile(
        selectedClassSemanticId, getTheOtherEndForSTType(directionOfExtension), relationshipsToCheck[i]);
      if(extensionCandidate !== null && extensionCandidate !== undefined) {
        extension.push({
          classInExtension: extensionCandidate,
          edgeAddingClass: relationshipsToCheck[i].id
        });
      }
    }

    extension.forEach(({ classInExtension, edgeAddingClass }) => {
      addToExtensionIfSatisfiesVisibilityFilter(outputToExtend, visibilityFilter, classInExtension.id, edgeAddingClass,
        visualModel, selectedClassId, nodeSelection.areIdentifiersFromVisualModel, contextEntities);
    });
  }
}

/**
 * Extends {@link outputToExtend} by all direct association sources, which also pass the {@link visibilityFilter}.
 * The result of extension is put inside {@link outputToExtend}
 * (non-destructively - i.e. the parameter is extended by the result).
 */
function extendThroughAssociationSources(
  nodeSelection: NodeSelection,
  visibilityFilter: VisibilityFilter,
  outputToExtend: SelectionExtension,
  contextEntities: ClassesContextEntities,
  visualModel: VisualModel | null
): void {
  extendThroughAssociation(nodeSelection, visibilityFilter, "SOURCE", "CLASSIC",
    outputToExtend, contextEntities, visualModel);
}

/**
 * Extends {@link outputToExtend} by all direct association targets, which also pass the {@link visibilityFilter}.
 * The result of extension is put inside {@link outputToExtend}
 * (non-destructively - i.e. the parameter is extended by the result).
 */
function extendThroughAssociationTargets(
  nodeSelection: NodeSelection,
  visibilityFilter: VisibilityFilter,
  outputToExtend: SelectionExtension,
  contextEntities: ClassesContextEntities,
  visualModel: VisualModel | null
): void {
  extendThroughAssociation(nodeSelection, visibilityFilter, "TARGET", "CLASSIC",
    outputToExtend, contextEntities, visualModel);
}

//
//

/**
 * Extends {@link outputToExtend} by all direct profiled edges sources, which also pass the {@link visibilityFilter}.
 * The result of extension is put inside {@link outputToExtend}
 * (non-destructively - i.e. the parameter is extended by the result).
 */
function extendThroughProfileEdgeSources(
  nodeSelection: NodeSelection,
  visibilityFilter: VisibilityFilter,
  outputToExtend: SelectionExtension,
  contextEntities: ClassesContextEntities,
  visualModel: VisualModel | null
): void {
  extendThroughAssociation(nodeSelection, visibilityFilter, "SOURCE", "PROFILE-EDGE",
    outputToExtend, contextEntities, visualModel);
}

/**
 * Extends {@link outputToExtend} by all direct profiled edges targets, which also pass the {@link visibilityFilter}.
 * The result of extension is put inside {@link outputToExtend}
 * (non-destructively - i.e. the parameter is extended by the result).
 */
function extendThroughProfileEdgeTargets(
  nodeSelection: NodeSelection,
  visibilityFilter: VisibilityFilter,
  outputToExtend: SelectionExtension,
  contextEntities: ClassesContextEntities,
  visualModel: VisualModel | null
): void {
  extendThroughAssociation(nodeSelection, visibilityFilter, "TARGET", "PROFILE-EDGE",
    outputToExtend, contextEntities, visualModel);
}

//
//

type ParentOrChild = "PARENT" | "CHILD";
type ParentOrChildGeneralizationProperty = "parent" | "child";
function getTheOtherEndForPCType(parentOrChild: ParentOrChild): ParentOrChild {
  return parentOrChild === "CHILD" ? "PARENT" : "CHILD";
}

/**
 * Helper function to convert between two internal types
 */
function convertParentChildToGeneralizationProperty(parentChild: ParentOrChild): ParentOrChildGeneralizationProperty {
  return parentChild.toLowerCase() as ParentOrChildGeneralizationProperty;
}

/**
 * The internal function used for the extension through generalization,
 * the direction of extension is decided through {@link directionOfExtension} parameter.
 * The result of extension is put inside {@link outputToExtend}
 * (non-destructively - i.e. the parameter is extended by the result).
 */
function extendThroughGeneralization(
  nodeSelection: NodeSelection,
  visibilityFilter: VisibilityFilter,
  directionOfExtension: ParentOrChild,
  outputToExtend: SelectionExtension,
  contextEntities: ClassesContextEntities,
  visualModel: VisualModel | null
): void {
  for(const selectedClassId of nodeSelection.identifiers) {
    const selectedClassSemanticId = getSemanticClassIdentifier(
      selectedClassId, nodeSelection.areIdentifiersFromVisualModel, visualModel);
    if(selectedClassSemanticId === null) {
      LOG.error("Can't find selected class in list of existing, skipping");
      continue;
    }

    if(!isClassOrClassProfile(selectedClassSemanticId, contextEntities)) {
      LOG.error("Selected class is neither class or class profile, returning");
      return;
    }

    const theEndOfGeneralizationWhereShouldBeTheSelectedClass = convertParentChildToGeneralizationProperty(
      getTheOtherEndForPCType(directionOfExtension));
    const theOtherEndOfGeneralization = convertParentChildToGeneralizationProperty(directionOfExtension);
    for(const generalization of contextEntities.generalizations) {
      if(generalization[theEndOfGeneralizationWhereShouldBeTheSelectedClass] === selectedClassSemanticId) {
        const otherEndId = generalization[theOtherEndOfGeneralization];
        addToExtensionIfSatisfiesVisibilityFilter(
          outputToExtend, visibilityFilter, otherEndId, generalization.id, visualModel,
          selectedClassId, nodeSelection.areIdentifiersFromVisualModel, contextEntities);
      }
    }
  }
}

/**
 * Extends {@link outputToExtend} by all direct parents in generalization hirearchy,
 * which also pass the {@link visibilityFilter}.
 * The result of extension is put inside {@link outputToExtend}
 * (non-destructively - i.e. the parameter is extended by the result).
 */
function extendThroughGeneralizationParents(
  nodeSelection: NodeSelection,
  visibilityFilter: VisibilityFilter,
  outputToExtend: SelectionExtension,
  contextEntities: ClassesContextEntities,
  visualModel: VisualModel | null
): void {
  extendThroughGeneralization(nodeSelection, visibilityFilter, "PARENT", outputToExtend, contextEntities, visualModel);
}

/**
 * Extends {@link outputToExtend} by all direct children in generalization hirearchy,
 * which also pass the {@link visibilityFilter}.
 * The result of extension is put inside {@link outputToExtend}
 * (non-destructively - i.e. the parameter is extended by the result).
 */
function extendThroughGeneralizationChildren(
  nodeSelection: NodeSelection,
  visibilityFilter: VisibilityFilter,
  outputToExtend: SelectionExtension,
  contextEntities: ClassesContextEntities,
  visualModel: VisualModel | null
): void {
  extendThroughGeneralization(nodeSelection, visibilityFilter, "CHILD", outputToExtend, contextEntities, visualModel);
}

////////////////////////////////////////
////////////////////////////////////////

export function getSemanticClassIdentifier(
  nodeIdentifier: string,
  isNodeIdentifierFromVisualModel: boolean,
  visualModel: VisualModel | null
): string | null {
  let semanticClassId = nodeIdentifier;
  if(isNodeIdentifierFromVisualModel) {
    const visualEntity = visualModel?.getVisualEntity(nodeIdentifier);
    if(visualEntity === null || visualEntity === undefined || !isVisualNode(visualEntity)) {
      return null;
    }

    semanticClassId = visualEntity.representedEntity;
  }

  return semanticClassId;
}

export function getSemanticEdgeIdentifier(
  edgeIdentifier: string,
  isEdgeIdentifierFromVisualModel: boolean,
  visualModel: VisualModel | null
): string | null | "CLASS-PROFILE-EDGE" {
  let semanticEdgeId = edgeIdentifier;
  if(isEdgeIdentifierFromVisualModel) {
    const visualEntity = visualModel?.getVisualEntity(edgeIdentifier);
    if(visualEntity === null || visualEntity === undefined) {
      console.warn("Entity is null");
      return null;
    }
    if(isVisualProfileRelationship(visualEntity)) {
      return "CLASS-PROFILE-EDGE";
    }
    if(!isVisualRelationship(visualEntity)) {
      console.warn("Entity is not visual relationship");
      console.warn(visualEntity);
      return null;
    }

    semanticEdgeId = visualEntity.representedRelationship;
  }

  return semanticEdgeId;
}

/**
 * The internal function used for the extension through profiles,
 * the direction of extension is decided through {@link directionOfExtension} parameter.
 * The result of extension is put inside {@link outputToExtend}
 * (non-destructively - i.e. the parameter is extended by the result).
 */
function extendThroughClassProfile(
  nodeSelection: NodeSelection,
  visibilityFilter: VisibilityFilter,
  directionOfExtension: ParentOrChild,
  outputToExtend: SelectionExtension,
  contextEntities: ClassesContextEntities,
  visualModel: VisualModel | null
) {
  for(const selectedClassId of nodeSelection.identifiers) {
    const selectedClassSemanticId = getSemanticClassIdentifier(
      selectedClassId, nodeSelection.areIdentifiersFromVisualModel, visualModel);
    if(selectedClassSemanticId === null) {
      LOG.error("Can't find selected class in list of existing, skipping");
      continue;
    }

    const selectedClass = contextEntities.classes.find(entity => entity?.id === selectedClassSemanticId) ??
                                contextEntities.classProfiles.find(entity => entity?.id === selectedClassSemanticId);
    if(selectedClass === undefined) {
      LOG.error("Selected class is neither class or class profile, returning");
      return;
    }

    if(directionOfExtension === "CHILD") {
      contextEntities.classProfiles.forEach(entity => {
        for(const profileSource of entity.profiling) {
          if(profileSource === selectedClassSemanticId) {
            addToExtensionIfSatisfiesVisibilityFilter(outputToExtend, visibilityFilter, entity.id,
              SpecialEdge.FromProfiledClassToClassProfile, visualModel, selectedClassId,
              nodeSelection.areIdentifiersFromVisualModel, contextEntities);
          }
        }
      });
    }
    else if(directionOfExtension === "PARENT") {
      if(!isSemanticModelClassProfile(selectedClass)) {
        continue;
      }
      const selectedClassAsProfile = (selectedClass as SemanticModelClassProfile);

      for(const profileSource of selectedClassAsProfile.profiling) {
        addToExtensionIfSatisfiesVisibilityFilter(outputToExtend, visibilityFilter, profileSource,
          SpecialEdge.FromClassProfileToProfiledClass, visualModel, selectedClassId,
          nodeSelection.areIdentifiersFromVisualModel, contextEntities);
      }
    }
  }
}

/**
 * Extends {@link outputToExtend} by all directly profiled classes, which also pass the {@link visibilityFilter}.
 * The result of extension is put inside {@link outputToExtend}
 * (non-destructively - i.e. the parameter is extended by the result).
 */
function extendThroughClassProfileParents(
  nodeSelection: NodeSelection,
  visibilityFilter: VisibilityFilter,
  outputToExtend: SelectionExtension,
  contextEntities: ClassesContextEntities,
  visualModel: VisualModel | null
) {
  extendThroughClassProfile(nodeSelection, visibilityFilter, "PARENT", outputToExtend, contextEntities, visualModel);
}

/**
 * Extends {@link outputToExtend} by all direct profile classes, which also pass the {@link visibilityFilter}.
 * The result of extension is put inside {@link outputToExtend}
 * (non-destructively - i.e. the parameter is extended by the result).
 */
function extendThroughClassProfileChildren(
  nodeSelection: NodeSelection,
  visibilityFilter: VisibilityFilter,
  outputToExtend: SelectionExtension,
  contextEntities: ClassesContextEntities,
  visualModel: VisualModel | null
): void {
  extendThroughClassProfile(
    nodeSelection, visibilityFilter, "CHILD", outputToExtend,
    contextEntities, visualModel);
}

//
//

/**
 * @param shouldReturnOnlyTheProfileRelationships
 * if true then the result will contain in the edges part only relationship profiles (and usages).
 * @returns Returns all the classes and relationships in model, where the returned relationships depend
 * on the {@link shouldReturnOnlyTheProfileRelationships} parameter.
 */
export function getSelectionForWholeSemanticModel(
  semanticModel: EntityModel,
  visualModel: VisualModel | null,
  shouldReturnOnlyTheProfileRelationships: boolean
): Selections {
  const result: Selections = {
    nodeSelection: [],
    edgeSelection: [],
  };

  const entities = Object.values(semanticModel.getEntities());
  let relationshipEntities: Entity[] = [];
  entities.forEach(entity => {
    const identifier = entity.id;
    if(identifier !== null) {
      const isClassOrClassProfile = isSemanticModelClass(entity) ||
                                    isSemanticModelClassProfile(entity);
      if(isClassOrClassProfile) {
        result.nodeSelection.push(identifier)
      }
      else {
        relationshipEntities.push(entity);
      }
    }
  });

  relationshipEntities = relationshipEntities
    .filter(relationship => isSemanticModelRelationship(relationship) ||
                            isSemanticModelRelationshipProfile(relationship))
    .filter(relationship => checkIfBothEndsArePresent(visualModel, result.nodeSelection, relationship));
  if(shouldReturnOnlyTheProfileRelationships) {
    relationshipEntities = relationshipEntities
      .filter(relationship => isSemanticModelRelationshipProfile(relationship));
  }
  result.edgeSelection = relationshipEntities.map(relationship => relationship.id);
  return result;
}

/**
 * @returns True if both ends are present.
 * End is present if it is either in the visual model or in the list given in {@link newClasses}.
 */
function checkIfBothEndsArePresent(
  visualModel: VisualModel | null,
  newClasses: string[],
  relationshipToAdd: SemanticModelRelationship | SemanticModelRelationshipProfile,
): boolean {
  const areEndsPresent: [boolean, boolean] = [false, false];
  for(const cclass of newClasses) {
    if(relationshipToAdd.ends[0].concept === cclass) {
      areEndsPresent[0] = true;
    }
    if(relationshipToAdd.ends[1].concept === cclass) {
      areEndsPresent[1] = true;
    }
  }

  if(visualModel !== null) {
    for(const visualEntity of visualModel.getVisualEntities().values()) {
      if(isVisualNode(visualEntity)) {
        if(visualEntity.representedEntity === relationshipToAdd.ends[0].concept) {
          areEndsPresent[0] = true;
        }
        if(visualEntity.representedEntity === relationshipToAdd.ends[1].concept) {
          areEndsPresent[1] = true;
        }
      }
    }
  }

  return areEndsPresent[0] && areEndsPresent[1];
}
