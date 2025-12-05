/**
 * Tests the {@link addEntityNeighborhoodToVisualModelAction}
 */

import { expect, test } from "vitest";
import { isVisualNode, isVisualRelationship, VisualNode } from "@dataspecer/visual-model";
import { isSemanticModelClass, isSemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import { addEntityNeighborhoodToVisualModelAction } from "./add-entity-neighborhood-to-visual-model";
import { ActionsTestSuite, notificationMockup, TestedSemanticConnectionType } from "./test/actions-test-suite";
import { getDomainAndRangeConcepts } from "@/util/relationship-utils";

test("Test class neighborhood- no relationships", async () => {
  const {
    classesContext,
    graph,
    models,
    visualModel,
  } = ActionsTestSuite.prepareModelsWithSemanticData(0, TestedSemanticConnectionType.Association);
  const diagram = ActionsTestSuite.createTestDiagram();
  const relevantModel = [...models.entries()][0][1];
  const classesInModel = Object.keys(relevantModel.getEntities());
  for(const classInModel of classesInModel) {
    await addEntityNeighborhoodToVisualModelAction(
      notificationMockup, classesContext, graph, diagram, visualModel, classInModel);
    const actualVisualNodesInModel = visualModel.getVisualEntitiesForRepresented(classInModel);
    expect(actualVisualNodesInModel.length).toBe(1);
    expect((actualVisualNodesInModel[0] as VisualNode).representedEntity).toBe(classInModel);
  }
  expect([...visualModel.getVisualEntities().entries()].length).toBe(4);
});

test("Test class neighborhood - square relationships (4 nodes, 4 edges)", async () => {
  const {
    classesContext,
    graph,
    models,
    visualModel,
  } = ActionsTestSuite.prepareModelsWithSemanticData(0, TestedSemanticConnectionType.Association);
  const diagram = ActionsTestSuite.createTestDiagram();
  const relevantModel = [...models.entries()][1][1];
  const classesInModel = Object.values(relevantModel.getEntities());
  let currentClassIndex = 0;
  for(const classInModel of classesInModel) {
    if(!isSemanticModelClass(classInModel)) {
      continue;
    }
    await addEntityNeighborhoodToVisualModelAction(
      notificationMockup, classesContext, graph, diagram, visualModel, classInModel.id);
    const actualVisualNodesInModel = visualModel.getVisualEntitiesForRepresented(classInModel.id);
    expect(actualVisualNodesInModel.length).toBe(1);
    expect(isVisualNode(actualVisualNodesInModel[0])).toBeTruthy();
    expect((actualVisualNodesInModel[0] as VisualNode).representedEntity).toBe(classInModel.id);

    const visualEntities = [...visualModel.getVisualEntities().entries()];
    switch(currentClassIndex) {
    case 0:
      expect(visualEntities.map(entry => entry[1]).filter(isVisualNode).length).toBe(3);
      expect(visualEntities.map(entry => entry[1]).filter(isVisualRelationship).length).toBe(2);
      expect(visualEntities.length).toBe(5);
      break;
    case 1:
      expect(visualEntities.map(entry => entry[1]).filter(isVisualNode).length).toBe(4);
      expect(visualEntities.map(entry => entry[1]).filter(isVisualRelationship).length).toBe(3);
      expect(visualEntities.length).toBe(7);
      break;
    case 2:
      expect(visualEntities.length).toBe(8);
      break;
    case 3:
      expect(visualEntities.length).toBe(8);
      break;

    }
    currentClassIndex++;
  }
});

test("Test class neighborhood - fully connected graph on 4 nodes", async () => {
  const {
    classesContext,
    graph,
    models,
    visualModel,
  } = ActionsTestSuite.prepareModelsWithSemanticData(0, TestedSemanticConnectionType.Association);
  const diagram = ActionsTestSuite.createTestDiagram();
  const relevantModel = [...models.entries()][2][1];
  const classesInModel = Object.values(relevantModel.getEntities());

  let currentClassIndex = 0;
  for(const classInModel of classesInModel) {
    if(!isSemanticModelClass(classInModel)) {
      continue;
    }
    await addEntityNeighborhoodToVisualModelAction(
      notificationMockup, classesContext, graph, diagram, visualModel, classInModel.id);
    const actualVisualNodesInModel = visualModel.getVisualEntitiesForRepresented(classInModel.id);
    expect(actualVisualNodesInModel.length).toBe(1);
    expect(isVisualNode(actualVisualNodesInModel[0])).toBeTruthy();
    expect((actualVisualNodesInModel[0] as VisualNode).representedEntity).toBe(classInModel.id);

    const visualEntities = [...visualModel.getVisualEntities().entries()];
    switch(currentClassIndex) {
    case 0:
      expect(visualEntities.map(entry => entry[1]).filter(isVisualNode).length).toBe(4);
      expect(visualEntities.map(entry => entry[1]).filter(isVisualRelationship).length).toBe(3);
      expect(visualEntities.length).toBe(7);
      break;
    case 1:
      expect(visualEntities.map(entry => entry[1]).filter(isVisualNode).length).toBe(4);
      expect(visualEntities.map(entry => entry[1]).filter(isVisualRelationship).length).toBe(5);
      expect(visualEntities.length).toBe(9);
      break;
    case 2:
      expect(visualEntities.length).toBe(10);
      break;
    case 3:
      expect(visualEntities.length).toBe(10);
      break;
    }
    currentClassIndex++;
  }
});

test("Test relationship neighborhood - add one relationship multiple times - on fully connected graph on 4 nodes", async () => {
  const {
    classesContext,
    graph,
    models,
    visualModel,
  } = ActionsTestSuite.prepareModelsWithSemanticData(0, TestedSemanticConnectionType.Association);
  const diagram = ActionsTestSuite.createTestDiagram();
  const relevantModel = [...models.entries()][2][1];
  const relationshipsInModel = Object.values(relevantModel.getEntities())
    .filter(isSemanticModelRelationship);

  for (let i = 0; i < 2; i++) {
    const testedRelationship = relationshipsInModel[0];

    await addEntityNeighborhoodToVisualModelAction(
      notificationMockup, classesContext, graph, diagram, visualModel, testedRelationship.id);
    const visualEntities = [...visualModel.getVisualEntities().entries()];
    const nodes = visualEntities.map(entry => entry[1]).filter(isVisualNode);

    expect(nodes.length).toBe(2);
    expect(visualEntities.map(entry => entry[1]).filter(isVisualRelationship).length).toBe(1);
    const { domain, range } = getDomainAndRangeConcepts(testedRelationship);
    expect(nodes[0].representedEntity).toBe(domain);
    expect(nodes[1].representedEntity).toBe(range);
    expect(visualEntities.length).toBe(3);
  }
});

test("Test relationship neighborhood - add two relationships which are not sharing node - " +
  "on fully connected graph on 4 nodes", async () => {
  const {
    classesContext,
    graph,
    models,
    visualModel,
  } = ActionsTestSuite.prepareModelsWithSemanticData(0, TestedSemanticConnectionType.Association);
  const diagram = ActionsTestSuite.createTestDiagram();
  const relevantModel = [...models.entries()][2][1];
  const relationshipsInModel = Object.values(relevantModel.getEntities())
    .filter(isSemanticModelRelationship);

  const firstTestedRelationship = relationshipsInModel[0];

  await addEntityNeighborhoodToVisualModelAction(
    notificationMockup, classesContext, graph, diagram, visualModel, firstTestedRelationship.id);
  const firstVisualEntities = [...visualModel.getVisualEntities().entries()];
  const firstNodes = firstVisualEntities.map(entry => entry[1]).filter(isVisualNode);

  expect(firstNodes.length).toBe(2);
  expect(firstVisualEntities.map(entry => entry[1]).filter(isVisualRelationship).length).toBe(1);
  const { domain, range } = getDomainAndRangeConcepts(firstTestedRelationship);
  expect(firstNodes[0].representedEntity).toBe(domain);
  expect(firstNodes[1].representedEntity).toBe(range);
  expect(firstVisualEntities.length).toBe(3);
  // Second
  const secondTestedRelationship = relationshipsInModel[2];

  await addEntityNeighborhoodToVisualModelAction(
    notificationMockup, classesContext, graph, diagram, visualModel, secondTestedRelationship.id);
  const secondVisualEntities = [...visualModel.getVisualEntities().entries()];
  const secondNodes = secondVisualEntities.map(entry => entry[1]).filter(isVisualNode);

  expect(secondNodes.length).toBe(4);
  expect(secondVisualEntities.map(entry => entry[1]).filter(isVisualRelationship).length).toBe(2);
  const { domain: domainForSecond, range: rangeForSecond } = getDomainAndRangeConcepts(secondTestedRelationship);
  expect(secondNodes[2].representedEntity).toBe(domainForSecond);
  expect(secondNodes[3].representedEntity).toBe(rangeForSecond);
  expect(secondVisualEntities.length).toBe(6);
});

test("Test relationship neighborhood - add two relationships which are sharing node - " +
  "on fully connected graph on 4 nodes", async () => {
  const {
    classesContext,
    graph,
    models,
    visualModel,
  } = ActionsTestSuite.prepareModelsWithSemanticData(0, TestedSemanticConnectionType.Association);
  const diagram = ActionsTestSuite.createTestDiagram();
  const relevantModel = [...models.entries()][2][1];
  const relationshipsInModel = Object.values(relevantModel.getEntities())
    .filter(isSemanticModelRelationship);

  const firstTestedRelationship = relationshipsInModel[0];

  await addEntityNeighborhoodToVisualModelAction(
    notificationMockup, classesContext, graph, diagram, visualModel, firstTestedRelationship.id);
  const firstVisualEntities = [...visualModel.getVisualEntities().entries()];
  const firstNodes = firstVisualEntities.map(entry => entry[1]).filter(isVisualNode);

  expect(firstNodes.length).toBe(2);
  expect(firstVisualEntities.map(entry => entry[1]).filter(isVisualRelationship).length).toBe(1);
  const { domain, range } = getDomainAndRangeConcepts(firstTestedRelationship);
  expect(firstNodes[0].representedEntity).toBe(domain);
  expect(firstNodes[1].representedEntity).toBe(range);
  expect(firstVisualEntities.length).toBe(3);
  // Second
  const secondTestedRelationship = relationshipsInModel[1];

  await addEntityNeighborhoodToVisualModelAction(
    notificationMockup, classesContext, graph, diagram, visualModel, secondTestedRelationship.id);
  const secondVisualEntities = [...visualModel.getVisualEntities().entries()];
  const secondNodes = secondVisualEntities.map(entry => entry[1]).filter(isVisualNode);

  expect(secondNodes.length).toBe(3);
  expect(secondVisualEntities.map(entry => entry[1]).filter(isVisualRelationship).length).toBe(2);
  const { domain: domainForSecond, range: rangeForSecond } = getDomainAndRangeConcepts(secondTestedRelationship);
  expect(secondNodes[1].representedEntity).toBe(domainForSecond);
  expect(secondNodes[2].representedEntity).toBe(rangeForSecond);
  expect(secondVisualEntities.length).toBe(5);
});

test("Test relationship neighborhood - add attribute - on fully connected graph on 4 nodes", async () => {
  const {
    classesContext,
    graph,
    models,
    visualModel,
  } = ActionsTestSuite.prepareModelsWithSemanticData(0, TestedSemanticConnectionType.Association);
  const diagram = ActionsTestSuite.createTestDiagram();
  const relevantModel = [...models.entries()][2][1];
  const classesInModel = Object.values(relevantModel.getEntities())
    .filter(isSemanticModelClass);

  const domainClass = classesInModel[0];
  const createdAttribute = ActionsTestSuite.createSemanticAttributeTestVariant(
    classesContext, models, domainClass.id, relevantModel.getId(), "Test Attribute");

  await addEntityNeighborhoodToVisualModelAction(
    notificationMockup, classesContext, graph, diagram, visualModel, createdAttribute.identifier);

  const visualEntities = [...visualModel.getVisualEntities().entries()];
  const nodes = visualEntities.map(entry => entry[1]).filter(isVisualNode);
  const domainNode = nodes[0]

  expect(nodes.length).toBe(1);
  expect(domainNode.content.length).toBe(1);
  expect(visualEntities.length).toBe(1);
  // See what happens if the node is visible, but without the attribute
  visualModel.updateVisualEntity(domainNode.identifier, { content: [] });
  expect((visualModel.getVisualEntity(domainNode.identifier) as VisualNode).content.length).toBe(0);    // Sanity check
  await addEntityNeighborhoodToVisualModelAction(
    notificationMockup, classesContext, graph, diagram, visualModel, createdAttribute.identifier);
  expect([...visualModel.getVisualEntities().entries()].length).toBe(1);
  expect(visualEntities.map(entry => entry[1]).filter(isVisualNode)[0].content.length).toBe(1);
  expect(domainNode.content.length).toBe(1);
});
