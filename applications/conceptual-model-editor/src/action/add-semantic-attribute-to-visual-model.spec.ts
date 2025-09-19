/**
 * Simple test(s) for {@link addSemanticAttributeToVisualNodeAction}.
 * More tests are for example in {@link removeAttributesFromVisualModelAction} as a side-effect,
 * because we have to add attributes into visual model and
 * simulating the behavior in test environment is not worth the extra hassle.
 */

import { expect, test } from "vitest";
import { VisualNode } from "@dataspecer/visual-model";
import { ActionsTestSuite, notificationMockup, TestedSemanticConnectionType } from "./test/actions-test-suite";
import { addSemanticAttributeToVisualNodeAction } from "./add-semantic-attribute-to-visual-node";

test("Test addSemanticAttributeToVisualNodeAction by adding multiple attributes", () => {
  const {
    visualModel,
    models,
    classesContext,
    firstModel
  } = ActionsTestSuite.prepareModelsWithSemanticData(
    4, TestedSemanticConnectionType.Association);
  const newAttributes = [];
  const modelIdentifer = firstModel.getId();
  //
  let visualNode = visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode;

  newAttributes.push(ActionsTestSuite.createSemanticAttributeTestVariant(
    classesContext, models, "0", modelIdentifer, "attribute-0"));
  addSemanticAttributeToVisualNodeAction(
    notificationMockup, visualModel, visualNode, newAttributes[0].identifier, null, true);
  visualNode = visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode;
  expect(visualNode.content.length).toEqual(1);
  //
  newAttributes.push(ActionsTestSuite.createSemanticAttributeTestVariant(
    classesContext, models, "0", modelIdentifer, "attribute-1"));
  addSemanticAttributeToVisualNodeAction(
    notificationMockup, visualModel, visualNode, newAttributes[1].identifier, null, true);
  visualNode = visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode;
  expect(visualNode.content).toEqual(newAttributes.map(attribute => attribute.identifier));
  //
  newAttributes.push(ActionsTestSuite.createSemanticAttributeTestVariant(
    classesContext, models, "0", modelIdentifer, "attribute-2"));
  addSemanticAttributeToVisualNodeAction(
    notificationMockup, visualModel, visualNode, newAttributes[2].identifier, 1, true);
  visualNode = visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode;
  expect(visualNode.content[0]).toBe(newAttributes[0].identifier);
  expect(visualNode.content[1]).toBe(newAttributes[2].identifier);
  expect(visualNode.content[2]).toBe(newAttributes[1].identifier);
  //
  newAttributes.push(ActionsTestSuite.createSemanticAttributeTestVariant(
    classesContext, models, "0", modelIdentifer, "attribute-3"));
  addSemanticAttributeToVisualNodeAction(
    notificationMockup, visualModel, visualNode, newAttributes[3].identifier, 2, true);
  visualNode = visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode;
  expect(visualNode.content[0]).toBe(newAttributes[0].identifier);
  expect(visualNode.content[1]).toBe(newAttributes[2].identifier);
  expect(visualNode.content[2]).toBe(newAttributes[3].identifier);
  expect(visualNode.content[3]).toBe(newAttributes[1].identifier);
});
