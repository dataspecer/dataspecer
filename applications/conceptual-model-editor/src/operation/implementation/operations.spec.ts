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

// Operations are registered as a side effect of the import.
import "./index";
import {
  CmeOperationsExecutor, createCmeOperationExecutor,
} from "../operation-executor";
import { cmeOperationExecutorRegistry } from "../operation-registry";
import {
  CmeOperationArguments, CmeOperationResultOf, MissingCmeExecutor, MissingModel,
} from "../operation";
import {
  copyVisualEntitiesOperation,
  createProfileClassOperation,
  createSemanticClassOperation,
  createSemanticGeneralizationOperation,
  createSemanticRelationshipOperation,
  createVisualGroupOperation,
  deleteSemanticEntitiesOperation,
  dissolveVisualGroupOperation,
  duplicateVisualNodeOperation,
  hideByRepresentedOperation,
  hideByVisualOperation,
  moveVisualNodesOperation,
  setVisualEntityColorOperation,
  shiftAttributeOperation,
  showAttributeOperation,
  showEntitiesOperation,
  showGeneralizationOperation,
  showProfileClassOperation,
  showRelationshipOperation,
  showSemanticClassOperation,
  toggleAnchorOperation,
  updateSpecializationOperation,
  updateVisualNodeProfilesOperation,
} from "./index";

interface TestContext {
  semanticModel: InMemorySemanticModel;
  visualModel: WritableVisualModel;
  otherVisualModel: WritableVisualModel;
  executor: CmeOperationsExecutor;
}

function createContext(): TestContext {
  const semanticModel = new InMemorySemanticModel();
  const factory = createDefaultVisualModelFactory();
  const visualModel = factory.createNewWritableVisualModelSync(null);
  const otherVisualModel = factory.createNewWritableVisualModelSync(null);
  const executor = createCmeOperationExecutor(
    cmeOperationExecutorRegistry, [semanticModel], [visualModel, otherVisualModel],
    () => crypto.randomUUID());
  return { semanticModel, visualModel, otherVisualModel, executor };
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
  const result = await context.executor.execute(createSemanticClassOperation({
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
  const result = await run(context, createSemanticRelationshipOperation({
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
  await run(context, showSemanticClassOperation({
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
    const result = await context.executor.execute(createSemanticClassOperation({
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

});

describe("Semantic operations", () => {

  test("Update specialization creates and removes generalizations.", async () => {
    const context = createContext();
    const child = await createClass(context, "child");
    const first = await createClass(context, "first");
    const second = await createClass(context, "second");

    const created = await run(context, updateSpecializationOperation({
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
    const removed = await run(context, updateSpecializationOperation({
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
    const result = await run(context, deleteSemanticEntitiesOperation({
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
    const generalization = await run(context, createSemanticGeneralizationOperation({
      semanticModel: context.semanticModel.getId(),
      iri: null,
      child: first,
      parent: second,
    }));

    await showClass(context, first, 0);
    const hidden = await run(context, showRelationshipOperation({
      visualModel: context.visualModel.getId(),
      entity: relationship,
    }));
    expect(hidden.shown).toBe(false);

    await showClass(context, second, 500);
    const shown = await run(context, showRelationshipOperation({
      visualModel: context.visualModel.getId(),
      entity: relationship,
    }));
    expect(shown.shown).toBe(true);
    await run(context, showGeneralizationOperation({
      visualModel: context.visualModel.getId(),
      entity: generalization.created,
    }));
    // Showing again must not create a duplicate.
    await run(context, showRelationshipOperation({
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

    await run(context, showEntitiesOperation({
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
    await run(context, showRelationshipOperation({
      visualModel: context.visualModel.getId(),
      entity: relationship,
    }));

    await run(context, hideByVisualOperation({
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
    await run(context, duplicateVisualNodeOperation({
      visualModel: context.visualModel.getId(),
      visualNode: node.id,
    }));
    expect(context.visualModel.getVisualEntitiesForRepresented(first).length).toBe(2);

    await run(context, hideByRepresentedOperation({
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
    await run(context, showRelationshipOperation({
      visualModel: context.visualModel.getId(),
      entity: relationship,
    }));

    const result = await run(context, duplicateVisualNodeOperation({
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
      await run(context, showAttributeOperation({
        visualModel: context.visualModel.getId(),
        attribute,
        visualNode: null,
        position: null,
      }));
    }
    const getContent = () =>
      (context.visualModel.getVisualEntity(node.id) as VisualNode).content;
    expect(getContent()).toEqual(attributes);

    await run(context, shiftAttributeOperation({
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
    await run(context, toggleAnchorOperation({
      visualModel: context.visualModel.getId(),
      visualEntity: firstNode.id,
    }));
    expect((context.visualModel.getVisualEntity(firstNode.id) as VisualNode)
      .position.anchored).toBe(true);

    const group = await run(context, createVisualGroupOperation({
      visualModel: context.visualModel.getId(),
      visualEntities: [firstNode.id, secondNode.id],
    }));
    expect((context.visualModel.getVisualEntity(firstNode.id) as VisualNode)
      .position.anchored).toBe(null);

    await run(context, dissolveVisualGroupOperation({
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
    await run(context, toggleAnchorOperation({
      visualModel: context.visualModel.getId(),
      visualEntity: node.id,
    }));
    await run(context, moveVisualNodesOperation({
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
    const profile = await run(context, createProfileClassOperation({
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
    await run(context, showProfileClassOperation({
      visualModel: context.visualModel.getId(),
      entity: profile.created,
      x: 0,
      y: 300,
    }));
    const profileEdges = () => [...context.visualModel.getVisualEntities().values()]
      .filter(isVisualProfileRelationship);
    expect(profileEdges().length).toBe(1);

    await run(context, updateVisualNodeProfilesOperation({
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
    await run(context, showRelationshipOperation({
      visualModel: context.visualModel.getId(),
      entity: relationship,
    }));
    const edge = visualRelationships(context.visualModel)[0];

    const onlyNode = await run(context, copyVisualEntitiesOperation({
      sourceVisualModel: context.visualModel.getId(),
      targetVisualModel: context.otherVisualModel.getId(),
      visualNodes: [firstNode.id],
      visualEdges: [edge.id],
    }));
    expect(onlyNode.mapping[edge.id]).toBeUndefined();
    expect(visualRelationships(context.otherVisualModel).length).toBe(0);

    await run(context, setVisualEntityColorOperation({
      visualModel: context.visualModel.getId(),
      visualEntities: [secondNode.id],
      color: "#ff0000",
    }));
    await run(context, copyVisualEntitiesOperation({
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
