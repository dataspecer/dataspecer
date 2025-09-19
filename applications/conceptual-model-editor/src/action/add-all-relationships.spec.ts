/**
 * Tests:
 * {@link addAllRelationshipsForVisualDiagramNodeToVisualModelAction}
 */

import { expect, test } from "vitest";
import {
  createDefaultVisualModelFactory,
  VisualDiagramNode,
  VisualRelationship
} from "@dataspecer/visual-model";

import { notificationMockup, TestedSemanticConnectionType } from "./test/actions-test-suite";
import { ActionsTestSuite } from "./test/actions-test-suite";
import { addAllRelationshipsForVisualDiagramNodeToVisualModelAction } from "./add-all-relationships";
import { VisualModelDiagramNode } from "@/diagram";

test("Try to call the action when all edges are missing, " +
      "then call again, then remove one edge and then call again", () => {
  const {
    visualModel,
    graph,
    modelsAsArray,
    classesContext
  } = ActionsTestSuite.prepareModelsWithSemanticData(0, TestedSemanticConnectionType.Association);
  const model = modelsAsArray[2];

  const firstNodeInModel = ActionsTestSuite.createNewVisualNodeForTesting(visualModel, model.getId(), "4");
  const secondNodeInModel = ActionsTestSuite.createNewVisualNodeForTesting(visualModel, model.getId(), "5");

  const referencedVisualModel = createDefaultVisualModelFactory().createNewWritableVisualModelSync(null);
  ActionsTestSuite.createNewVisualNodeForTesting(referencedVisualModel, model.getId(), "6");
  ActionsTestSuite.createNewVisualNodeForTesting(referencedVisualModel, model.getId(), "7");
  graph.aggregator.addModel(referencedVisualModel);

  const diagramNodeIdentifier = ActionsTestSuite.createNewVisualDiagramNodeForTesting(
    visualModel, referencedVisualModel.getIdentifier());

  const diagramNodeInVisualModel = visualModel.getVisualEntity(diagramNodeIdentifier) as VisualDiagramNode;
  const diagramNodeInDiagram = ActionsTestSuite.createNewVisualModelDiagramNodeFromVisualDiagramNodeForTesting(
    diagramNodeInVisualModel);

  // Sanity check
  expect([...visualModel.getVisualEntities().keys()].length).toBe(3);

  // Run action
  addAllRelationshipsForVisualDiagramNodeToVisualModelAction(
    notificationMockup, classesContext, graph, visualModel, diagramNodeInDiagram);

  // Check results
  // The old model didn't change
  expect([...referencedVisualModel.getVisualEntities().keys()].length).toBe(2);
  // The new model has 2 additional edges
  expect([...visualModel.getVisualEntities().keys()].length).toBe(5);
  //
  let firstEdge = visualModel.getVisualEntitiesForRepresented("5-6") as VisualRelationship[];
  const secondEdge = visualModel.getVisualEntitiesForRepresented("7-4") as VisualRelationship[];
  expect(firstEdge.length).toBe(1);
  expect(secondEdge.length).toBe(1);
  //
  expect(firstEdge[0].visualSource).toBe(secondNodeInModel);
  expect(firstEdge[0].visualTarget).toBe(diagramNodeIdentifier);
  expect(secondEdge[0].visualSource).toBe(diagramNodeIdentifier);
  expect(secondEdge[0].visualTarget).toBe(firstNodeInModel);

  // Run action again
  addAllRelationshipsForVisualDiagramNodeToVisualModelAction(
    notificationMockup, classesContext, graph, visualModel, diagramNodeInDiagram);

  // No change
  expect([...visualModel.getVisualEntities().keys()].length).toBe(5);

  // Remove one of the edges
  visualModel.deleteVisualEntity(firstEdge[0].identifier);
  // Sanity check
  expect([...visualModel.getVisualEntities().keys()].length).toBe(4);
  firstEdge = visualModel.getVisualEntitiesForRepresented("5-6") as VisualRelationship[];
  expect(firstEdge.length).toBe(0);

  // Run action again
  addAllRelationshipsForVisualDiagramNodeToVisualModelAction(
    notificationMockup, classesContext, graph, visualModel, diagramNodeInDiagram);
  // The one edge should be back
  expect([...visualModel.getVisualEntities().keys()].length).toBe(5);
  firstEdge = visualModel.getVisualEntitiesForRepresented("5-6") as VisualRelationship[];
  expect(firstEdge.length).toBe(1);
  expect(firstEdge[0].visualSource).toBe(secondNodeInModel);
  expect(firstEdge[0].visualTarget).toBe(diagramNodeIdentifier);
});

test("Creating edges between two visual diagram nodes", () => {
  const {
    visualModel,
    graph,
    modelsAsArray,
    classesContext
  } = ActionsTestSuite.prepareModelsWithSemanticData(0, TestedSemanticConnectionType.Association);
  const model = modelsAsArray[2];
  const firstNodeInModel = ActionsTestSuite.createNewVisualNodeForTesting(visualModel, model.getId(), "4");

  const firstReferencedVisualModel = createDefaultVisualModelFactory().createNewWritableVisualModelSync(null);
  ActionsTestSuite.createNewVisualNodeForTesting(firstReferencedVisualModel, model.getId(), "6");
  ActionsTestSuite.createNewVisualNodeForTesting(firstReferencedVisualModel, model.getId(), "7");
  graph.aggregator.addModel(firstReferencedVisualModel);

  const secondReferencedVisualModel = createDefaultVisualModelFactory().createNewWritableVisualModelSync(null);
  ActionsTestSuite.createNewVisualNodeForTesting(secondReferencedVisualModel, model.getId(), "5");
  graph.aggregator.addModel(secondReferencedVisualModel);

  const firstDiagramNodeIdentifier = ActionsTestSuite.createNewVisualDiagramNodeForTesting(
    visualModel, firstReferencedVisualModel.getIdentifier());
  const secondDiagramNodeIdentifier = ActionsTestSuite.createNewVisualDiagramNodeForTesting(
    visualModel, secondReferencedVisualModel.getIdentifier());

  const diagramNodesInVisualModel: VisualModelDiagramNode[] = [];
  let diagramNodeInVisualModel;
  let diagramNodeInDiagram;
  // Add the first one
  diagramNodeInVisualModel = visualModel.getVisualEntity(firstDiagramNodeIdentifier) as VisualDiagramNode;
  diagramNodeInDiagram = ActionsTestSuite.createNewVisualModelDiagramNodeFromVisualDiagramNodeForTesting(
    diagramNodeInVisualModel);
  diagramNodesInVisualModel.push(diagramNodeInDiagram);

  // Add the second one
  diagramNodeInVisualModel = visualModel.getVisualEntity(secondDiagramNodeIdentifier) as VisualDiagramNode;
  diagramNodeInDiagram = ActionsTestSuite.createNewVisualModelDiagramNodeFromVisualDiagramNodeForTesting(
    diagramNodeInVisualModel);
  diagramNodesInVisualModel.push(diagramNodeInDiagram);

  // Sanity check
  expect([...visualModel.getVisualEntities().keys()].length).toBe(3);

  // Run action
  addAllRelationshipsForVisualDiagramNodeToVisualModelAction(
    notificationMockup, classesContext, graph, visualModel, diagramNodesInVisualModel[0]);
  expect([...visualModel.getVisualEntities().keys()].length).toBe(5);
  // Run action again - nothing should be added
  addAllRelationshipsForVisualDiagramNodeToVisualModelAction(
    notificationMockup, classesContext, graph, visualModel, diagramNodesInVisualModel[0]);
  expect([...visualModel.getVisualEntities().keys()].length).toBe(5);

  // Check results
  // The old models didn't change
  expect([...firstReferencedVisualModel.getVisualEntities().keys()].length).toBe(2);
  expect([...secondReferencedVisualModel.getVisualEntities().keys()].length).toBe(1);
  // The new model has 2 additional edges
  expect([...visualModel.getVisualEntities().keys()].length).toBe(5);
  //
  const firstEdge = visualModel.getVisualEntitiesForRepresented("5-6") as VisualRelationship[];
  const secondEdge = visualModel.getVisualEntitiesForRepresented("7-4") as VisualRelationship[];
  expect(firstEdge.length).toBe(1);
  expect(secondEdge.length).toBe(1);
  //
  expect(firstEdge[0].visualSource).toBe(secondDiagramNodeIdentifier);
  expect(firstEdge[0].visualTarget).toBe(firstDiagramNodeIdentifier);
  expect(secondEdge[0].visualSource).toBe(firstDiagramNodeIdentifier);
  expect(secondEdge[0].visualTarget).toBe(firstNodeInModel);
});
