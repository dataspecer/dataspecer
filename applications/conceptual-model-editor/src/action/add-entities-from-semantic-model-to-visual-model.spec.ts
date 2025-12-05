/**
 * Tests {@link addEntitiesFromSemanticModelToVisualModelAction}
 */

import { expect, test } from "vitest";
import { isVisualNode, isVisualRelationship, VisualNode } from "@dataspecer/visual-model";
import { isSemanticModelClass, isSemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import { addEntitiesFromSemanticModelToVisualModelAction } from "./add-entities-from-semantic-model-to-visual-model";
import { ActionsTestSuite, notificationMockup, TestedSemanticConnectionType } from "./test/actions-test-suite";

test("Test adding semantic model to visual model - graph with no relationships", async () => {
  const {
    classesContext,
    graph,
    models,
    visualModel,
  } = ActionsTestSuite.prepareModelsWithSemanticData(0, TestedSemanticConnectionType.Association);
  const diagram = ActionsTestSuite.createTestDiagram();
  const relevantModel = [...models.entries()][0][1];
  await addEntitiesFromSemanticModelToVisualModelAction(
    notificationMockup, classesContext, graph,
    diagram, visualModel, relevantModel);

  const result = [...visualModel.getVisualEntities().entries()].map(entity => entity[1]);
  expect(result.length).toBe(4);
  expect(result.filter(isVisualNode).length).toBe(4);
  const expectedRepresentedIds = Object.values(relevantModel.getEntities()).map(entity => entity.id).sort();
  expect((result as VisualNode[]).map(node => node.representedEntity).sort()).toEqual(expectedRepresentedIds);
});

test("Test adding semantic model to visual model - square graph", async () => {
  const {
    classesContext,
    graph,
    models,
    visualModel,
  } = ActionsTestSuite.prepareModelsWithSemanticData(0, TestedSemanticConnectionType.Association);
  const diagram = ActionsTestSuite.createTestDiagram();
  const relevantModel = [...models.entries()][1][1];
  await addEntitiesFromSemanticModelToVisualModelAction(
    notificationMockup, classesContext, graph,
    diagram, visualModel, relevantModel);

  const result = [...visualModel.getVisualEntities().entries()].map(entity => entity[1]);
  const nodes = result.filter(isVisualNode);
  const edges = result.filter(isVisualRelationship);
  expect(result.length).toBe(8);  // 4 nodes + 4 edges
  expect(nodes.length).toBe(4);
  expect(edges.length).toBe(4);
  const expectedRepresentedNodeIds = Object.values(relevantModel.getEntities())
    .filter(isSemanticModelClass)
    .map(entity => entity.id)
    .sort();
  expect(nodes.map(node => node.representedEntity).sort()).toEqual(expectedRepresentedNodeIds);
  const expectedRelationshipRepresentedIds = Object.values(relevantModel.getEntities())
    .filter(isSemanticModelRelationship)
    .map(entity => entity.id)
    .sort();
  expect(edges.map(edge => edge.representedRelationship).sort()).toEqual(expectedRelationshipRepresentedIds);
});

test("Test adding semantic model to visual model - fully connected graph", async () => {
  const {
    classesContext,
    graph,
    models,
    visualModel,
  } = ActionsTestSuite.prepareModelsWithSemanticData(0, TestedSemanticConnectionType.Association);
  const diagram = ActionsTestSuite.createTestDiagram();
  const relevantModel = [...models.entries()][2][1];
  await addEntitiesFromSemanticModelToVisualModelAction(
    notificationMockup, classesContext, graph,
    diagram, visualModel, relevantModel);

  const result = [...visualModel.getVisualEntities().entries()].map(entity => entity[1]);
  const nodes = result.filter(isVisualNode);
  const edges = result.filter(isVisualRelationship);
  expect(result.length).toBe(10);  // 4 nodes + 6 edges
  expect(nodes.length).toBe(4);
  expect(edges.length).toBe(6);
  const expectedRepresentedNodeIds = Object.values(relevantModel.getEntities())
    .filter(isSemanticModelClass)
    .map(entity => entity.id)
    .sort();
  expect(nodes.map(node => node.representedEntity).sort()).toEqual(expectedRepresentedNodeIds);
  const expectedRelationshipRepresentedIds = Object.values(relevantModel.getEntities())
    .filter(isSemanticModelRelationship)
    .map(entity => entity.id)
    .sort();
  expect(edges.map(edge => edge.representedRelationship).sort()).toEqual(expectedRelationshipRepresentedIds);
});
