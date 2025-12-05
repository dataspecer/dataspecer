/**
 * Tests the {@link filterSelectionAction}
 */

import { expect, test } from "vitest";
import { isVisualProfileRelationship, isVisualRelationship } from "@dataspecer/visual-model";
import { isSemanticModelClass } from "@dataspecer/core-v2/semantic-model/concepts";
import { ActionsTestSuite, notificationMockup, TestedSemanticConnectionType } from "./test/actions-test-suite";
import { filterSelectionAction, SelectionFilter, SelectionsWithIdInfo } from "./filter-selection-action";
import { VisibilityFilter } from "./extend-selection-action";
import { isSemanticModelRelationshipProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";

test("Test filter - Class - visual identifiers", () => {
  const connectionType = TestedSemanticConnectionType.Association;

  const {
    classesContext,
    graph,
    models,
    visualModel,
  } = ActionsTestSuite.prepareModelsWithSemanticData(0, connectionType);

  const fullyConnectedModel = [...models.entries()][2][1];
  const filters: SelectionFilter[] = [SelectionFilter.Class];
  const visibilityFilter: VisibilityFilter = VisibilityFilter.OnlyVisible;
  const semanticModelFilter: Record<string, boolean> | null = null;

  const { nodes, edges } = ActionsTestSuite.fillVisualModelWithData(
    fullyConnectedModel, visualModel, connectionType);
  const inputNodeSelection = [nodes[0]];
  const inputSelection: SelectionsWithIdInfo = {
    nodeSelection: [...inputNodeSelection],
    edgeSelection: [...edges],
    areVisualModelIdentifiers: true
  };

  const result = filterSelectionAction(
    notificationMockup, graph, classesContext, inputSelection,
    filters, visibilityFilter, semanticModelFilter);

  expect(result.nodeSelection).toEqual(inputNodeSelection);
  expect(result.edgeSelection).toEqual([]);
});

test("Test filter - Class - semantic identifiers", () => {
  const connectionType = TestedSemanticConnectionType.Association;

  const {
    classesContext,
    graph,
    models,
    visualModel,
  } = ActionsTestSuite.prepareModelsWithSemanticData(0, connectionType);

  const fullyConnectedModel = [...models.entries()][2][1];
  const modelEntities = fullyConnectedModel.getEntities();
  const filters: SelectionFilter[] = [SelectionFilter.Class];
  const visibilityFilter: VisibilityFilter = VisibilityFilter.OnlyVisible;
  const semanticModelFilter: Record<string, boolean> | null = null;

  ActionsTestSuite.fillVisualModelWithData(fullyConnectedModel, visualModel, connectionType);
  const classes = Object.values(modelEntities).filter(isSemanticModelClass).map(cclass => cclass.id);
  const relationships = Object.values(modelEntities)
    .filter(ActionsTestSuite.mapTestedSemanticConnectionToSemanticCheck[connectionType])
    .map(relation => relation.id);
  const inputClassSelection = [classes[0]];
  const inputSelection: SelectionsWithIdInfo = {
    nodeSelection: [...inputClassSelection],
    edgeSelection: [...relationships],
    areVisualModelIdentifiers: false
  };

  const result = filterSelectionAction(
    notificationMockup, graph, classesContext, inputSelection,
    filters, visibilityFilter, semanticModelFilter);

  expect(result.nodeSelection).toEqual(inputClassSelection);
  expect(result.edgeSelection).toEqual([]);
});

test("Test filter - Class - Using wrong identifiers", () => {
  const connectionType = TestedSemanticConnectionType.Association;

  const {
    classesContext,
    graph,
    models,
    visualModel,
  } = ActionsTestSuite.prepareModelsWithSemanticData(0, connectionType);

  const fullyConnectedModel = [...models.entries()][2][1];
  const modelEntities = fullyConnectedModel.getEntities();
  const filters: SelectionFilter[] = [SelectionFilter.Class];
  const visibilityFilter: VisibilityFilter = VisibilityFilter.OnlyVisible;
  const semanticModelFilter: Record<string, boolean> | null = null;

  ActionsTestSuite.fillVisualModelWithData(fullyConnectedModel, visualModel, connectionType);
  const classes = Object.values(modelEntities).filter(isSemanticModelClass).map(cclass => cclass.id);
  const relationships = Object.values(modelEntities)
    .filter(ActionsTestSuite.mapTestedSemanticConnectionToSemanticCheck[connectionType])
    .map(relation => relation.id);
  const inputSelection: SelectionsWithIdInfo = {
    nodeSelection: [...classes],    // Using visual identifiers instead of the semantic ones
    edgeSelection: [...relationships],
    areVisualModelIdentifiers: true
  };

  const result = filterSelectionAction(
    notificationMockup, graph, classesContext, inputSelection,
    filters, visibilityFilter, semanticModelFilter);

  expect(result.nodeSelection).toEqual([]); // We are expecting the wrong identifiers to not pass the class filter
  expect(result.edgeSelection).toEqual([]);
});

test("Test filter - Relationships - visual identifiers", () => {
  const connectionType = TestedSemanticConnectionType.Association;

  const {
    classesContext,
    graph,
    models,
    visualModel,
  } = ActionsTestSuite.prepareModelsWithSemanticData(0, connectionType);

  const fullyConnectedModel = [...models.entries()][2][1];
  const filters: SelectionFilter[] = [SelectionFilter.Relationship];
  const visibilityFilter: VisibilityFilter = VisibilityFilter.OnlyVisible;
  const semanticModelFilter: Record<string, boolean> | null = null;

  const { nodes, edges } = ActionsTestSuite.fillVisualModelWithData(
    fullyConnectedModel, visualModel, connectionType);
  const inputEdgeSelection = [edges[0], edges[1]];
  const inputSelection: SelectionsWithIdInfo = {
    nodeSelection: [...nodes],
    edgeSelection: [...inputEdgeSelection],
    areVisualModelIdentifiers: true
  };

  const result = filterSelectionAction(
    notificationMockup, graph, classesContext, inputSelection,
    filters, visibilityFilter, semanticModelFilter);

  expect(result.nodeSelection).toEqual([]);
  expect(result.edgeSelection).toEqual(inputEdgeSelection);
});

test("Test filter - Relationships - semantic identifiers", () => {
  const connectionType = TestedSemanticConnectionType.Association;

  const {
    classesContext,
    graph,
    models,
    visualModel,
  } = ActionsTestSuite.prepareModelsWithSemanticData(0, connectionType);

  const fullyConnectedModel = [...models.entries()][2][1];
  const modelEntities = fullyConnectedModel.getEntities();
  const filters: SelectionFilter[] = [SelectionFilter.Relationship];
  const visibilityFilter: VisibilityFilter = VisibilityFilter.OnlyVisible;
  const semanticModelFilter: Record<string, boolean> | null = null;

  ActionsTestSuite.fillVisualModelWithData(fullyConnectedModel, visualModel, connectionType);
  const classes = Object.values(modelEntities).filter(isSemanticModelClass).map(cclass => cclass.id);
  const relationships = Object.values(modelEntities)
    .filter(ActionsTestSuite.mapTestedSemanticConnectionToSemanticCheck[connectionType])
    .map(relation => relation.id);
  const inputRelationshipsSelection = [relationships[0], relationships[1]];
  const inputSelection: SelectionsWithIdInfo = {
    nodeSelection: [...classes],
    edgeSelection: [...inputRelationshipsSelection],
    areVisualModelIdentifiers: false
  };

  const result = filterSelectionAction(
    notificationMockup, graph, classesContext, inputSelection,
    filters, visibilityFilter, semanticModelFilter);

  expect(result.nodeSelection).toEqual([]);
  expect(result.edgeSelection).toEqual(inputRelationshipsSelection);
});

test("Test filter - Generalizations - visual identifiers", () => {
  const connectionType = TestedSemanticConnectionType.Generalization;

  const {
    classesContext,
    graph,
    models,
    visualModel,
  } = ActionsTestSuite.prepareModelsWithSemanticData(0, connectionType);

  const fullyConnectedModel = [...models.entries()][2][1];
  const filters: SelectionFilter[] = [SelectionFilter.Generalization];
  const visibilityFilter: VisibilityFilter = VisibilityFilter.OnlyVisible;
  const semanticModelFilter: Record<string, boolean> | null = null;

  const { nodes, edges } = ActionsTestSuite.fillVisualModelWithData(
    fullyConnectedModel, visualModel, connectionType);
  const inputEdgeSelection = [edges[0], edges[1]];
  const inputSelection: SelectionsWithIdInfo = {
    nodeSelection: [...nodes],
    edgeSelection: [...inputEdgeSelection],
    areVisualModelIdentifiers: true
  };

  const result = filterSelectionAction(
    notificationMockup, graph, classesContext, inputSelection,
    filters, visibilityFilter, semanticModelFilter);

  expect(result.nodeSelection).toEqual([]);
  expect(result.edgeSelection).toEqual(inputEdgeSelection);
});

test("Test filter - Generalizations - semantic identifiers", () => {
  const connectionType = TestedSemanticConnectionType.Generalization;

  const {
    classesContext,
    graph,
    models,
    visualModel,
  } = ActionsTestSuite.prepareModelsWithSemanticData(0, connectionType);

  const fullyConnectedModel = [...models.entries()][2][1];
  const modelEntities = fullyConnectedModel.getEntities();
  const filters: SelectionFilter[] = [SelectionFilter.Generalization];
  const visibilityFilter: VisibilityFilter = VisibilityFilter.OnlyVisible;
  const semanticModelFilter: Record<string, boolean> | null = null;

  ActionsTestSuite.fillVisualModelWithData(fullyConnectedModel, visualModel, connectionType);
  const classes = Object.values(modelEntities).filter(isSemanticModelClass).map(cclass => cclass.id);
  const generalizations = Object.values(modelEntities)
    .filter(ActionsTestSuite.mapTestedSemanticConnectionToSemanticCheck[connectionType])
    .map(relation => relation.id);
  const inputGeneralizationSelection = [generalizations[0], generalizations[1]];
  const inputSelection: SelectionsWithIdInfo = {
    nodeSelection: [...classes],
    edgeSelection: [...inputGeneralizationSelection],
    areVisualModelIdentifiers: false
  };

  const result = filterSelectionAction(
    notificationMockup, graph, classesContext, inputSelection,
    filters, visibilityFilter, semanticModelFilter);

  expect(result.nodeSelection).toEqual([]);
  expect(result.edgeSelection).toEqual(inputGeneralizationSelection);
});

test("Test filter - Class profiles - visual identifiers", () => {
  const connectionType = TestedSemanticConnectionType.Generalization;

  const {
    classesContext,
    graph,
    models,
    visualModel,
  } = ActionsTestSuite.prepareModelsWithSemanticData(0, connectionType);

  const fullyConnectedModel = [...models.entries()][2][1];
  const modelEntities = fullyConnectedModel.getEntities();
  const filters: SelectionFilter[] = [SelectionFilter.ClassProfile];
  const visibilityFilter: VisibilityFilter = VisibilityFilter.OnlyVisible;
  const semanticModelFilter: Record<string, boolean> | null = null;

  const { nodes } = ActionsTestSuite.fillVisualModelWithData(fullyConnectedModel, visualModel, connectionType);

  const generalizations = Object.values(modelEntities)
    .filter(ActionsTestSuite.mapTestedSemanticConnectionToSemanticCheck[connectionType])
    .map(relation => relation.id);

  const classProfiles = ActionsTestSuite.createClassProfileOfEveryClassTestVariant(
    models, fullyConnectedModel.getId(), classesContext);
  const createdProfileNodes = [];
  for(const classProfile of classProfiles.createdIdentifiers) {
    const profiledClassVisual = visualModel.getVisualEntitiesForRepresented(classProfile.profiledClass)[0];
    const id = ActionsTestSuite.createNewVisualNodeOfClassProfileForTesting(
      visualModel, classProfiles.model.getId(), classProfile.classProfile, profiledClassVisual.identifier);
    createdProfileNodes.push(id);
  }

  const allEdges = [...visualModel.getVisualEntities().entries()]
    .map(visual => visual[1])
    .filter(visual => isVisualRelationship(visual) || isVisualProfileRelationship(visual))
    .map(edge => edge.identifier);

  const inputSelection: SelectionsWithIdInfo = {
    nodeSelection: [...nodes, createdProfileNodes[0]],
    edgeSelection: [...generalizations, ...allEdges],
    areVisualModelIdentifiers: true
  };

  const result = filterSelectionAction(
    notificationMockup, graph, classesContext, inputSelection,
    filters, visibilityFilter, semanticModelFilter);

  const expectedEdges = [...visualModel.getVisualEntities().entries()]
    .map(visual => visual[1])
    .filter(visual => isVisualProfileRelationship(visual))
    .map(edge => edge.identifier)
  expect(result.nodeSelection).toEqual([createdProfileNodes[0]]);
  expect(result.edgeSelection.sort()).toEqual(expectedEdges.sort());
});

test("Test filter - Class profiles - semantic identifiers", () => {
  const connectionType = TestedSemanticConnectionType.Generalization;

  const {
    classesContext,
    graph,
    models,
    visualModel,
  } = ActionsTestSuite.prepareModelsWithSemanticData(0, connectionType);

  const fullyConnectedModel = [...models.entries()][2][1];
  const modelEntities = fullyConnectedModel.getEntities();
  const filters: SelectionFilter[] = [SelectionFilter.ClassProfile];
  const visibilityFilter: VisibilityFilter = VisibilityFilter.OnlyVisible;
  const semanticModelFilter: Record<string, boolean> | null = null;

  ActionsTestSuite.fillVisualModelWithData(fullyConnectedModel, visualModel, connectionType);
  const classes = Object.values(modelEntities).filter(isSemanticModelClass).map(cclass => cclass.id);
  const generalizations = Object.values(modelEntities)
    .filter(ActionsTestSuite.mapTestedSemanticConnectionToSemanticCheck[connectionType])
    .map(relation => relation.id);

  const classProfiles = ActionsTestSuite.createClassProfileOfEveryClassTestVariant(
    models, fullyConnectedModel.getId(), classesContext);
  const inputClassProfiles = [
    classProfiles.createdIdentifiers[0].classProfile,
    classProfiles.createdIdentifiers[1].classProfile
  ];
  const createdProfileNodes = [];
  for(const classProfile of classProfiles.createdIdentifiers) {
    const profiledClassVisual = visualModel.getVisualEntitiesForRepresented(classProfile.profiledClass)[0];
    const id = ActionsTestSuite.createNewVisualNodeOfClassProfileForTesting(
      visualModel, classProfiles.model.getId(), classProfile.classProfile, profiledClassVisual.identifier);
    createdProfileNodes.push(id);
  }

  const inputSelection: SelectionsWithIdInfo = {
    nodeSelection: [...inputClassProfiles, ...classes],
    edgeSelection: [...generalizations],
    areVisualModelIdentifiers: false
  };

  const result = filterSelectionAction(
    notificationMockup, graph, classesContext, inputSelection,
    filters, visibilityFilter, semanticModelFilter);

  expect(result.nodeSelection).toEqual(inputClassProfiles);
  expect(result.edgeSelection).toEqual([]);
});

test("Test filter - Relationship profiles - visual identifiers", () => {
  const connectionType = TestedSemanticConnectionType.Association;

  const {
    classesContext,
    graph,
    models,
    visualModel,
  } = ActionsTestSuite.prepareModelsWithSemanticData(0, connectionType);

  const fullyConnectedModel = [...models.entries()][2][1];
  const filters: SelectionFilter[] = [SelectionFilter.RelationshipProfile];
  const visibilityFilter: VisibilityFilter = VisibilityFilter.OnlyVisible;
  const semanticModelFilter: Record<string, boolean> | null = null;

  const { nodes } = ActionsTestSuite.fillVisualModelWithData(
    fullyConnectedModel, visualModel, connectionType);

  const classProfiles = ActionsTestSuite.createClassProfileOfEveryClassTestVariant(
    models, fullyConnectedModel.getId(), classesContext);
  const createdProfileNodes: string[] = [];
  for(const classProfile of classProfiles.createdIdentifiers) {
    const id = ActionsTestSuite.createNewVisualNodeForTesting(
      visualModel, classProfiles.model.getId(), classProfile.classProfile);
    createdProfileNodes.push(id);
  }

  const relationshipProfiles = ActionsTestSuite.createRelationshipProfileOfEveryRelationshipTestVariant(
    models, fullyConnectedModel.getId(), classesContext);
  const relationshipProfilesVisuals: string[] = [];
  for(const relationshipProfile of relationshipProfiles.createdIdentifiers) {
    const relationshipProfileEntity = classesContext.relationshipProfiles.find(rp => rp.id === relationshipProfile);
    if(relationshipProfileEntity === undefined || !isSemanticModelRelationshipProfile(relationshipProfileEntity)) {
      throw new Error("Failed on relationship profile setup");
    }
    const id = ActionsTestSuite.createNewVisualRelationshipsForTestingFromSemanticEnds(
      visualModel, fullyConnectedModel.getId(), relationshipProfileEntity?.ends[0].concept,
      relationshipProfileEntity?.ends[1].concept, relationshipProfileEntity.id);
    relationshipProfilesVisuals.push(id);
  }

  const inputSelection: SelectionsWithIdInfo = {
    nodeSelection: [...nodes, createdProfileNodes[0]],
    edgeSelection: [relationshipProfilesVisuals[0]],
    areVisualModelIdentifiers: true
  };

  const result = filterSelectionAction(
    notificationMockup, graph, classesContext, inputSelection,
    filters, visibilityFilter, semanticModelFilter);

  expect(result.nodeSelection).toEqual([]);
  expect(result.edgeSelection).toEqual([relationshipProfilesVisuals[0]]);
});

test("Test filter - Relationship profiles - semantic identifiers", () => {
  const connectionType = TestedSemanticConnectionType.Association;

  const {
    classesContext,
    graph,
    models,
    visualModel,
  } = ActionsTestSuite.prepareModelsWithSemanticData(0, connectionType);

  const fullyConnectedModel = [...models.entries()][2][1];
  const modelEntities = fullyConnectedModel.getEntities();
  const filters: SelectionFilter[] = [SelectionFilter.RelationshipProfile];
  const visibilityFilter: VisibilityFilter = VisibilityFilter.OnlyVisible;
  const semanticModelFilter: Record<string, boolean> | null = null;

  ActionsTestSuite.fillVisualModelWithData(fullyConnectedModel, visualModel, connectionType);
  const classes = Object.values(modelEntities).filter(isSemanticModelClass).map(cclass => cclass.id);

  const classProfiles = ActionsTestSuite.createClassProfileOfEveryClassTestVariant(
    models, fullyConnectedModel.getId(), classesContext);
  const inputClassProfiles = [
    classProfiles.createdIdentifiers[0].classProfile,
    classProfiles.createdIdentifiers[1].classProfile
  ];
  for(const classProfile of classProfiles.createdIdentifiers) {
    ActionsTestSuite.createNewVisualNodeForTesting(
      visualModel, classProfiles.model.getId(), classProfile.classProfile);
  }

  const relationshipProfiles = ActionsTestSuite.createRelationshipProfileOfEveryRelationshipTestVariant(
    models, fullyConnectedModel.getId(), classesContext);
  for(const relationshipProfile of relationshipProfiles.createdIdentifiers) {
    const relationshipProfileEntity = classesContext.relationshipProfiles.find(rp => rp.id === relationshipProfile);
    if(relationshipProfileEntity === undefined || !isSemanticModelRelationshipProfile(relationshipProfileEntity)) {
      throw new Error("Failed on relationship profile setup");
    }

    ActionsTestSuite.createNewVisualRelationshipsForTestingFromSemanticEnds(
      visualModel, fullyConnectedModel.getId(), relationshipProfileEntity?.ends[0].concept,
      relationshipProfileEntity?.ends[1].concept, relationshipProfileEntity.id);
  }

  const inputSelection: SelectionsWithIdInfo = {
    nodeSelection: [...inputClassProfiles, ...classes],
    edgeSelection: [...relationshipProfiles.createdIdentifiers],
    areVisualModelIdentifiers: false
  };

  const result = filterSelectionAction(
    notificationMockup, graph, classesContext, inputSelection,
    filters, visibilityFilter, semanticModelFilter);

  expect(result.nodeSelection).toEqual([]);
  expect(result.edgeSelection).toEqual(relationshipProfiles.createdIdentifiers);
});
