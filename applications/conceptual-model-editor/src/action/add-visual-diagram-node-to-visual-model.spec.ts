/**
 * Tests:
 * {@link addVisualDiagramNodeForNewModelToVisualModelAction}
 */

import { expect, test } from "vitest";
import {
  isVisualDiagramNode,
  isWritableVisualModel,
  VisualDiagramNode,
  VisualRelationship,
  WritableVisualModel
} from "@dataspecer/visual-model";

import { notificationMockup, TestedSemanticConnectionType } from "./test/actions-test-suite";
import { ActionsTestSuite } from "./test/actions-test-suite";
import { addVisualDiagramNodeForNewModelToVisualModelAction } from "./add-visual-diagram-node-to-visual-model";

test("Put 4 visual nodes without edges into visual model with visual diagram node reference to it", () => {
  const {
    visualModel,
    graph,
    useGraph,
    visualNodeIdentifiers
  } = ActionsTestSuite.prepareModelsWithSemanticData(4, TestedSemanticConnectionType.Association);
  const diagram = ActionsTestSuite.createTestDiagram();

  const createdVisualDiagramNodeIdentifier = addVisualDiagramNodeForNewModelToVisualModelAction(
    notificationMockup, graph, useGraph, diagram, visualModel, null, visualNodeIdentifiers, []);
  expect(createdVisualDiagramNodeIdentifier).not.toBeNull();
  const createdVisualDiagramNode = visualModel.getVisualEntity(
    createdVisualDiagramNodeIdentifier!) as VisualDiagramNode;

  expect(createdVisualDiagramNode).not.toBeNull();
  expect(isVisualDiagramNode(createdVisualDiagramNode!)).toBeTruthy();

  const createdVisualModel = graph.aggregatorView.getModels()
    .find(model => model.getId() === createdVisualDiagramNode.representedVisualModel) as WritableVisualModel;
  expect(createdVisualModel).not.toBeUndefined();
  expect(isWritableVisualModel(createdVisualModel)).toBeTruthy();

  expect([...createdVisualModel.getVisualEntities().keys()].length).toBe(4);
});

test("Put visual nodes with edges into visual model with visual diagram node reference to it", () => {
  const {
    visualModel,
    modelsAsArray,
    graph,
    useGraph,
  } = ActionsTestSuite.prepareModelsWithSemanticData(0, TestedSemanticConnectionType.Association);
  const diagram = ActionsTestSuite.createTestDiagram();
  const model = modelsAsArray[2].getId();

  const nodeVisuals: string[] = [];
  const edgeVisuals: string[] = [];
  for (let i = 8; i < 12; i++) {
    const nodeVisual = ActionsTestSuite.createNewVisualNodeForTesting(
      visualModel, model, i.toString());
    nodeVisuals.push(nodeVisual);
    const previousI = i - 1;
    if (i === 8) {
      continue;
    }
    const edgeVisual = ActionsTestSuite.createNewVisualRelationshipsForTestingFromSemanticEnds(
      visualModel, model, previousI.toString(), i.toString(), `${previousI}-${i}`);
    edgeVisuals.push(edgeVisual);
  }
  const edgeVisual = ActionsTestSuite.createNewVisualRelationshipsForTestingFromSemanticEnds(
    visualModel, model, "11", "8", "11-8");
  edgeVisuals.push(edgeVisual);

  // Perform action
  const createdVisualDiagramNodeIdentifier = addVisualDiagramNodeForNewModelToVisualModelAction(
    notificationMockup, graph, useGraph, diagram, visualModel, null,
    [nodeVisuals[0], nodeVisuals[1]], edgeVisuals);

  // Check the content of the main visual model
  expect([...visualModel.getVisualEntities()].length).toBe(6);
  // Not changed part of the main visual model
  expect(visualModel.getVisualEntitiesForRepresented("10").length).toBe(1);
  expect(visualModel.getVisualEntitiesForRepresented("11").length).toBe(1);
  expect(visualModel.getVisualEntitiesForRepresented("10-11").length).toBe(1);
  // Changed part of the main visual model
  const firstReroutedRelationship = visualModel.getVisualEntitiesForRepresented("9-10") as VisualRelationship[];
  expect(firstReroutedRelationship.length).toBe(1);
  expect(firstReroutedRelationship[0].visualSource).toBe(createdVisualDiagramNodeIdentifier);
  expect(firstReroutedRelationship[0].visualTarget).toBe(nodeVisuals[2]);

  const secondReroutedRelationship = visualModel.getVisualEntitiesForRepresented("11-8") as VisualRelationship[];
  expect(secondReroutedRelationship.length).toBe(1);
  expect(secondReroutedRelationship[0].visualSource).toBe(nodeVisuals[3]);
  expect(secondReroutedRelationship[0].visualTarget).toBe(createdVisualDiagramNodeIdentifier);

  expect(visualModel.getVisualEntity(createdVisualDiagramNodeIdentifier!)).not.toBeNull();

  // Check the content of the represented visual model
  expect(createdVisualDiagramNodeIdentifier).not.toBeNull();
  const createdVisualDiagramNode = visualModel.getVisualEntity(
    createdVisualDiagramNodeIdentifier!) as VisualDiagramNode;

  expect(createdVisualDiagramNode).not.toBeNull();
  expect(isVisualDiagramNode(createdVisualDiagramNode!)).toBeTruthy();

  const createdVisualModel = graph.aggregatorView.getModels()
    .find(model => model.getId() === createdVisualDiagramNode.representedVisualModel) as WritableVisualModel;
  expect(createdVisualModel).not.toBeUndefined();
  expect(isWritableVisualModel(createdVisualModel)).toBeTruthy();

  expect(createdVisualModel.getVisualEntitiesForRepresented("8").length).toBe(1);
  expect(createdVisualModel.getVisualEntitiesForRepresented("9").length).toBe(1);
  expect(createdVisualModel.getVisualEntitiesForRepresented("8-9").length).toBe(1);
});
