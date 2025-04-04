/**
 * Tests {@link removeFromVisualModelByVisualAction} and interaction with {@link createVisualEdgeEndpointDuplicateAction}.
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
import { createVisualEdgeEndpointDuplicateAction } from "./create-visual-edge-endpoint-duplicate";
import { semanticModelMapToCmeSemanticModel } from "../dataspecer/cme-model/adapter";
import { ModelGraphContextType } from "../context/model-context";
import { ClassesContextType } from "../context/classes-context";
import { ActionsTestSuite } from "./test/actions-test-suite";
import { removeFromVisualModelByVisualAction } from "./remove-from-visual-model-by-visual";
import { CmeSpecialization } from "../dataspecer/cme-model/model";

test("removeFromVisualModelAction - relationship", () => {
  const {
    visualModel,
    model,
  } = prepareModelWithFourNodes();

  const visualRelationship = createNewVisualRelationshipsForTestingFromSemanticEnds(
    visualModel, model.getId(), "0", "1");
  expect(visualModel.getVisualEntity(visualRelationship)).not.toBeNull();
  //
  removeFromVisualModelByVisualAction(notificationMockup, visualModel, [visualRelationship]);
  expect(visualModel.getVisualEntity(visualRelationship)).toBeNull();
  expect(visualModel.getVisualEntitiesForRepresented("0").length).toBe(1);
  expect(visualModel.getVisualEntitiesForRepresented("1").length).toBe(1);
  expect(visualModel.getVisualEntitiesForRepresented("2").length).toBe(1);
  expect(visualModel.getVisualEntitiesForRepresented("3").length).toBe(1);
});

test("Remove relationship end", () => {
  const {
    visualModel,
    model,
  } = prepareModelWithFourNodes();

  const nodeToRemove = visualModel.getVisualEntitiesForRepresented("0")[0];
  const visualRelationship = createNewVisualRelationshipsForTestingFromSemanticEnds(
    visualModel, model.getId(), "0", "1");
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
  removeFromVisualModelByVisualAction(
    notificationMockup, visualModel,
    [sourceNodeToRemove.identifier, targetNodeToRemove.identifier]);
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
  //
  removeFromVisualModelByVisualAction(notificationMockup, visualModel,
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

test("Remove node duplicate", () => {
  const {
    visualModel,
    model,
  } = prepareModelWithFourNodes();
  const diagram = ActionsTestSuite.createTestDiagram();

  createNewVisualRelationshipsForTestingFromSemanticEnds(visualModel, model.getId(), "0", "1", "relationshipId");
  const nodeToDuplicate = visualModel.getVisualEntitiesForRepresented("0")[0];
  createVisualEdgeEndpointDuplicateAction(notificationMockup, diagram, visualModel, nodeToDuplicate.identifier);
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
  const visualModelsAsObjectEntries = Object.entries({[visualModel.getIdentifier()]: visualModel});
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
