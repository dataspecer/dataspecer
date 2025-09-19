/**
 * Tests
 * {@link removeAttributesFromVisualModelAction} and
 * {@link addSemanticAttributeToVisualModelAction} as side-effect
 */

import { expect, test } from "vitest";
import { VisualNode } from "@dataspecer/visual-model";
import { SemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import { ActionsTestSuite, notificationMockup, TestedSemanticConnectionType } from "./test/actions-test-suite";
import { addSemanticAttributeToVisualModelAction } from "./add-semantic-attribute-to-visual-model";
import { removeAttributesFromVisualModelAction } from "./remove-attributes-from-visual-model";
import { addSemanticAttributeToVisualNodeAction } from "./add-semantic-attribute-to-visual-node";

test("Test change attribute - Visibility", () => {
  const {
    classesContext,
    visualModel,
    models,
    firstModel,
  } = ActionsTestSuite.prepareModelsWithSemanticData(
    4, TestedSemanticConnectionType.Association);
  const newAttributes = [];
  //
  newAttributes.push(ActionsTestSuite.createSemanticAttributeTestVariant(
    classesContext, models, "0", firstModel.getId(), "attribute-0"));
  addSemanticAttributeToVisualModelAction(notificationMockup, visualModel, "0", newAttributes[0].identifier, true);
  expect((visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode).content.length).toEqual(1);
  //
  newAttributes.push(ActionsTestSuite.createSemanticAttributeTestVariant(
    classesContext, models, "0", firstModel.getId(), "attribute-1"));
  addSemanticAttributeToVisualModelAction(notificationMockup, visualModel, "0", newAttributes[1].identifier, true);
  expect((visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode).content.length).toEqual(2);
  //
  const attributeAsEntity = Object.values(firstModel.getEntities())[0] as SemanticModelRelationship;
  classesContext.relationships.push(attributeAsEntity);
  removeAttributesFromVisualModelAction(
    notificationMockup, classesContext, visualModel, [newAttributes[0].identifier]);
  expect((visualModel.getVisualEntitiesForRepresented("0")![0] as VisualNode).content.length).toEqual(1);
  expect((visualModel.getVisualEntitiesForRepresented("0")![0] as VisualNode).content[0])
    .toEqual(newAttributes[1].identifier);
});

test("Test change attribute - Visibility - order", () => {
  const {
    classesContext,
    visualModel,
    models,
    firstModel
  } = ActionsTestSuite.prepareModelsWithSemanticData(
    4, TestedSemanticConnectionType.Association);
  const newAttributes = [];
  //
  newAttributes.push(ActionsTestSuite.createSemanticAttributeTestVariant(
    classesContext, models, "0", firstModel.getId(), "attribute-0"));
  addSemanticAttributeToVisualNodeAction(
    notificationMockup, visualModel,
    visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode,
    newAttributes[0].identifier, 0, true);
  //
  expect((visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode).content.length).toEqual(1);
  newAttributes.push(ActionsTestSuite.createSemanticAttributeTestVariant(
    classesContext, models, "0", firstModel.getId(), "attribute-1"));
  addSemanticAttributeToVisualNodeAction(
    notificationMockup, visualModel,
      visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode,
      newAttributes[1].identifier, 0, true);
  //
  expect((visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode).content.length).toEqual(2);
  expect((visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode).content[0])
    .toEqual(newAttributes[1].identifier);
  expect((visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode).content[1])
    .toEqual(newAttributes[0].identifier);
  //
  newAttributes.push(ActionsTestSuite.createSemanticAttributeTestVariant(
    classesContext, models, "0", firstModel.getId(), "attribute-3"));
  addSemanticAttributeToVisualNodeAction(
    notificationMockup, visualModel,
      visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode,
      newAttributes[2].identifier, 1, true);
  expect((visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode).content.length).toEqual(3);

  expect((visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode).content[0])
    .toEqual(newAttributes[1].identifier);
  expect((visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode).content[1])
    .toEqual(newAttributes[2].identifier);
  expect((visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode).content[2])
    .toEqual(newAttributes[0].identifier);
});

test("Test change attribute - Visibility - back to back", () => {
  const {
    classesContext,
    visualModel,
    models,
    firstModel
  } = ActionsTestSuite.prepareModelsWithSemanticData(
    4, TestedSemanticConnectionType.Association);
  const newAttributes = [];
  //
  newAttributes.push(ActionsTestSuite.createSemanticAttributeTestVariant(
    classesContext, models, "0", firstModel.getId(), "attribute-0"));
  addSemanticAttributeToVisualModelAction(
    notificationMockup, visualModel, "0", newAttributes[0].identifier, true);
  expect((visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode).content.length).toEqual(1);
  //
  newAttributes.push(ActionsTestSuite.createSemanticAttributeTestVariant(
    classesContext, models, "0", firstModel.getId(), "attribute-1"));
  addSemanticAttributeToVisualModelAction(notificationMockup, visualModel, "0", newAttributes[1].identifier, true);
  expect((visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode).content.length).toEqual(2);

  //

  const attributeAsEntity = Object.values(firstModel.getEntities())[0] as SemanticModelRelationship;
  classesContext.relationships.push(attributeAsEntity);
  removeAttributesFromVisualModelAction(
    notificationMockup, classesContext, visualModel, [newAttributes[0].identifier]);
  expect((visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode).content.length).toEqual(1);
  expect((visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode).content[0])
    .toEqual(newAttributes[1].identifier);
  //
  addSemanticAttributeToVisualModelAction(notificationMockup, visualModel, "0", newAttributes[0].identifier, true);
  expect((visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode).content.length).toEqual(2);
  expect((visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode).content[0])
    .toEqual(newAttributes[1].identifier);
  expect((visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode).content[1])
    .toEqual(newAttributes[0].identifier);
});
