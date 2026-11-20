import { describe, expect, test } from "vitest";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import {
  createDefaultVisualModelFactory,
  isVisualGroup,
  isVisualNode,
  isVisualProfileRelationship,
  isVisualRelationship,
  VisualNode,
  WritableVisualModel,
} from "@dataspecer/visual-model";
import {
  isSemanticModelGeneralization,
} from "@dataspecer/core-v2/semantic-model/concepts";

import {
  CmeOperationExecutor, CmeOperationExecutorState, createCmeOperationExecutor,
} from "../operation-executor";
import { cmeOperations } from "../operations";
import {
  CmeCreateContext, CmeOperationArguments, CmeOperationResultOf,
  MissingCmeExecutor, MissingModel,
} from "../operation";

interface TestContext {
  semanticModel: InMemorySemanticModel;
  visualModel: WritableVisualModel;
  otherVisualModel: WritableVisualModel;
  executor: CmeOperationExecutor;
  createContext: CmeCreateContext;
}

function createContext(): TestContext {
  const semanticModel = new InMemorySemanticModel();
  const factory = createDefaultVisualModelFactory();
  const visualModel = factory.createNewWritableVisualModelSync(null);
  const otherVisualModel = factory.createNewWritableVisualModelSync(null);
  const executor = createCmeOperationExecutor(cmeOperations, {
    entityModels: [semanticModel],
    visualModels: [visualModel, otherVisualModel],
    createNewEntityIdentifier: () => crypto.randomUUID(),
  });
  return {
    semanticModel, visualModel, otherVisualModel, executor,
    createContext: executor.createContext,
  };
}

/**
 * Executes the operation and fails when it reports an exception.
 */
async function run<ArgumentType extends CmeOperationArguments>(
  context: TestContext, args: ArgumentType,
): Promise<CmeOperationResultOf<ArgumentType>> {
  const result = await context.executor.execute(args);
  if (result.exception !== undefined) {
    throw result.exception;
  }
  return result;
}

async function createClass(context: TestContext, name: string): Promise<string> {
  // Create semantic class has a typed result, no need for the run helper.
  const result = await context.executor.execute(cmeOperations.createSemanticClass.create(context.createContext, {
    semanticModel: context.semanticModel.getId(),
    iri: name,
    name: { en: name },
    description: null,
    externalDocumentationUrl: null,
  }));
  if (result.exception !== undefined) {
    throw result.exception;
  }
  return result.created;
}

async function createRelationship(
  context: TestContext, domain: string, range: string, iri: string,
): Promise<string> {
  const result = await run(context, cmeOperations.createSemanticRelationship.create(context.createContext, {
    semanticModel: context.semanticModel.getId(),
    iri,
    name: null,
    description: null,
    domain,
    domainCardinality: null,
    range,
    rangeCardinality: null,
    externalDocumentationUrl: null,
    order: null,
  }));
  return result.created;
}

async function showClass(
  context: TestContext, entity: string, x: number,
): Promise<VisualNode> {
  await run(context, cmeOperations.showSemanticClass.create(context.createContext, {
    visualModel: context.visualModel.getId(),
    semanticModel: context.semanticModel.getId(),
    entity,
    x,
    y: 0,
  }));
  return context.visualModel.getVisualEntitiesForRepresented(entity)[0] as VisualNode;
}

function visualRelationships(visualModel: WritableVisualModel) {
  return [...visualModel.getVisualEntities().values()]
    .filter(isVisualRelationship);
}

describe("Operation executor", () => {

  test("Failure is reported as an outcome with exception.", async () => {
    const context = createContext();
    const result = await context.executor.execute(cmeOperations.createSemanticClass.create(context.createContext, {
      semanticModel: "missing-model",
      iri: null,
      name: null,
      description: null,
      externalDocumentationUrl: null,
    }));
    expect(result.exception).toBeInstanceOf(MissingModel);
    expect(result.args.semanticModel).toBe("missing-model");
  });

  test("Unknown operation is reported as missing executor.", async () => {
    const context = createContext();
    const result = await context.executor.execute({ type: "unknown" });
    expect(result.exception).toBeInstanceOf(MissingCmeExecutor);
  });

  test("Identifier of a created entity is prepared in create.", async () => {
    const context = createContext();
    const preparingContext = {
      createEntityIdentifier: () => "prepared-identifier",
    };
    const args = cmeOperations.createSemanticClass.create(preparingContext, {
      semanticModel: context.semanticModel.getId(),
      iri: "prepared",
      name: null,
      description: null,
      externalDocumentationUrl: null,
    });
    expect(args.identifier).toBe("prepared-identifier");
    // Executing the arguments creates the entity with the prepared identifier.
    const result = await context.executor.execute(args);
    expect(result.exception).toBeUndefined();
    if (result.exception === undefined) {
      expect(result.created).toBe("prepared-identifier");
    }
    expect(context.semanticModel.getEntities()["prepared-identifier"])
      .toBeDefined();
  });

  test("Executor rejects operations with the same type.", () => {
    const operation = cmeOperations.createSemanticClass;
    expect(() => createCmeOperationExecutor(
      { first: operation, second: operation },
      { entityModels: [], visualModels: [], createNewEntityIdentifier: () => "" })).toThrow();
  });

  test("Executor reads the state on every execution.", async () => {
    const semanticModel = new InMemorySemanticModel();
    const state: CmeOperationExecutorState = {
      entityModels: [],
      visualModels: [],
      createNewEntityIdentifier: () => "first",
    };
    const executor = createCmeOperationExecutor(cmeOperations, state);
    const parameters = {
      semanticModel: semanticModel.getId(),
      iri: null,
      name: null,
      description: null,
      externalDocumentationUrl: null,
    };
    // There is no model yet.
    const before = await executor.execute(cmeOperations.createSemanticClass.create(
      executor.createContext, parameters));
    expect(before.exception).toBeInstanceOf(MissingModel);
    // Update the state, the existing executor sees the change.
    state.entityModels = [semanticModel];
    state.createNewEntityIdentifier = () => "second";
    const after = await executor.execute(cmeOperations.createSemanticClass.create(
      executor.createContext, parameters));
    expect(after.exception).toBeUndefined();
    expect(semanticModel.getEntities()["second"]).toBeDefined();
  });

});

describe("Operation batch", () => {

  const classParameters = (context: TestContext, iri: string) => ({
    semanticModel: context.semanticModel.getId(),
    iri,
    name: null,
    description: null,
    externalDocumentationUrl: null,
  });

  test("Later operation can use identifier prepared by earlier one.", async () => {
    const context = createContext();
    const createArgs = cmeOperations.createSemanticClass.create(
      context.createContext, classParameters(context, "a"));
    const batch = context.executor.batch()
      .addArguments(createArgs)
      .add(cmeOperations.showSemanticClass, {
        visualModel: context.visualModel.getId(),
        semanticModel: context.semanticModel.getId(),
        entity: createArgs.identifier,
        x: 0,
        y: 0,
      })
      .build();
    const outcome = await context.executor.execute(batch);
    expect(outcome.exception).toBeUndefined();
    if (outcome.exception === undefined) {
      // Typed result of the first operation.
      expect(outcome.results[0].created).toBe(createArgs.identifier);
      expect(outcome.results[1].status).toBe("success");
    }
    expect(context.visualModel
      .getVisualEntitiesForRepresented(createArgs.identifier)).toHaveLength(1);
  });

  test("Execution stops at first failure, rest is ignored.", async () => {
    const context = createContext();
    const batch = context.executor.batch()
      .add(cmeOperations.createSemanticClass, classParameters(context, "a"))
      .add(cmeOperations.createSemanticClass, {
        ...classParameters(context, "b"),
        semanticModel: "missing-model",
      })
      .add(cmeOperations.createSemanticClass, classParameters(context, "c"))
      .build();
    const outcome = await context.executor.execute(batch);
    expect(outcome.exception).toBeInstanceOf(MissingModel);
    expect(outcome.results.map(item => item.status))
      .toEqual(["success", "failed", "ignored"]);
    // There is no rollback, the first class stays.
    const first = batch.operations[0].identifier;
    const last = batch.operations[2].identifier;
    expect(context.semanticModel.getEntities()[first]).toBeDefined();
    expect(context.semanticModel.getEntities()[last]).toBeUndefined();
  });

  test("Builder is immutable.", () => {
    const context = createContext();
    const empty = context.executor.batch();
    empty.add(cmeOperations.createSemanticClass, classParameters(context, "a"));
    expect(empty.build().operations).toHaveLength(0);
  });

});

describe("Semantic operations", () => {

  test("Update specialization creates and removes generalizations.", async () => {
    const context = createContext();
    const child = await createClass(context, "child");
    const first = await createClass(context, "first");
    const second = await createClass(context, "second");

    const created = await run(context, cmeOperations.updateSpecialization.create(context.createContext, {
      entity: child,
      model: context.semanticModel.getId(),
      previous: [],
      next: [
        { iri: null, specializationOf: first, generalization: null },
        { iri: null, specializationOf: second, generalization: null },
      ],
    }));
    expect(created.created.length).toBe(2);
    expect(created.removed.length).toBe(0);

    const firstGeneralization = created.created[0];
    const removed = await run(context, cmeOperations.updateSpecialization.create(context.createContext, {
      entity: child,
      model: context.semanticModel.getId(),
      previous: created.created.map(item => ({
        iri: null,
        specializationOf: item.parent,
        generalization: { identifier: item.identifier, model: item.model },
      })),
      next: [{
        iri: null,
        specializationOf: first,
        generalization: {
          identifier: firstGeneralization.identifier,
          model: firstGeneralization.model,
        },
      }],
    }));
    expect(removed.created.length).toBe(0);
    expect(removed.removed.length).toBe(1);

    const generalizations = Object.values(context.semanticModel.getEntities())
      .filter(isSemanticModelGeneralization);
    expect(generalizations.length).toBe(1);
    expect(generalizations[0].parent).toBe(first);
  });

  test("Delete entities removes them from the model.", async () => {
    const context = createContext();
    const first = await createClass(context, "first");
    const result = await run(context, cmeOperations.deleteSemanticEntities.create(context.createContext, {
      entities: [
        { identifier: first, model: context.semanticModel.getId() },
        { identifier: "missing", model: "missing-model" },
      ],
    }));
    expect(context.semanticModel.getEntities()[first]).toBeUndefined();
    expect(result.failed).toEqual([{ identifier: "missing", model: "missing-model" }]);
  });

});

describe("Visual model operations", () => {

  test("Show relationship and generalization between visible classes.", async () => {
    const context = createContext();
    const first = await createClass(context, "first");
    const second = await createClass(context, "second");
    const relationship = await createRelationship(context, first, second, "rel");
    const generalization = await run(context, cmeOperations.createSemanticGeneralization.create(context.createContext, {
      semanticModel: context.semanticModel.getId(),
      iri: null,
      child: first,
      parent: second,
    }));

    await showClass(context, first, 0);
    const hidden = await run(context, cmeOperations.showRelationship.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      entity: relationship,
    }));
    expect(hidden.shown).toBe(false);

    await showClass(context, second, 500);
    const shown = await run(context, cmeOperations.showRelationship.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      entity: relationship,
    }));
    expect(shown.shown).toBe(true);
    await run(context, cmeOperations.showGeneralization.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      entity: generalization.created,
    }));
    // Showing again must not create a duplicate.
    await run(context, cmeOperations.showRelationship.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      entity: relationship,
    }));
    expect(visualRelationships(context.visualModel).length).toBe(2);
  });

  test("Show entities adds nodes with related edges.", async () => {
    const context = createContext();
    const first = await createClass(context, "first");
    const second = await createClass(context, "second");
    const relationship = await createRelationship(context, first, second, "rel");

    await run(context, cmeOperations.showEntities.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      entities: [
        { identifier: first, position: { x: 0, y: 0 } },
        { identifier: second, position: { x: 300, y: 0 } },
      ],
      fallbackPosition: { x: 0, y: 0 },
    }));
    expect(context.visualModel.hasVisualEntityForRepresented(first)).toBe(true);
    expect(context.visualModel.hasVisualEntityForRepresented(second)).toBe(true);
    expect(context.visualModel.hasVisualEntityForRepresented(relationship)).toBe(true);
  });

  test("Hide by visual removes connected edges.", async () => {
    const context = createContext();
    const first = await createClass(context, "first");
    const second = await createClass(context, "second");
    const relationship = await createRelationship(context, first, second, "rel");
    const firstNode = await showClass(context, first, 0);
    await showClass(context, second, 500);
    await run(context, cmeOperations.showRelationship.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      entity: relationship,
    }));

    await run(context, cmeOperations.hideByVisual.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      visualEntities: [firstNode.id],
    }));
    expect(context.visualModel.getVisualEntity(firstNode.id)).toBeNull();
    expect(visualRelationships(context.visualModel).length).toBe(0);
    expect(context.visualModel.hasVisualEntityForRepresented(second)).toBe(true);
  });

  test("Hide by represented removes all visuals of the entity.", async () => {
    const context = createContext();
    const first = await createClass(context, "first");
    const node = await showClass(context, first, 0);
    await run(context, cmeOperations.duplicateVisualNode.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      visualNode: node.id,
    }));
    expect(context.visualModel.getVisualEntitiesForRepresented(first).length).toBe(2);

    await run(context, cmeOperations.hideByRepresented.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      entities: [first],
    }));
    expect(context.visualModel.hasVisualEntityForRepresented(first)).toBe(false);
  });

  test("Duplicate node copies its edges.", async () => {
    const context = createContext();
    const first = await createClass(context, "first");
    const second = await createClass(context, "second");
    const relationship = await createRelationship(context, first, second, "rel");
    const firstNode = await showClass(context, first, 0);
    await showClass(context, second, 500);
    await run(context, cmeOperations.showRelationship.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      entity: relationship,
    }));

    const result = await run(context, cmeOperations.duplicateVisualNode.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      visualNode: firstNode.id,
      nodeDimensions: { [firstNode.id]: { width: 200, height: 50 } },
    }));
    const duplicate = context.visualModel.getVisualEntity(result.created);
    expect(duplicate !== null && isVisualNode(duplicate)).toBe(true);
    expect((duplicate as VisualNode).position.x).toBeLessThan(firstNode.position.x);
    const edges = visualRelationships(context.visualModel);
    expect(edges.length).toBe(2);
    expect(edges.some(edge => edge.visualSource === result.created)).toBe(true);
  });

  test("Attributes can be shown and shifted.", async () => {
    const context = createContext();
    const first = await createClass(context, "first");
    const attributes = [
      await createRelationship(context, first, "http://www.w3.org/2001/XMLSchema#string", "a"),
      await createRelationship(context, first, "http://www.w3.org/2001/XMLSchema#string", "b"),
    ];
    const node = await showClass(context, first, 0);
    for (const attribute of attributes) {
      await run(context, cmeOperations.showAttribute.create(context.createContext, {
        visualModel: context.visualModel.getId(),
        attribute,
        visualNode: null,
        position: null,
      }));
    }
    const getContent = () =>
      (context.visualModel.getVisualEntity(node.id) as VisualNode).content;
    expect(getContent()).toEqual(attributes);

    await run(context, cmeOperations.shiftAttribute.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      visualNode: node.id,
      attribute: attributes[0],
      shift: -1,
    }));
    // Moving the first attribute up wraps around to the end.
    expect(getContent()).toEqual([attributes[1], attributes[0]]);
  });

  test("Group creation resets anchors, dissolving removes the group.", async () => {
    const context = createContext();
    const first = await createClass(context, "first");
    const second = await createClass(context, "second");
    const firstNode = await showClass(context, first, 0);
    const secondNode = await showClass(context, second, 500);
    await run(context, cmeOperations.toggleAnchor.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      visualEntity: firstNode.id,
    }));
    expect((context.visualModel.getVisualEntity(firstNode.id) as VisualNode)
      .position.anchored).toBe(true);

    const group = await run(context, cmeOperations.createVisualGroup.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      visualEntities: [firstNode.id, secondNode.id],
    }));
    expect((context.visualModel.getVisualEntity(firstNode.id) as VisualNode)
      .position.anchored).toBe(null);

    await run(context, cmeOperations.dissolveVisualGroup.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      visualEntity: firstNode.id,
    }));
    expect(context.visualModel.getVisualEntity(group.created)).toBeNull();
    expect([...context.visualModel.getVisualEntities().values()]
      .some(isVisualGroup)).toBe(false);
  });

  test("Move nodes keeps anchors.", async () => {
    const context = createContext();
    const first = await createClass(context, "first");
    const node = await showClass(context, first, 0);
    await run(context, cmeOperations.toggleAnchor.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      visualEntity: node.id,
    }));
    await run(context, cmeOperations.moveVisualNodes.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      positions: { [node.id]: { x: 10, y: 20 } },
    }));
    expect((context.visualModel.getVisualEntity(node.id) as VisualNode).position)
      .toEqual({ x: 10, y: 20, anchored: true });
  });

  test("Profile edges follow changes in profiled entities.", async () => {
    const context = createContext();
    const first = await createClass(context, "first");
    const second = await createClass(context, "second");
    await showClass(context, first, 0);
    await showClass(context, second, 500);
    const profile = await run(context, cmeOperations.createProfileClass.create(context.createContext, {
      profileModel: context.semanticModel.getId(),
      profileOf: [first],
      iri: null,
      name: null,
      nameSource: first,
      description: null,
      descriptionSource: first,
      usageNote: null,
      usageNoteSource: null,
      externalDocumentationUrl: null,
      tags: [],
    }));
    // Showing the profile adds the edge to the profiled class.
    await run(context, cmeOperations.showProfileClass.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      entity: profile.created,
      x: 0,
      y: 300,
    }));
    const profileEdges = () => [...context.visualModel.getVisualEntities().values()]
      .filter(isVisualProfileRelationship);
    expect(profileEdges().length).toBe(1);

    await run(context, cmeOperations.updateVisualNodeProfiles.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      entity: profile.created,
      model: context.semanticModel.getId(),
      previous: [first],
      next: [second],
    }));
    const edges = profileEdges();
    expect(edges.length).toBe(1);
    const target = context.visualModel.getVisualEntity(edges[0].visualTarget) as VisualNode;
    expect(target.representedEntity).toBe(second);
  });

  test("Copy visual entities copies only edges with both ends.", async () => {
    const context = createContext();
    const first = await createClass(context, "first");
    const second = await createClass(context, "second");
    const relationship = await createRelationship(context, first, second, "rel");
    const firstNode = await showClass(context, first, 0);
    const secondNode = await showClass(context, second, 500);
    await run(context, cmeOperations.showRelationship.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      entity: relationship,
    }));
    const edge = visualRelationships(context.visualModel)[0];

    const onlyNode = await run(context, cmeOperations.copyVisualEntities.create(context.createContext, {
      sourceVisualModel: context.visualModel.getId(),
      targetVisualModel: context.otherVisualModel.getId(),
      visualNodes: [firstNode.id],
      visualEdges: [edge.id],
    }));
    expect(onlyNode.mapping[edge.id]).toBeUndefined();
    expect(visualRelationships(context.otherVisualModel).length).toBe(0);

    await run(context, cmeOperations.setVisualEntityColor.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      visualEntities: [secondNode.id],
      color: "#ff0000",
    }));
    await run(context, cmeOperations.copyVisualEntities.create(context.createContext, {
      sourceVisualModel: context.visualModel.getId(),
      targetVisualModel: context.otherVisualModel.getId(),
      visualNodes: [secondNode.id],
      visualEdges: [],
    }));
    const copy = context.otherVisualModel
      .getVisualEntitiesForRepresented(second)[0] as VisualNode;
    // Custom color is part of the copy.
    expect(copy.color).toBe("#ff0000");
  });

});
