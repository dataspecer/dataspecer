/**
 * Tests {@link removeFromVisualModelAction} and interaction with {@link createNodeDuplicateAction}.
 */

import { expect, test } from "vitest";
import { ActionsTestExportedTypesAndEnums, ActionsTestSuite, notificationMockup } from "./actions-test-suite";
import { removeFromVisualModelByVisualAction } from "../remove-from-visual-model-by-visual";
import { removeFromVisualModelByRepresentedAction } from "../remove-from-visual-model-by-represented";
import { createVisualNodeDuplicateAction } from "../create-visual-node-duplicate";

test("Remove relationship - visual id", () => {
  const {
    visualModel,
    firstModel
  } = ActionsTestSuite.prepareModelsWithSemanticData(
    4, ActionsTestExportedTypesAndEnums.TestedSemanticConnectionType.Association);

  const visualRelationship = ActionsTestSuite.createNewVisualRelationshipsForTestingFromSemanticEnds(
    visualModel, firstModel.getId(), "0", "1");
  expect(visualModel.getVisualEntity(visualRelationship)).not.toBeNull();
  //
  removeFromVisualModelByVisualAction(notificationMockup, visualModel, [visualRelationship]);
  expect(visualModel.getVisualEntity(visualRelationship)).toBeNull();
  expect(visualModel.getVisualEntitiesForRepresented("0").length).toBe(1);
  expect(visualModel.getVisualEntitiesForRepresented("1").length).toBe(1);
  expect(visualModel.getVisualEntitiesForRepresented("2").length).toBe(1);
  expect(visualModel.getVisualEntitiesForRepresented("3").length).toBe(1);
});

test("Remove relationship - semantic id", () => {
  const {
    visualModel,
    firstModel
  } = ActionsTestSuite.prepareModelsWithSemanticData(
    4, ActionsTestExportedTypesAndEnums.TestedSemanticConnectionType.Association);

  const visualRelationship = ActionsTestSuite.createNewVisualRelationshipsForTestingFromSemanticEnds(
    visualModel, firstModel.getId(), "0", "1", "relationshipSemanticIdentifier");
  expect(visualModel.getVisualEntity(visualRelationship)).not.toBeNull();
  //
  removeFromVisualModelByRepresentedAction(notificationMockup, visualModel, ["relationshipSemanticIdentifier"]);
  expect(visualModel.getVisualEntity(visualRelationship)).toBeNull();
  expect(visualModel.getVisualEntitiesForRepresented("0").length).toBe(1);
  expect(visualModel.getVisualEntitiesForRepresented("1").length).toBe(1);
  expect(visualModel.getVisualEntitiesForRepresented("2").length).toBe(1);
  expect(visualModel.getVisualEntitiesForRepresented("3").length).toBe(1);
});

test("Remove relationship end - visual id", () => {
  const {
    visualModel,
    firstModel
  } = ActionsTestSuite.prepareModelsWithSemanticData(
    4, ActionsTestExportedTypesAndEnums.TestedSemanticConnectionType.Association);

  const nodeToRemove = visualModel.getVisualEntitiesForRepresented("0")[0];
  const visualRelationship = ActionsTestSuite.createNewVisualRelationshipsForTestingFromSemanticEnds(
    visualModel, firstModel.getId(), "0", "1");
  expect(visualModel.getVisualEntity(visualRelationship)).not.toBeNull();
  //
  removeFromVisualModelByVisualAction(notificationMockup, visualModel, [nodeToRemove.identifier]);
  expect(visualModel.getVisualEntity(visualRelationship)).toBeNull();
  expect(visualModel.getVisualEntitiesForRepresented("0").length).toBe(0);
  expect(visualModel.getVisualEntity(nodeToRemove.identifier)).toBeNull();
  expect(visualModel.getVisualEntitiesForRepresented("1").length).toBe(1);
  expect(visualModel.getVisualEntitiesForRepresented("2").length).toBe(1);
  expect(visualModel.getVisualEntitiesForRepresented("3").length).toBe(1);
});

test("Remove relationship end - semantic id", () => {
  const {
    visualModel,
    firstModel
  } = ActionsTestSuite.prepareModelsWithSemanticData(
    4, ActionsTestExportedTypesAndEnums.TestedSemanticConnectionType.Association);

  const nodeToRemove = visualModel.getVisualEntitiesForRepresented("0")[0];
  const visualRelationship = ActionsTestSuite.createNewVisualRelationshipsForTestingFromSemanticEnds(
    visualModel, firstModel.getId(), "0", "1");
  expect(visualModel.getVisualEntity(visualRelationship)).not.toBeNull();
  //
  removeFromVisualModelByRepresentedAction(notificationMockup, visualModel, ["0"]);
  expect(visualModel.getVisualEntity(visualRelationship)).toBeNull();
  expect(visualModel.getVisualEntitiesForRepresented("0").length).toBe(0);
  expect(visualModel.getVisualEntity(nodeToRemove.identifier)).toBeNull();
  expect(visualModel.getVisualEntitiesForRepresented("1").length).toBe(1);
  expect(visualModel.getVisualEntitiesForRepresented("2").length).toBe(1);
  expect(visualModel.getVisualEntitiesForRepresented("3").length).toBe(1);
});

test("Remove relationship ends at the same time - visual ids", () => {
  const {
    visualModel,
    firstModel
  } = ActionsTestSuite.prepareModelsWithSemanticData(
    4, ActionsTestExportedTypesAndEnums.TestedSemanticConnectionType.Association);

  const sourceNodeToRemove = visualModel.getVisualEntitiesForRepresented("0")[0];
  const targetNodeToRemove = visualModel.getVisualEntitiesForRepresented("1")[0];
  const visualRelationship = ActionsTestSuite.createNewVisualRelationshipsForTestingFromSemanticEnds(
    visualModel, firstModel.getId(), "0", "1");
  expect(visualModel.getVisualEntity(visualRelationship)).not.toBeNull();
  //
  removeFromVisualModelByVisualAction(notificationMockup, visualModel, [sourceNodeToRemove.identifier, targetNodeToRemove.identifier]);
  expect(visualModel.getVisualEntity(visualRelationship)).toBeNull();
  expect(visualModel.getVisualEntitiesForRepresented("0").length).toBe(0);
  expect(visualModel.getVisualEntity(sourceNodeToRemove.identifier)).toBeNull();
  expect(visualModel.getVisualEntity(targetNodeToRemove.identifier)).toBeNull();
  expect(visualModel.getVisualEntitiesForRepresented("1").length).toBe(0);
  expect(visualModel.getVisualEntitiesForRepresented("2").length).toBe(1);
  expect(visualModel.getVisualEntitiesForRepresented("3").length).toBe(1);
});

test("Remove relationship ends at the same time - semantic ids", () => {
  const {
    visualModel,
    firstModel
  } = ActionsTestSuite.prepareModelsWithSemanticData(
    4, ActionsTestExportedTypesAndEnums.TestedSemanticConnectionType.Association);

  const sourceNodeToRemove = visualModel.getVisualEntitiesForRepresented("0")[0];
  const targetNodeToRemove = visualModel.getVisualEntitiesForRepresented("1")[0];
  const visualRelationship = ActionsTestSuite.createNewVisualRelationshipsForTestingFromSemanticEnds(
    visualModel, firstModel.getId(), "0", "1");
  expect(visualModel.getVisualEntity(visualRelationship)).not.toBeNull();
  //
  removeFromVisualModelByRepresentedAction(notificationMockup, visualModel, ["0", "1"]);
  expect(visualModel.getVisualEntity(visualRelationship)).toBeNull();
  expect(visualModel.getVisualEntitiesForRepresented("0").length).toBe(0);
  expect(visualModel.getVisualEntity(sourceNodeToRemove.identifier)).toBeNull();
  expect(visualModel.getVisualEntity(targetNodeToRemove.identifier)).toBeNull();
  expect(visualModel.getVisualEntitiesForRepresented("1").length).toBe(0);
  expect(visualModel.getVisualEntitiesForRepresented("2").length).toBe(1);
  expect(visualModel.getVisualEntitiesForRepresented("3").length).toBe(1);
});

test("Remove ends and the relationship - visual identifiers", () => {
  const {
    visualModel,
    firstModel
  } = ActionsTestSuite.prepareModelsWithSemanticData(
    4, ActionsTestExportedTypesAndEnums.TestedSemanticConnectionType.Association);

  const sourceNodeToRemove = visualModel.getVisualEntitiesForRepresented("0")[0];
  const targetNodeToRemove = visualModel.getVisualEntitiesForRepresented("1")[0];
  const visualRelationship = ActionsTestSuite.createNewVisualRelationshipsForTestingFromSemanticEnds(
    visualModel, firstModel.getId(), "0", "1", "relationshipId");
  expect(visualModel.getVisualEntity(visualRelationship)).not.toBeNull();
  expect(visualModel.getVisualEntitiesForRepresented("relationshipId").length).toBe(1);
  //
  removeFromVisualModelByVisualAction(
    notificationMockup, visualModel,
    [sourceNodeToRemove.identifier, visualRelationship, targetNodeToRemove.identifier]);
  expect(visualModel.getVisualEntity(visualRelationship)).toBeNull();
  expect(visualModel.getVisualEntitiesForRepresented("relationshipId").length).toBe(0);
  expect(visualModel.getVisualEntitiesForRepresented("0").length).toBe(0);
  expect(visualModel.getVisualEntity(sourceNodeToRemove.identifier)).toBeNull();
  expect(visualModel.getVisualEntity(targetNodeToRemove.identifier)).toBeNull();
  expect(visualModel.getVisualEntitiesForRepresented("1").length).toBe(0);
  expect(visualModel.getVisualEntitiesForRepresented("2").length).toBe(1);
  expect(visualModel.getVisualEntitiesForRepresented("3").length).toBe(1);
});

test("Remove ends and the relationship - semantic identifiers", () => {
  const {
    visualModel,
    firstModel
  } = ActionsTestSuite.prepareModelsWithSemanticData(
    4, ActionsTestExportedTypesAndEnums.TestedSemanticConnectionType.Association);

  const sourceNodeToRemove = visualModel.getVisualEntitiesForRepresented("0")[0];
  const targetNodeToRemove = visualModel.getVisualEntitiesForRepresented("1")[0];
  const visualRelationship = ActionsTestSuite.createNewVisualRelationshipsForTestingFromSemanticEnds(
    visualModel, firstModel.getId(), "0", "1", "relationshipId");
  expect(visualModel.getVisualEntity(visualRelationship)).not.toBeNull();
  expect(visualModel.getVisualEntitiesForRepresented("relationshipId").length).toBe(1);
  removeFromVisualModelByRepresentedAction(notificationMockup, visualModel, ["0", "1", "relationshipId"]);
  expect(visualModel.getVisualEntity(visualRelationship)).toBeNull();
  expect(visualModel.getVisualEntitiesForRepresented("relationshipId").length).toBe(0);
  expect(visualModel.getVisualEntitiesForRepresented("0").length).toBe(0);
  expect(visualModel.getVisualEntity(sourceNodeToRemove.identifier)).toBeNull();
  expect(visualModel.getVisualEntity(targetNodeToRemove.identifier)).toBeNull();
  expect(visualModel.getVisualEntitiesForRepresented("1").length).toBe(0);
  expect(visualModel.getVisualEntitiesForRepresented("2").length).toBe(1);
  expect(visualModel.getVisualEntitiesForRepresented("3").length).toBe(1);
});

test("Remove end of many edges", () => {
  const {
    visualModel,
    firstModel
  } = ActionsTestSuite.prepareModelsWithSemanticData(
    4, ActionsTestExportedTypesAndEnums.TestedSemanticConnectionType.Association);

    ActionsTestSuite.createNewVisualRelationshipsForTestingFromSemanticEnds(
      visualModel, firstModel.getId(), "0", "1", "relationshipId1");
  ActionsTestSuite.createNewVisualRelationshipsForTestingFromSemanticEnds(
    visualModel, firstModel.getId(), "1", "2", "relationshipId2");
  expect(visualModel.getVisualEntitiesForRepresented("relationshipId1").length).toBe(1);
  expect(visualModel.getVisualEntitiesForRepresented("relationshipId2").length).toBe(1);
  //
  removeFromVisualModelByRepresentedAction(notificationMockup, visualModel, ["1"]);
  expect(visualModel.getVisualEntitiesForRepresented("relationshipId1").length).toBe(0);
  expect(visualModel.getVisualEntitiesForRepresented("relationshipId2").length).toBe(0);
  expect(visualModel.getVisualEntitiesForRepresented("0").length).toBe(1);
  expect(visualModel.getVisualEntitiesForRepresented("1").length).toBe(0);
  expect(visualModel.getVisualEntitiesForRepresented("2").length).toBe(1);
  expect(visualModel.getVisualEntitiesForRepresented("3").length).toBe(1);
});

test("Remove node duplicate - semantic identifiers", () => {
  const {
    visualModel,
    firstModel
  } = ActionsTestSuite.prepareModelsWithSemanticData(
    4, ActionsTestExportedTypesAndEnums.TestedSemanticConnectionType.Association);

  const testDiagram = ActionsTestSuite.createTestDiagram();


  ActionsTestSuite.createNewVisualRelationshipsForTestingFromSemanticEnds(
    visualModel, firstModel.getId(), "0", "1", "relationshipId");
  const nodeToDuplicate = visualModel.getVisualEntitiesForRepresented("0")[0];
  createVisualNodeDuplicateAction(notificationMockup, testDiagram, visualModel, nodeToDuplicate.identifier);
  expect(visualModel.getVisualEntitiesForRepresented("relationshipId").length).toBe(2);
  expect(visualModel.getVisualEntitiesForRepresented("0").length).toBe(2);
  //
  removeFromVisualModelByRepresentedAction(notificationMockup, visualModel, ["0"]);
  expect(visualModel.getVisualEntitiesForRepresented("relationshipId").length).toBe(0);
  expect(visualModel.getVisualEntitiesForRepresented("0").length).toBe(0);
  expect(visualModel.getVisualEntitiesForRepresented("1").length).toBe(1);
  expect(visualModel.getVisualEntitiesForRepresented("2").length).toBe(1);
  expect(visualModel.getVisualEntitiesForRepresented("3").length).toBe(1);
});

test("Remove node duplicate - visual identifiers", () => {
  const {
    visualModel,
    firstModel,
  } = ActionsTestSuite.prepareModelsWithSemanticData(
    4, ActionsTestExportedTypesAndEnums.TestedSemanticConnectionType.Association);

  const testDiagram = ActionsTestSuite.createTestDiagram();

  ActionsTestSuite.createNewVisualRelationshipsForTestingFromSemanticEnds(
    visualModel, firstModel.getId(), "0", "1", "relationshipId");
  const nodeToDuplicate = visualModel.getVisualEntitiesForRepresented("0")[0];
  createVisualNodeDuplicateAction(notificationMockup, testDiagram, visualModel, nodeToDuplicate.identifier);
  expect(visualModel.getVisualEntitiesForRepresented("relationshipId").length).toBe(2);
  expect(visualModel.getVisualEntitiesForRepresented("0").length).toBe(2);
  //
  removeFromVisualModelByVisualAction(notificationMockup, visualModel, [nodeToDuplicate.identifier]);
  expect(visualModel.getVisualEntitiesForRepresented("relationshipId").length).toBe(1);
  expect(visualModel.getVisualEntitiesForRepresented("0").length).toBe(1);
  expect(visualModel.getVisualEntitiesForRepresented("1").length).toBe(1);
  expect(visualModel.getVisualEntitiesForRepresented("2").length).toBe(1);
  expect(visualModel.getVisualEntitiesForRepresented("3").length).toBe(1);
});
