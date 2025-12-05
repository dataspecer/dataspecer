/**
 * Tets {@link shiftAttributePositionAction} and {@link addSemanticAttributeToVisualModelAction} as side-effect.
 */

import { expect, test } from "vitest";
import { createDefaultVisualModelFactory, VisualNode, WritableVisualModel } from "@dataspecer/visual-model";
import { EntityModel } from "@dataspecer/core-v2";
import { semanticModelMapToCmeSemanticModel } from "../dataspecer/cme-model/adapter";
import { CreatedEntityOperationResult, createRelationship } from "@dataspecer/core-v2/semantic-model/operations";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { representRdfsLiteral } from "../dialog/utilities/dialog-utilities";
import { ShiftAttributeDirection, shiftAttributePositionAction } from "./shift-attribute";
import { notificationMockup } from "./test/actions-test-suite";
import { addSemanticAttributeToVisualModelAction } from "./add-semantic-attribute-to-visual-model";

test("Test shift attribute - up and down", () => {
  const {
    visualModel,
    models,
    cmeModels
  } = prepareModelWithFourNodes();
  const newAttributes = [];
  //
  for(let i = 0; i < 3; i++) {
    const createdAttributeData = createSemanticAttributeTestVariant(
      models, `${i}`, cmeModels[0].identifier, `attribute-${i}`);
    newAttributes.push(createdAttributeData);
    addSemanticAttributeToVisualModelAction(
      notificationMockup, visualModel, "0", createdAttributeData.identifier, false);
  }
  let nodeWithAttributes = visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode;
  expect(nodeWithAttributes.content).toEqual(newAttributes.map(attribute => attribute.identifier));
  //
  shiftAttributePositionAction(
    notificationMockup, visualModel, nodeWithAttributes.identifier,
    newAttributes.at(-1)!.identifier, ShiftAttributeDirection.Up, 1);
  nodeWithAttributes = visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode;
  expect(nodeWithAttributes.content[0]).toBe(newAttributes[0].identifier);
  expect(nodeWithAttributes.content[1]).toBe(newAttributes[2].identifier);
  expect(nodeWithAttributes.content[2]).toBe(newAttributes[1].identifier);
  //
  shiftAttributePositionAction(
    notificationMockup, visualModel, nodeWithAttributes.identifier,
    newAttributes.at(-1)!.identifier, ShiftAttributeDirection.Down, 1);
  nodeWithAttributes = visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode;
  expect(nodeWithAttributes.content).toEqual(newAttributes.map(attribute => attribute.identifier));
});

test("Test shift attribute - up and down over boundary", () => {
  const {
    visualModel,
    models,
    cmeModels
  } = prepareModelWithFourNodes();
  const newAttributes = [];
  //
  for(let i = 0; i < 3; i++) {
    const createdAttributeData = createSemanticAttributeTestVariant(
      models, `${i}`, cmeModels[0].identifier, `attribute-${i}`);
    newAttributes.push(createdAttributeData);
    addSemanticAttributeToVisualModelAction(
      notificationMockup, visualModel, "0", createdAttributeData.identifier, false);
  }
  let nodeWithAttributes = visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode;
  expect(nodeWithAttributes.content).toEqual(newAttributes.map(attribute => attribute.identifier));
  //
  shiftAttributePositionAction(
    notificationMockup, visualModel, nodeWithAttributes.identifier,
    newAttributes.at(-1)!.identifier, ShiftAttributeDirection.Down, 1);
  nodeWithAttributes = visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode;
  expect(nodeWithAttributes.content[0]).toBe(newAttributes[2].identifier);
  expect(nodeWithAttributes.content[1]).toBe(newAttributes[0].identifier);
  expect(nodeWithAttributes.content[2]).toBe(newAttributes[1].identifier);
  //
  shiftAttributePositionAction(
    notificationMockup, visualModel, nodeWithAttributes.identifier,
    newAttributes.at(-1)!.identifier, ShiftAttributeDirection.Up, 1);
  nodeWithAttributes = visualModel.getVisualEntitiesForRepresented("0")[0] as VisualNode;
  expect(nodeWithAttributes.content).toEqual(newAttributes.map(attribute => attribute.identifier));
});

// Heavily inspired by createSemanticAttribute
// We are doing this so:
// 1) We don't have to export the createSemanticAttribute method
// 2) It is less work
function createSemanticAttributeTestVariant(
  models: Map<string, EntityModel>,
  domainConceptIdentifier: string,
  ModelDsIdentifier: string,
  attributeName: string,
) {

  const range = representRdfsLiteral();
  const name = { "en": attributeName };
  const operation = createRelationship({
    ends: [{
      iri: null,
      name: {},
      description: {},
      concept: domainConceptIdentifier,
      cardinality: [0, 1],
    }, {
      name,
      description: {},
      concept: range.identifier,
      cardinality: [0, 1],
      iri: generateIriForName(name["en"]),
    }]
  });

  const model: InMemorySemanticModel = models.get(ModelDsIdentifier) as InMemorySemanticModel;
  const newAttribute = model.executeOperation(operation) as CreatedEntityOperationResult;
  if (newAttribute.success === false || newAttribute.id === undefined) {
    throw new Error("Failed in attribute creation");
  }

  return {
    identifier: newAttribute.id,
    model,
  };
}

const generateIriForName = (name: string) => {
  return name + "-iri.cz";
}

//
const prepareModelWithFourNodes = () => {
  const visualModel: WritableVisualModel = createDefaultVisualModelFactory().createNewWritableVisualModelSync(null);
  const modelIdentifier = "TEST-MODEL";
  const modelAlias = "TEST MODEL";

  const visualIdentifiers = [];
  for(let i = 0; i < 4; i++) {
    const visualIdentifier = createNewVisualNodeForTesting(visualModel, modelIdentifier, i);
    visualIdentifiers.push(visualIdentifier);
  }

  const models : Map<string, EntityModel> = new Map();
  const model = new InMemorySemanticModel();
  model.setAlias(modelAlias);
  models.set(model.getId(), model);

  const cmeModels = semanticModelMapToCmeSemanticModel(models, visualModel, "", identifier => identifier);

  return {
    visualModel,
    modelIdentifier,
    modelAlias,
    visualIdentifiers,
    models,
    model,
    cmeModels
  };
}

const createNewVisualNodeForTesting = (
  visualModel: WritableVisualModel,
  model: string,
  semanticIdentifierAsNumber: number
) => {
  const visualId = visualModel.addVisualNode({
    representedEntity: semanticIdentifierAsNumber.toString(),
    model,
    content: [],
    visualModels: [],
    position: { x: semanticIdentifierAsNumber, y: 0, anchored: null },
  });

  return visualId;
}
