/**
 * Tests {@link removeFromVisualModelByRepresentedAction} and interaction with {@link createVisualNodeDuplicateAction}.
 */

import { expect, test } from "vitest";
import { EntityModel } from "@dataspecer/core-v2";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { createDefaultVisualModelFactory, isVisualNode, WritableVisualModel } from "@dataspecer/core-v2/visual-model";
import {
  CreatedEntityOperationResult,
  createGeneralization,
  createRelationship
} from "@dataspecer/core-v2/semantic-model/operations";
import { SemanticModelAggregator, SemanticModelAggregatorView } from "@dataspecer/core-v2/semantic-model/aggregator";
import { SetStateAction } from "react";
import { notificationMockup } from "./test/actions-test-suite";
import { createVisualNodeDuplicateAction } from "./create-visual-node-duplicate";
import { semanticModelMapToCmeSemanticModel } from "../dataspecer/cme-model/adapter/";
import { ModelGraphContextType } from "../context/model-context";
import { ClassesContextType } from "../context/classes-context";
import { ActionsTestSuite } from "./test/actions-test-suite";
import { removeFromVisualModelByRepresentedAction } from "./remove-from-visual-model-by-represented";
import { CmeSpecialization } from "../dataspecer/cme-model/model";
import { fail } from "@/utilities/fail-test";

test("removeFromVisualModelAction - relationship", () => {
  const {
    visualModel,
    model,
  } = prepareModelWithFourNodes();

  const visualRelationship = createNewVisualRelationshipsForTestingFromSemanticEnds(
    visualModel, model.getId(), "0", "1", "relationshipSemanticIdentifier");
  expect(visualModel.getVisualEntity(visualRelationship)).not.toBeNull();
  //
  removeFromVisualModelByRepresentedAction(
    notificationMockup, visualModel, ["relationshipSemanticIdentifier"]);
  expect(visualModel.getVisualEntity(visualRelationship)).toBeNull();
  expect(visualModel.getVisualEntitiesForRepresented("0").length).toBe(1);
  expect(visualModel.getVisualEntitiesForRepresented("1").length).toBe(1);
  expect(visualModel.getVisualEntitiesForRepresented("2").length).toBe(1);
  expect(visualModel.getVisualEntitiesForRepresented("3").length).toBe(1);
});

test("Remove relationship end - semantic id", () => {
  const {
    visualModel,
    model,
  } = prepareModelWithFourNodes();

  const nodeToRemove = visualModel.getVisualEntitiesForRepresented("0")[0];
  const visualRelationship = createNewVisualRelationshipsForTestingFromSemanticEnds(
    visualModel, model.getId(), "0", "1");
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

test("Remove relationship ends at the same time", () => {
  const {
    visualModel,
    model,
  } = prepareModelWithFourNodes();

  const sourceNodeToRemove = visualModel.getVisualEntitiesForRepresented("0")[0];
  const targetNodeToRemove = visualModel.getVisualEntitiesForRepresented("1")[0];
  const visualRelationship = createNewVisualRelationshipsForTestingFromSemanticEnds(
    visualModel, model.getId(), "0", "1");
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

test("Remove ends and the relationship", () => {
  const {
    visualModel,
    model,
  } = prepareModelWithFourNodes();

  const sourceNodeToRemove = visualModel.getVisualEntitiesForRepresented("0")[0];
  const targetNodeToRemove = visualModel.getVisualEntitiesForRepresented("1")[0];
  const visualRelationship = createNewVisualRelationshipsForTestingFromSemanticEnds(
    visualModel, model.getId(), "0", "1", "relationshipId");
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
    model,
  } = prepareModelWithFourNodes();

  createNewVisualRelationshipsForTestingFromSemanticEnds(visualModel, model.getId(), "0", "1", "relationshipId1");
  createNewVisualRelationshipsForTestingFromSemanticEnds(visualModel, model.getId(), "1", "2", "relationshipId2");
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

test("Remove node duplicate", () => {
  const {
    visualModel,
    model,
  } = prepareModelWithFourNodes();
  const diagram = ActionsTestSuite.createTestDiagram();

  createNewVisualRelationshipsForTestingFromSemanticEnds(visualModel, model.getId(), "0", "1", "relationshipId");
  const nodeToDuplicate = visualModel.getVisualEntitiesForRepresented("0")[0];
  createVisualNodeDuplicateAction(notificationMockup, diagram, visualModel, nodeToDuplicate.identifier);
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

//
// Test setup methods
//

const generateIriForName = (name: string) => {
  return name + "-iri.cz";
}

const prepareModelWithFourNodes = () => {
  const visualModel: WritableVisualModel = createDefaultVisualModelFactory().createNewWritableVisualModelSync();
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

  //
  const aggregator = new SemanticModelAggregator();
  aggregator.addModel(model);
  aggregator.addModel(visualModel);
  const aggregatorView = aggregator.getView();
  const visualModelsAsObjectEntries = Object.entries({ [visualModel.getIdentifier()]: visualModel });
  const visualModels: Map<string, WritableVisualModel> = new Map(visualModelsAsObjectEntries);

  const graph: ModelGraphContextType = {
    aggregator,
    aggregatorView,
    setAggregatorView: function (_value: SetStateAction<SemanticModelAggregatorView>): void {
      throw new Error("Function not implemented.");
    },
    models: models,
    setModels: function (_value: SetStateAction<Map<string, EntityModel>>): void {
      throw new Error("Function not implemented.");
    },
    visualModels,
    setVisualModels: function (_value: SetStateAction<Map<string, WritableVisualModel>>): void {
      throw new Error("Function not implemented.");
    }
  };

  return {
    visualModel,
    modelIdentifier,
    modelAlias,
    visualIdentifiers,
    models,
    model,
    cmeModels,
    graph,
  };
}

const _createEmptyClassesContextType = (): ClassesContextType => {
  const classes: ClassesContextType = {
    classes: [],
    allowedClasses: [],
    setAllowedClasses: function (_) { },
    relationships: [],
    generalizations: [],
    usages: [],
    sourceModelOfEntityMap: new Map(),
    rawEntities: [],
    classProfiles: [],
    relationshipProfiles: []
  };

  return classes;
};

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

let currentRepresentedRelationshipIdentifier = 0;
const createNewVisualRelationshipsForTestingFromSemanticEnds = (
  visualModel: WritableVisualModel,
  model: string,
  semanticSourceIdentifier: string,
  semanticTargetIdentifier: string,
  representedRelationshipIdentifier?: string,
) => {
  const visualSource = visualModel.getVisualEntitiesForRepresented(semanticSourceIdentifier)[0];
  const visualTarget = visualModel.getVisualEntitiesForRepresented(semanticTargetIdentifier)[0];
  if(visualSource === undefined ||
     visualTarget === undefined ||
     !isVisualNode(visualSource) ||
     !isVisualNode(visualTarget)) {
    fail("Failed when creating visual relationship for testing - programmer error");
  }
  const visualId = visualModel.addVisualRelationship({
    model: model,
    representedRelationship: representedRelationshipIdentifier ?? `r-${currentRepresentedRelationshipIdentifier++}`,
    waypoints: [{
      x: 0, y: 2,
      anchored: null
    }],
    visualSource: visualSource.identifier,
    visualTarget: visualTarget.identifier,
  });

  return visualId;
}

// TODO RadStr: Remove later probably not used in this file, but will be useful for the rest of tests

// Heavily inspired by createSemanticAssociationInternal
// We are doing this so:
// 1) We don't have create the state for the method
// 2) It is less work
function _createSemanticRelationshipTestVariant(
  models: Map<string, EntityModel>,
  domainConceptIdentifier: string,
  rangeConceptIdentifier: string,
  modelDsIdentifier: string,
  relationshipName: string,
): {
  identifier: string,
  model: InMemorySemanticModel
} {
  const name = { "en": relationshipName };

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
      concept: rangeConceptIdentifier,
      cardinality: [0, 1],
      iri: generateIriForName(name["en"]),
    }]
  });

  const model: InMemorySemanticModel = models.get(modelDsIdentifier) as InMemorySemanticModel;
  const newAssociation = model.executeOperation(operation) as CreatedEntityOperationResult;

  // Perform additional modifications for which we need to have the class identifier.
  const operations = [];
  const specializations: CmeSpecialization[] = [];
  for (const specialization of specializations) {
    operations.push(createGeneralization({
      parent: specialization.specializationOf.identifier,
      child: newAssociation.id,
      iri: specialization.iri,
    }));
  }
  model.executeOperations(operations);

  return {
    identifier: newAssociation.id,
    model,
  };
}
