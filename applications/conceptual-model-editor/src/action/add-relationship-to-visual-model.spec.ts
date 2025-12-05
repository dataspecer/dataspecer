/**
 * Tests:
 * {@link addSemanticRelationshipToVisualModelAction} and in the same way also
 * {@link addSemanticGeneralizationToVisualModelAction}.
 *
 * Also the interactions with {@link createVisualEdgeEndpointDuplicateAction} are tested.
 */

import { expect, test } from "vitest";
import { EntityModel } from "@dataspecer/core-v2";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import {
  createDefaultVisualModelFactory,
  VisualRelationship,
  WritableVisualModel
} from "@dataspecer/visual-model";

import { notificationMockup } from "./test/actions-test-suite";
import {
  CreatedEntityOperationResult,
  createGeneralization,
  createRelationship
} from "@dataspecer/core-v2/semantic-model/operations";
import { addSemanticRelationshipToVisualModelAction } from "./add-relationship-to-visual-model";
import { ModelGraphContextType } from "../context/model-context";
import { SemanticModelAggregator, SemanticModelAggregatorView } from "@dataspecer/core-v2/semantic-model/aggregator";
import { SetStateAction } from "react";
import { createVisualEdgeEndpointDuplicateAction } from "./create-visual-edge-endpoint-duplicate";
import {
  SEMANTIC_MODEL_GENERALIZATION,
  SemanticModelGeneralization
} from "@dataspecer/core-v2/semantic-model/concepts";
import { addSemanticGeneralizationToVisualModelAction } from "./add-generalization-to-visual-model";
import { ActionsTestSuite } from "./test/actions-test-suite";
import {
  addVisualRelationshipsWithSpecifiedVisualEnds
} from "../dataspecer/visual-model/operation/add-visual-relationships";
import { semanticModelMapToCmeSemanticModel } from "../dataspecer/cme-model/adapter/";
import { CmeSpecialization } from "../dataspecer/cme-model/model";

test("Create single relationship - association", () => {
  testCreateSingleRelationship(RelationshipToTestType.Association);
});

test("Create single relationship - generalization", () => {
  testCreateSingleRelationship(RelationshipToTestType.Generalization);
});

function testCreateSingleRelationship(
  relationshipToTestType: RelationshipToTestType,
) {
  const {
    visualModel,
    models,
    cmeModels,
    graph
  } = prepareVisualModelWithFourNodes();

  const createdTestRelationships: {
    identifier: string,
    model: InMemorySemanticModel
  }[] = [];
  //
  createdTestRelationships.push(createTestRelationshipOfGivenType(
    graph, visualModel, models, cmeModels[0].identifier, relationshipToTestType,
    "0", "1", "relationship-0", null, true, [], []));
  expect([...visualModel.getVisualEntities().entries()].length).toBe(5);
  expect(visualModel.getVisualEntitiesForRepresented(createdTestRelationships[0].identifier).length).toBe(1);
}

test("Create relationship then after that duplicate node - association", () => {
  testCreateRelationshipWithNodeDuplicationAfter(RelationshipToTestType.Association);
});

test("Create relationship then after that duplicate node - generalization", () => {
  testCreateRelationshipWithNodeDuplicationAfter(RelationshipToTestType.Generalization);
});

function testCreateRelationshipWithNodeDuplicationAfter(
  relationshipToTestType: RelationshipToTestType,
) {
  const {
    visualModel,
    models,
    cmeModels,
    graph
  } = prepareVisualModelWithFourNodes();
  const diagram = ActionsTestSuite.createTestDiagram();

  const createdTestRelationships: {
    identifier: string,
    model: InMemorySemanticModel
  }[] = [];
  //
  createdTestRelationships.push(createTestRelationshipOfGivenType(
    graph, visualModel, models, cmeModels[0].identifier, relationshipToTestType,
    "0", "1", "relationship-0", null, true, [], []));
  expect([...visualModel.getVisualEntities().entries()].length).toBe(5);
  expect(visualModel.getVisualEntitiesForRepresented(createdTestRelationships[0].identifier).length).toBe(1);
  //
  createVisualEdgeEndpointDuplicateAction(
    notificationMockup, diagram, visualModel,
    visualModel.getVisualEntitiesForRepresented("0")[0].identifier);
  expect([...visualModel.getVisualEntities().entries()].length).toBe(7);
  expect(visualModel.getVisualEntitiesForRepresented(createdTestRelationships[0].identifier).length).toBe(2);
  expect(visualModel.getVisualEntitiesForRepresented("0").length).toBe(2);
}

test("Create node duplicate and after that create relationship from the original node - association", () => {
  testCreatedNodeDuplicateAndCreateRelationshipAfter(RelationshipToTestType.Association);
});

test("Create node duplicate and after that create relationship from the original node - generalization", () => {
  testCreatedNodeDuplicateAndCreateRelationshipAfter(RelationshipToTestType.Generalization);
});

function testCreatedNodeDuplicateAndCreateRelationshipAfter(
  relationshipToTestType: RelationshipToTestType,
) {
  const {
    visualModel,
    models,
    cmeModels,
    graph
  } = prepareVisualModelWithFourNodes();
  const diagram = ActionsTestSuite.createTestDiagram();

  const createdTestRelationships: {
    identifier: string,
    model: InMemorySemanticModel
  }[] = [];
  //

  createdTestRelationships.push(createTestRelationshipOfGivenType(
    graph, visualModel, models, cmeModels[0].identifier,
    relationshipToTestType, "0", "1", "relationship-0", null, false, [], []));
  createVisualEdgeEndpointDuplicateAction(
    notificationMockup, diagram, visualModel,
    visualModel.getVisualEntitiesForRepresented("0")[0].identifier);
  expect([...visualModel.getVisualEntities().entries()].length).toBe(5);
  expect(visualModel.getVisualEntitiesForRepresented("0").length).toBe(2);
  expect(visualModel.getVisualEntitiesForRepresented(createdTestRelationships[0].identifier).length).toBe(0);
  //
  const visualSource = visualModel.getVisualEntitiesForRepresented("0")[0];
  const visualTarget = visualModel.getVisualEntitiesForRepresented("1")[0];
  addTestRelationshipToVisualModel(
    graph, visualModel, cmeModels[0].identifier, relationshipToTestType,
    createdTestRelationships[0].identifier, [visualSource.identifier], [visualTarget.identifier]);
  expect([...visualModel.getVisualEntities().entries()].length).toBe(6);
  expect(visualModel.getVisualEntitiesForRepresented(createdTestRelationships[0].identifier).length).toBe(1);
  const relationship = visualModel
    .getVisualEntitiesForRepresented(createdTestRelationships[0].identifier)[0] as VisualRelationship;
  expect(relationship.visualSource).toBe(visualSource.identifier);
  expect(relationship.visualTarget).toBe(visualTarget.identifier);
}

test("Create node duplicate and after that create relationship from the original node without specifying visual ends" +
  " - it should create all the edges - association", () => {
  testCreateNodeDuplicateAndCreateRelationshipAfterWithoutSpecifyingEnds(RelationshipToTestType.Association);
});

test("Create node duplicate and after that create relationship from the original node without specifying visual ends" +
  " - it should create all the edges - generalization", () => {
  testCreateNodeDuplicateAndCreateRelationshipAfterWithoutSpecifyingEnds(RelationshipToTestType.Generalization);
});

function testCreateNodeDuplicateAndCreateRelationshipAfterWithoutSpecifyingEnds(
  relationshipToTestType: RelationshipToTestType,
) {
  const {
    visualModel,
    models,
    cmeModels,
    graph
  } = prepareVisualModelWithFourNodes();
  const diagram = ActionsTestSuite.createTestDiagram();

  const createdTestRelationships: {
    identifier: string,
    model: InMemorySemanticModel
  }[] = [];
  //
  createdTestRelationships.push(createTestRelationshipOfGivenType(
    graph, visualModel, models, cmeModels[0].identifier,
    relationshipToTestType, "0", "1", "relationship-0", null, false, [], []));
  createVisualEdgeEndpointDuplicateAction(
    notificationMockup, diagram, visualModel,
    visualModel.getVisualEntitiesForRepresented("0")[0].identifier);
  expect([...visualModel.getVisualEntities().entries()].length).toBe(5);
  expect(visualModel.getVisualEntitiesForRepresented("0").length).toBe(2);
  expect(visualModel.getVisualEntitiesForRepresented(createdTestRelationships[0].identifier).length).toBe(0);
  //
  addTestRelationshipToVisualModel(
    graph, visualModel, cmeModels[0].identifier, relationshipToTestType,
    createdTestRelationships[0].identifier, [], []);
  expect([...visualModel.getVisualEntities().entries()].length).toBe(7);
  expect(visualModel.getVisualEntitiesForRepresented(createdTestRelationships[0].identifier).length).toBe(2);
  //
  const relationships = visualModel.getVisualEntitiesForRepresented(createdTestRelationships[0].identifier);
  const createdVisualRelationships = relationships?.map(relationship => {
    const visualRelationship = relationship as VisualRelationship;
    return {
      visualSource: visualRelationship.visualSource,
      visualTarget: visualRelationship.visualTarget,
    }
  });
  const [visualSource1, visualSource2] = visualModel.getVisualEntitiesForRepresented("0");
  const visualTarget = visualModel.getVisualEntitiesForRepresented("1")[0];
  const expectedRelationships = [
    {
      visualSource: visualSource1.identifier,
      visualTarget: visualTarget.identifier,
    },
    {
      visualSource: visualSource2.identifier,
      visualTarget: visualTarget.identifier,
    },
  ]
  expect(createdVisualRelationships).toEqual(expectedRelationships);
}

test("Create self loop relationship and after that create duplicate of that node - association", () => {
  testCreateLoopAndDuplicateAfter(RelationshipToTestType.Association);
});

test("Create self loop relationship and after that create duplicate of that node - generalization", () => {
  testCreateLoopAndDuplicateAfter(RelationshipToTestType.Generalization);
});

function testCreateLoopAndDuplicateAfter(
  relationshipToTestType: RelationshipToTestType,
) {
  const {
    visualModel,
    models,
    cmeModels,
    graph
  } = prepareVisualModelWithFourNodes();
  const diagram = ActionsTestSuite.createTestDiagram();

  const createdTestRelationships: {
    identifier: string,
    model: InMemorySemanticModel
  }[] = [];
  //
  createdTestRelationships.push(createTestRelationshipOfGivenType(
    graph, visualModel, models, cmeModels[0].identifier,
    relationshipToTestType, "0", "0", "relationship-0", null, true, [], []));
  expect([...visualModel.getVisualEntities().entries()].length).toBe(5);
  expect(visualModel.getVisualEntitiesForRepresented(createdTestRelationships[0].identifier).length).toBe(1);
  //
  createVisualEdgeEndpointDuplicateAction(
    notificationMockup, diagram, visualModel,
    visualModel.getVisualEntitiesForRepresented("0")[0].identifier);
  expect([...visualModel.getVisualEntities().entries()].length).toBe(7);
  expect(visualModel.getVisualEntitiesForRepresented("0").length).toBe(2);
  expect(visualModel.getVisualEntitiesForRepresented(createdTestRelationships[0].identifier).length).toBe(2);
}

test(
  "Create node duplicate and after that create relationship from the original node to the duplicate - association",
  () => {
    testCreateNodeDuplicateAndLoopAfter(RelationshipToTestType.Association);
  });

test(
  "Create node duplicate and after that create relationship from the original node to the duplicate - generalization",
  () => {
    testCreateNodeDuplicateAndLoopAfter(RelationshipToTestType.Generalization);
  });

function testCreateNodeDuplicateAndLoopAfter(
  relationshipToTestType: RelationshipToTestType,
) {
  const {
    visualModel,
    models,
    cmeModels,
    graph
  } = prepareVisualModelWithFourNodes();
  const diagram = ActionsTestSuite.createTestDiagram();

  const createdTestRelationships: {
    identifier: string,
    model: InMemorySemanticModel
  }[] = [];
  //
  // Just creating the semantic relationship, the visual comes later.
  createdTestRelationships.push(createTestRelationshipOfGivenType(
    graph, visualModel, models, cmeModels[0].identifier,
    relationshipToTestType, "0", "0", "relationship-0", null, false, [], []));
  createVisualEdgeEndpointDuplicateAction(
    notificationMockup, diagram, visualModel,
    visualModel.getVisualEntitiesForRepresented("0")[0].identifier);
  expect([...visualModel.getVisualEntities().entries()].length).toBe(5);
  expect(visualModel.getVisualEntitiesForRepresented("0").length).toBe(2);
  expect(visualModel.getVisualEntitiesForRepresented(createdTestRelationships[0].identifier).length).toBe(0);
  //
  const visualSource = visualModel.getVisualEntitiesForRepresented("0")[0];
  const visualTarget = visualModel.getVisualEntitiesForRepresented("0")[1];
  addTestRelationshipToVisualModel(
    graph, visualModel, cmeModels[0].identifier, relationshipToTestType,
    createdTestRelationships[0].identifier, [visualSource.identifier], [visualTarget.identifier]);
  expect([...visualModel.getVisualEntities().entries()].length).toBe(6);
  expect(visualModel.getVisualEntitiesForRepresented(createdTestRelationships[0].identifier).length).toBe(1);
}

test("Create new duplicate from already duplicated node each with different edges - association", () => {
  testCreateNodeDuplicateOfNodeDuplicate(RelationshipToTestType.Association);
});

test("Create new duplicate from already duplicated node each with different edges - generalization", () => {
  testCreateNodeDuplicateOfNodeDuplicate(RelationshipToTestType.Generalization);
});

function testCreateNodeDuplicateOfNodeDuplicate(
  relationshipToTestType: RelationshipToTestType,
) {
  const {
    visualModel,
    models,
    cmeModels,
    graph
  } = prepareVisualModelWithFourNodes();
  const diagram = ActionsTestSuite.createTestDiagram();

  const createdTestRelationships: {
    identifier: string,
    model: InMemorySemanticModel
  }[] = [];

  // Create the semantic relationships in advance
  createdTestRelationships.push(createTestRelationshipOfGivenType(
    graph, visualModel, models, cmeModels[0].identifier,
    relationshipToTestType, "0", "1", "relationship-0", null, false, [], []));
  createdTestRelationships.push(createTestRelationshipOfGivenType(
    graph, visualModel, models, cmeModels[0].identifier,
    relationshipToTestType, "0", "2", "relationship-1", null, false, [], []));

  createVisualEdgeEndpointDuplicateAction(
    notificationMockup, diagram, visualModel,
    visualModel.getVisualEntitiesForRepresented("0")[0].identifier);
  expect([...visualModel.getVisualEntities().entries()].length).toBe(5);
  expect(visualModel.getVisualEntitiesForRepresented("0").length).toBe(2);
  expect(visualModel.getVisualEntitiesForRepresented(createdTestRelationships[0].identifier).length).toBe(0);
  //
  const [visualSource1, visualSource2] = visualModel.getVisualEntitiesForRepresented("0");
  const visualTarget1 = visualModel.getVisualEntitiesForRepresented("1")[0];
  const visualTarget2 = visualModel.getVisualEntitiesForRepresented("2")[0];
  addTestRelationshipToVisualModel(
    graph, visualModel, cmeModels[0].identifier, relationshipToTestType,
    createdTestRelationships[0].identifier, [visualSource1.identifier], [visualTarget1.identifier]);
  addTestRelationshipToVisualModel(
    graph, visualModel, cmeModels[0].identifier, relationshipToTestType,
    createdTestRelationships[1].identifier, [visualSource2.identifier], [visualTarget2.identifier]);
  expect([...visualModel.getVisualEntities().entries()].length).toBe(7);
  expect(visualModel.getVisualEntitiesForRepresented(createdTestRelationships[0].identifier).length).toBe(1);
  expect(visualModel.getVisualEntitiesForRepresented(createdTestRelationships[1].identifier).length).toBe(1);
  //
  const lastDuplicateNodeIdentifier = createVisualEdgeEndpointDuplicateAction(
    notificationMockup, diagram, visualModel,
    visualModel.getVisualEntitiesForRepresented("0")[0].identifier);

  // Edges to both "1" and "2"
  expect([...visualModel.getVisualEntities().entries()].length).toBe(10);
  expect(lastDuplicateNodeIdentifier).not.toBeNull();
  const actualVisualRelationships = [];
  actualVisualRelationships.push(visualModel.getVisualEntitiesForRepresented(createdTestRelationships[0].identifier));
  actualVisualRelationships.push(visualModel.getVisualEntitiesForRepresented(createdTestRelationships[1].identifier));
  for(const actualVisualRelationship of actualVisualRelationships) {
    const edgesFromDuplicate = actualVisualRelationship.filter(relationship =>
      (relationship as any).visualSource === lastDuplicateNodeIdentifier);
    expect(edgesFromDuplicate.length).toBe(1);
  }

}

//
// Test setup methods
//

const generateIriForName = (name: string) => {
  return name + "-iri.cz";
}

const prepareVisualModelWithFourNodes = () => {
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

  //
  const aggregator = new SemanticModelAggregator();
  aggregator.addModel(model);
  aggregator.addModel(visualModel);
  const aggregatorView = aggregator.getView();
  const visualModels: Map<string, WritableVisualModel> = new Map(Object.entries({
    [visualModel.getIdentifier()]: visualModel
  }));

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

type CreatedRelationshipData = {
  identifier: string,
  model: InMemorySemanticModel,
}

function createSemanticRelationshipTestVariant(
  models: Map<string, EntityModel>,
  domainConceptIdentifier: string,
  rangeConceptIdentifier: string,
  modelDsIdentifier: string,
  relationshipName: string,
): CreatedRelationshipData {
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

/**
 * @param identifier if null, then unique identifier is created in the executeOperation
 */
function createSemanticGeneralizationTestVariant(
  parent: string,
  child: string,
  identifier: string | null,
  models: Map<string, EntityModel>,
  modelDsIdentifier: string,
): CreatedRelationshipData {
  const generalization: SemanticModelGeneralization | Omit<SemanticModelGeneralization, "id"> = {
    id: identifier ?? undefined,
    iri: generateIriForName(""),
    type: [SEMANTIC_MODEL_GENERALIZATION],
    parent,
    child,
  };

  const model: InMemorySemanticModel = models.get(modelDsIdentifier) as InMemorySemanticModel;
  const createGeneralizationOperation = createGeneralization(generalization);
  const newGeneralization = model.executeOperation(createGeneralizationOperation) as CreatedEntityOperationResult;

  return {
    identifier: newGeneralization.id,
    model,
  };
}

enum RelationshipToTestType {
 Generalization,
 Association
};

/**
 * @param visualSources if of length zero then gets the identifiers based on the semantic ends of relationship.
 * @param visualTargets if of length zero then gets the identifiers based on the semantic ends of relationship.
 * @returns
 */
function createTestRelationshipOfGivenType(
  graph: ModelGraphContextType,
  visualModel: WritableVisualModel,
  models: Map<string, EntityModel>,
  modelDsIdentifier: string,
  relationshipToTestType: RelationshipToTestType,
  semanticSource: string,
  semanticTarget: string,
  identifier: string | null,
  name: string | null,
  shouldAlsoAddTheCreatedRelationshipToVisualModel: boolean,
  visualSources: string[],
  visualTargets: string[],
): CreatedRelationshipData {

  let result: CreatedRelationshipData
  if(relationshipToTestType === RelationshipToTestType.Generalization) {
    result = createSemanticGeneralizationTestVariant(
      semanticTarget, semanticSource, identifier, models, modelDsIdentifier);
  }
  else if(relationshipToTestType === RelationshipToTestType.Association) {
    result = createSemanticRelationshipTestVariant(
      models, semanticSource, semanticTarget, modelDsIdentifier, name ?? "");
  }
  else {
    throw new Error("Unexpected relationshipToTestType");
  }

  if(shouldAlsoAddTheCreatedRelationshipToVisualModel) {
    addTestRelationshipToVisualModel(
      graph, visualModel, modelDsIdentifier, relationshipToTestType,
      result.identifier, visualSources, visualTargets);
  }
  return result;
}

function addTestRelationshipToVisualModel(
  graph: ModelGraphContextType,
  visualModel: WritableVisualModel,
  modelDsIdentifier: string,
  relationshipToTestType: RelationshipToTestType,
  relationshipIdentifier: string,
  visualSourceIdentifiers: string[],
  visualTargetIdentifiers: string[],
) {
  if(visualSourceIdentifiers.length === 0 || visualTargetIdentifiers.length === 0) {
    if(relationshipToTestType === RelationshipToTestType.Generalization) {
      addSemanticGeneralizationToVisualModelAction(
        notificationMockup, graph, visualModel,
        relationshipIdentifier, modelDsIdentifier);
    }
    else if(relationshipToTestType === RelationshipToTestType.Association) {
      addSemanticRelationshipToVisualModelAction(
        notificationMockup, graph, visualModel,
        relationshipIdentifier, modelDsIdentifier);
    }
  }
  else {
    const visualSources = visualSourceIdentifiers
      .map(identifier => visualModel.getVisualEntity(identifier))
      .filter(entity => entity !== null);
    const visualTargets = visualTargetIdentifiers
      .map(identifier => visualModel.getVisualEntity(identifier))
      .filter(entity => entity !== null);
    addVisualRelationshipsWithSpecifiedVisualEnds(
      visualModel, modelDsIdentifier, relationshipIdentifier, visualSources, visualTargets);
  }
}
