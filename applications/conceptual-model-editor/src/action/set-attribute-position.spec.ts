/**
 * Tests {@link setAttributePositionAction}
 */

import { expect, test } from "vitest";
import { VisualNode } from "@dataspecer/visual-model";
import { addSemanticAttributeToVisualModelAction } from "./add-semantic-attribute-to-visual-model";
import { ActionsTestSuite, notificationMockup, TestedSemanticConnectionType } from "./test/actions-test-suite";
import { setAttributePositionAction } from "./set-attribute-position";
import { addSemanticAttributeToVisualNodeAction } from "./add-semantic-attribute-to-visual-node";

//

test("Test change attribute order - one", () => {
  const {
    visualModel,
    models,
    classesContext,
    firstModel
  } = ActionsTestSuite.prepareModelsWithSemanticData(
    4, TestedSemanticConnectionType.Association);
  const expectedAttributeCount = 5;
  const attributes: string[] = [];
  for(let i = 0; i < expectedAttributeCount; i++) {
    const newAttribute = ActionsTestSuite.createSemanticAttributeTestVariant(
      classesContext, models, "0", firstModel.getId(), `attribute-${i}`);
    addSemanticAttributeToVisualModelAction(notificationMockup, visualModel, "0", newAttribute.identifier, true);
    attributes.push(newAttribute.identifier);
  }
  expect((visualModel.getVisualEntitiesForRepresented("0")![0] as VisualNode).content.length)
    .toEqual(expectedAttributeCount);
  for(let i = 0; i < expectedAttributeCount; i++) {
    expect((visualModel.getVisualEntitiesForRepresented("0")![0] as VisualNode).content[i]).toBe(attributes[i]);
  }

  setAttributePositionAction(
    notificationMockup,
    visualModel,
    visualModel.getVisualEntitiesForRepresented("0")![0]!.identifier,
    attributes[2],
    4,
  );

  const resultContent =(visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode).content;
  expect(resultContent[0]).toBe(attributes[0]);
  expect(resultContent[1]).toBe(attributes[1]);
  expect(resultContent[2]).toBe(attributes[3]);
  expect(resultContent[3]).toBe(attributes[4]);
  expect(resultContent[4]).toBe(attributes[2]);
});

test("Test change attribute order - one - test 2", () => {
  const {
    visualModel,
    models,
    classesContext,
    firstModel
  } = ActionsTestSuite.prepareModelsWithSemanticData(
    4, TestedSemanticConnectionType.Association);
  const expectedAttributeCount = 6;
  const attributes: string[] = [];
  for(let i = 0; i < expectedAttributeCount; i++) {
    const newAttribute = ActionsTestSuite.createSemanticAttributeTestVariant(
      classesContext, models, "0", firstModel.getId(), `attribute-${i}`);
    addSemanticAttributeToVisualModelAction(
      notificationMockup, visualModel, "0", newAttribute.identifier, true);
    attributes.push(newAttribute.identifier);
  }
  expect((visualModel.getVisualEntitiesForRepresented("0")![0] as VisualNode).content.length)
    .toEqual(expectedAttributeCount);
  for(let i = 0; i < expectedAttributeCount; i++) {
    expect((visualModel.getVisualEntitiesForRepresented("0")![0] as VisualNode).content[i]).toBe(attributes[i]);
  }

  setAttributePositionAction(
    notificationMockup,
    visualModel,
    visualModel.getVisualEntitiesForRepresented("0")![0]!.identifier,
    attributes[4],
    2,
  );

  const resultContent = (visualModel.getVisualEntitiesForRepresented("0")![0] as VisualNode).content;
  expect(resultContent[0]).toBe(attributes[0]);
  expect(resultContent[1]).toBe(attributes[1]);
  expect(resultContent[2]).toBe(attributes[4]);
  expect(resultContent[3]).toBe(attributes[2]);
  expect(resultContent[4]).toBe(attributes[3]);
  expect(resultContent[5]).toBe(attributes[5]);
});

test("Test change attribute order - back to back", () => {
  const {
    visualModel,
    models,
    classesContext,
    firstModel
  } = ActionsTestSuite.prepareModelsWithSemanticData(
    4, TestedSemanticConnectionType.Association);
  const expectedAttributeCount = 5;
  const attributes: string[] = [];
  //
  for(let i = 0; i < expectedAttributeCount; i++) {
    const newAttribute = ActionsTestSuite.createSemanticAttributeTestVariant(
      classesContext, models, "0", firstModel.getId(), `attribute-${i}`);
    addSemanticAttributeToVisualModelAction(notificationMockup, visualModel, "0", newAttribute.identifier, true);
    attributes.push(newAttribute.identifier);
  }
  expect((visualModel.getVisualEntitiesForRepresented("0")![0] as VisualNode).content.length)
    .toEqual(expectedAttributeCount);
  for(let i = 0; i < expectedAttributeCount; i++) {
    expect((visualModel.getVisualEntitiesForRepresented("0")![0] as VisualNode).content[i]).toBe(attributes[i]);
  }
  //
  setAttributePositionAction(
    notificationMockup,
    visualModel,
    visualModel.getVisualEntitiesForRepresented("0")![0]!.identifier,
    attributes[2],
    4,
  );

  let resultContent = (visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode).content;
  expect(resultContent[0]).toBe(attributes[0]);
  expect(resultContent[1]).toBe(attributes[1]);
  expect(resultContent[2]).toBe(attributes[3]);
  expect(resultContent[3]).toBe(attributes[4]);
  expect(resultContent[4]).toBe(attributes[2]);

  // Now back
  setAttributePositionAction(
    notificationMockup,
    visualModel,
    visualModel.getVisualEntitiesForRepresented("0")![0]!.identifier,
    attributes[2],
    2);

  resultContent = (visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode).content;
  expect(resultContent[0]).toBe(attributes[0]);
  expect(resultContent[1]).toBe(attributes[1]);
  expect(resultContent[2]).toBe(attributes[2]);
  expect(resultContent[3]).toBe(attributes[3]);
  expect(resultContent[4]).toBe(attributes[4]);
});

test("Test change attribute order - change multi", () => {
  const {
    visualModel,
    models,
    classesContext,
    firstModel
  } = ActionsTestSuite.prepareModelsWithSemanticData(
    4, TestedSemanticConnectionType.Association);
  const expectedAttributeCount = 6;
  const attributes: string[] = [];
  //
  for(let i = 0; i < expectedAttributeCount; i++) {
    const newAttribute = ActionsTestSuite.createSemanticAttributeTestVariant(
      classesContext, models, "0", firstModel.getId(), `attribute-${i}`);
    addSemanticAttributeToVisualModelAction(notificationMockup, visualModel, "0", newAttribute.identifier, true);
    attributes.push(newAttribute.identifier);
  }
  expect((visualModel.getVisualEntitiesForRepresented("0")![0] as VisualNode).content.length)
    .toEqual(expectedAttributeCount);
  for(let i = 0; i < expectedAttributeCount; i++) {
    expect((visualModel.getVisualEntitiesForRepresented("0")![0] as VisualNode).content[i]).toBe(attributes[i]);
  }
  //
  setAttributePositionAction(
    notificationMockup,
    visualModel,
    visualModel.getVisualEntitiesForRepresented("0")![0]!.identifier,
    attributes[2],
    4,
  );

  let resultContent = (visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode).content;
  expect(resultContent[0]).toBe(attributes[0]);
  expect(resultContent[1]).toBe(attributes[1]);
  expect(resultContent[2]).toBe(attributes[3]);
  expect(resultContent[3]).toBe(attributes[4]);
  expect(resultContent[4]).toBe(attributes[2]);
  expect(resultContent[5]).toBe(attributes[5]);
  //
  setAttributePositionAction(
    notificationMockup,
    visualModel,
  visualModel.getVisualEntitiesForRepresented("0")![0]!.identifier,
  attributes[5],
  1);

  resultContent = (visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode).content;
  expect(resultContent[0]).toBe(attributes[0]);
  expect(resultContent[1]).toBe(attributes[5]);
  expect(resultContent[2]).toBe(attributes[1]);
  expect(resultContent[3]).toBe(attributes[3]);
  expect(resultContent[4]).toBe(attributes[4]);
  expect(resultContent[5]).toBe(attributes[2]);
});

test("Test change attribute order - change multi - attribute profile", () => {
  const {
    visualModel,
    models,
    classesContext,
    firstModel
  } = ActionsTestSuite.prepareModelsWithSemanticData(
    4, TestedSemanticConnectionType.Association);
  const expectedAttributeCount = 6;
  const attributes: string[] = [];
  let firstVisualNode = visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode;
  //
  const originalAttribute = ActionsTestSuite.createSemanticAttributeTestVariant(
    classesContext, models, "0", firstModel.getId(), "attribute-0");
  addSemanticAttributeToVisualNodeAction(
    notificationMockup, visualModel, firstVisualNode, originalAttribute.identifier, null, true);
  attributes.push(originalAttribute.identifier);
  for(let i = 1; i < expectedAttributeCount; i++) {
    firstVisualNode = visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode;
    const newAttributeProfile = ActionsTestSuite.createSemanticAttributeProfileTestVariant(
      classesContext, models, originalAttribute.identifier, "0", firstModel.getId());
    addSemanticAttributeToVisualNodeAction(
      notificationMockup, visualModel, firstVisualNode, newAttributeProfile.identifier, null, true);
    attributes.push(newAttributeProfile.identifier);
  }

  const actualNode = visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode;
  expect(actualNode.content.length).toEqual(expectedAttributeCount);
  for(let i = 0; i < expectedAttributeCount; i++) {
    expect(actualNode.content[i]).toBe(attributes[i]);
  }
  //
  setAttributePositionAction(
    notificationMockup,
    visualModel,
    visualModel.getVisualEntitiesForRepresented("0")[0].identifier,
    attributes[2],
    4);

  let actualContent = (visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode).content;
  expect(actualContent[0]).toBe(attributes[0]);
  expect(actualContent[1]).toBe(attributes[1]);
  expect(actualContent[2]).toBe(attributes[3]);
  expect(actualContent[3]).toBe(attributes[4]);
  expect(actualContent[4]).toBe(attributes[2]);
  expect(actualContent[5]).toBe(attributes[5]);
  //
  setAttributePositionAction(
    notificationMockup,
    visualModel,
    visualModel.getVisualEntitiesForRepresented("0")[0].identifier,
    attributes[5],
    1);

  actualContent = (visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode).content;
  expect(actualContent[0]).toBe(attributes[0]);
  expect(actualContent[1]).toBe(attributes[5]);
  expect(actualContent[2]).toBe(attributes[1]);
  expect(actualContent[3]).toBe(attributes[3]);
  expect(actualContent[4]).toBe(attributes[4]);
  expect(actualContent[5]).toBe(attributes[2]);
});
