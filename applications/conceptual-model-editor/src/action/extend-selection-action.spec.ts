/**
 * Tests the {@link extendSelectionAction}
 */

import { expect, test } from "vitest";
import { isVisualProfileRelationship, isVisualRelationship } from "@dataspecer/visual-model";
import { ActionsTestSuite, notificationMockup, TestedSemanticConnectionType } from "./test/actions-test-suite";
import { extendSelectionAction, ExtensionType, NodeSelection, VisibilityFilter } from "./extend-selection-action";

test("Test extension by relationship targets - visual identifiers", () => {
  const connectionType = TestedSemanticConnectionType.Association;

  const {
    classesContext,
    graph,
    models,
    visualModel,
  } = ActionsTestSuite.prepareModelsWithSemanticData(0, connectionType);

  const model = [...models.entries()][1][1];
  const extensionType: ExtensionType[] = [ExtensionType.AssociationTarget];
  const visibilityFilter: VisibilityFilter = VisibilityFilter.OnlyVisible;
  const semanticModelFilter: Record<string, boolean> | null = null;

  const { nodes, edges } = ActionsTestSuite.fillVisualModelWithData(
    model, visualModel, connectionType);
  const sourceNode = nodes[0]
  const inputNodeSelection: NodeSelection = {
    identifiers: [sourceNode],
    areIdentifiersFromVisualModel: true
  };

  const result = extendSelectionAction(
    notificationMockup, graph, classesContext, inputNodeSelection,
    extensionType, visibilityFilter, semanticModelFilter);

  const edgesAsObjects = edges
    .map(edge => visualModel.getVisualEntity(edge))
    .filter(edge => edge !== null)
    .filter(isVisualRelationship);
  expect(edgesAsObjects.length).toBe(4);
  const expectedTargetEdge = edgesAsObjects.find(edge => edge.visualSource === sourceNode);
  expect(result.selectionExtension.nodeSelection.length).toEqual(1);
  expect(result.selectionExtension.nodeSelection[0]).toBe(expectedTargetEdge!.visualTarget);
  expect(result.selectionExtension.edgeSelection.length).toEqual(1);
  expect(result.selectionExtension.edgeSelection[0]).toBe(expectedTargetEdge!.identifier);
  expect(result.nodesToEdgesMapping[result.selectionExtension.nodeSelection[0]][0])
    .toEqual(expectedTargetEdge!.identifier);
});

test("Test extension by Generalization targets - visual identifiers", () => {
  const connectionType = TestedSemanticConnectionType.Generalization;

  const {
    classesContext,
    graph,
    models,
    visualModel,
  } = ActionsTestSuite.prepareModelsWithSemanticData(0, connectionType);

  const model = [...models.entries()][1][1];
  const extensionType: ExtensionType[] = [ExtensionType.GeneralizationParent];
  const visibilityFilter: VisibilityFilter = VisibilityFilter.OnlyVisible;
  const semanticModelFilter: Record<string, boolean> | null = null;

  const { nodes, edges } = ActionsTestSuite.fillVisualModelWithData(
    model, visualModel, connectionType);
  const sourceNode = nodes[0]
  const inputNodeSelection: NodeSelection = {
    identifiers: [sourceNode],
    areIdentifiersFromVisualModel: true
  };

  const result = extendSelectionAction(
    notificationMockup, graph, classesContext, inputNodeSelection,
    extensionType, visibilityFilter, semanticModelFilter);

  const edgesAsObjects = edges
    .map(edge => visualModel.getVisualEntity(edge))
    .filter(edge => edge !== null)
    .filter(isVisualRelationship);
  expect(edgesAsObjects.length).toBe(4);
  const expectedTargetEdge = edgesAsObjects.find(edge => edge.visualSource === sourceNode);
  expect(result.selectionExtension.nodeSelection.length).toEqual(1);
  expect(result.selectionExtension.nodeSelection[0]).toBe(expectedTargetEdge!.visualTarget);
  expect(result.selectionExtension.edgeSelection.length).toEqual(1);
  expect(result.selectionExtension.edgeSelection[0]).toBe(expectedTargetEdge!.identifier);
  expect(result.nodesToEdgesMapping[result.selectionExtension.nodeSelection[0]][0])
    .toEqual(expectedTargetEdge!.identifier);
});

test("Test extension by Relationship profiles targets - visual identifiers", () => {
  const connectionType = TestedSemanticConnectionType.AssociationProfile;

  const {
    classesContext,
    graph,
    models,
    visualModel,
  } = ActionsTestSuite.prepareModelsWithSemanticData(0, connectionType);

  const model = [...models.entries()][1][1];
  const extensionType: ExtensionType[] = [ExtensionType.ProfileEdgeTarget];
  const visibilityFilter: VisibilityFilter = VisibilityFilter.OnlyVisible;
  const semanticModelFilter: Record<string, boolean> | null = null;

  const { nodes, edges } = ActionsTestSuite.fillVisualModelWithData(
    model, visualModel, connectionType);
  const sourceNode = nodes[0]
  const inputNodeSelection: NodeSelection = {
    identifiers: [sourceNode],
    areIdentifiersFromVisualModel: true
  };

  const result = extendSelectionAction(
    notificationMockup, graph, classesContext, inputNodeSelection,
    extensionType, visibilityFilter, semanticModelFilter);

  const edgesAsObjects = edges
    .map(edge => visualModel.getVisualEntity(edge))
    .filter(edge => edge !== null)
    .filter(isVisualRelationship);
  expect(edgesAsObjects.length).toBe(4);
  const expectedTargetEdge = edgesAsObjects.find(edge => edge.visualSource === sourceNode);
  expect(result.selectionExtension.nodeSelection.length).toEqual(1);
  expect(result.selectionExtension.nodeSelection[0]).toBe(expectedTargetEdge!.visualTarget);
  expect(result.selectionExtension.edgeSelection.length).toEqual(1);
  expect(result.selectionExtension.edgeSelection[0]).toBe(expectedTargetEdge!.identifier);
  expect(result.nodesToEdgesMapping[result.selectionExtension.nodeSelection[0]][0])
    .toEqual(expectedTargetEdge!.identifier);
});

test("Test extension by Relationship class profiles targets - visual identifiers", () => {
  const connectionType = TestedSemanticConnectionType.Association;

  const {
    classesContext,
    graph,
    models,
    visualModel,
  } = ActionsTestSuite.prepareModelsWithSemanticData(0, connectionType);

  const model = [...models.entries()][1][1];
  const extensionType: ExtensionType[] = [ExtensionType.ClassProfileParent];
  const visibilityFilter: VisibilityFilter = VisibilityFilter.OnlyVisible;
  const semanticModelFilter: Record<string, boolean> | null = null;

  ActionsTestSuite.fillVisualModelWithData(
    model, visualModel, connectionType);

  const classProfiles = ActionsTestSuite.createClassProfileOfEveryClassTestVariant(
    models, model.getId(), classesContext);
  const createdProfileNodes: string[] = [];
  for(const classProfile of classProfiles.createdIdentifiers) {
    const profiledClassVisual = visualModel.getVisualEntitiesForRepresented(classProfile.profiledClass)[0];
    const id = ActionsTestSuite.createNewVisualNodeOfClassProfileForTesting(
      visualModel, classProfiles.model.getId(), classProfile.classProfile, profiledClassVisual.identifier);
    createdProfileNodes.push(id);
  }

  const sourceNode = createdProfileNodes[0]
  const inputNodeSelection: NodeSelection = {
    identifiers: [sourceNode],
    areIdentifiersFromVisualModel: true
  };

  const result = extendSelectionAction(
    notificationMockup, graph, classesContext, inputNodeSelection,
    extensionType, visibilityFilter, semanticModelFilter);

  const edgesAsObjects = [...visualModel.getVisualEntities().entries()].map(visual => visual[1])
    .filter(isVisualProfileRelationship);
  expect(edgesAsObjects.length).toBe(4);
  const expectedTargetEdge = edgesAsObjects.find(edge => edge.visualSource === sourceNode);
  expect(result.selectionExtension.nodeSelection.length).toEqual(1);
  expect(result.selectionExtension.nodeSelection[0]).toBe(expectedTargetEdge!.visualTarget);
  expect(result.selectionExtension.edgeSelection.length).toEqual(1);
  expect(result.selectionExtension.edgeSelection[0]).toBe(expectedTargetEdge!.identifier);
  expect(result.nodesToEdgesMapping[result.selectionExtension.nodeSelection[0]][0])
    .toEqual(expectedTargetEdge!.identifier);
});
