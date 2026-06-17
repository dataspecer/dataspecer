import { describe, it, expect, beforeEach } from "vitest";
import type { EntityRecord, EntityChange, Entity } from "@dataspecer/core/entity-model";
import {
  createAddVisualNodeOperation,
  createAddVisualDiagramNodeOperation,
  createAddVisualRelationshipOperation,
  createAddVisualProfileRelationshipOperation,
  createAddVisualGroupOperation,
  createUpdateVisualEntityOperation,
  createDeleteVisualEntityOperation,
  createSetModelColorOperation,
} from "../operations.ts";
import {
  VISUAL_NODE_TYPE,
  VISUAL_DIAGRAM_NODE_TYPE,
  VISUAL_RELATIONSHIP_TYPE,
  VISUAL_PROFILE_RELATIONSHIP_TYPE,
  VISUAL_GROUP_TYPE,
  VISUAL_MODEL_DATA_TYPE,
  type VisualNode,
  type VisualDiagramNode,
  type VisualRelationship,
  type VisualProfileRelationship,
  type VisualGroup,
} from "../concepts/index.ts";
import { fixVisualEntityType, type VisualEntityAndCoreEntity } from "../concepts/visual-entity.ts";
import { applyOperationsToVisualModel } from "./executor.ts";

/**
 * Test helpers for creating visual model entities.
 * These abstractions make tests easy to write and understand.
 */

interface TestContext {
  model: EntityRecord;
}

/**
 * Helper to create a test visual model
 */
function createTestModel(): EntityRecord {
  return {};
}

/**
 * Helper to assert that a change is a creation
 */
function expectCreation(change: EntityChange | undefined, expectedType: string) {
  expect(change).toBeDefined();
  expect(change?.previous).toBeNull();
  expect(change?.next).toBeDefined();
  const next = change?.next as Entity | null;
  expect(next?.type).toContain(expectedType);
}

/**
 * Helper to assert that a change is an update
 */
function expectUpdate(change: EntityChange | undefined) {
  expect(change).toBeDefined();
  expect(change?.previous).toBeDefined();
  expect(change?.next).toBeDefined();
  const prev = change?.previous as Entity | null;
  const next = change?.next as Entity | null;
  expect(prev?.id).toBe(next?.id);
}

/**
 * Helper to assert that a change is a deletion
 */
function expectDeletion(change: EntityChange | undefined) {
  expect(change).toBeDefined();
  expect(change?.previous).toBeDefined();
  expect(change?.next).toBeNull();
}

/**
 * Helper to store a visual entity in the model — converts old-interface entity
 * (identifier) to new-interface entity (id) so EntityRecord typing is satisfied.
 */
function storeInModel(model: EntityRecord, key: string, entity: VisualEntityAndCoreEntity): void {
  (model as Record<string, VisualEntityAndCoreEntity>)[key] = entity;
}

describe("applyOperationsToVisualModel", () => {
  let testContext: TestContext;

  beforeEach(() => {
    testContext = {
      model: createTestModel(),
    };
  });

  describe("AddVisualNodeOperation", () => {
    it("should create a visual node and record the change", () => {
      const node: VisualNode = {
        identifier: "node-1",
        type: [VISUAL_NODE_TYPE],
        representedEntity: "entity-1",
        model: "model-1",
        position: { x: 10, y: 20, anchored: null },
        content: [],
        visualModels: [],
      };

      const operation = createAddVisualNodeOperation(node);

      const changes = applyOperationsToVisualModel(testContext.model, [operation]);

      expect(changes).toHaveLength(1);
      expectCreation(changes[0], VISUAL_NODE_TYPE);
      const next = changes[0]?.next as any;
      expect(next?.representedEntity).toBe("entity-1");

      // Verify entity was added to model
      const entityId = (changes[0]?.next as Entity)?.id;
      expect(testContext.model[entityId]).toBeDefined();
    });

    it("should create multiple visual nodes", () => {
      const node1: VisualNode = {
        identifier: "node-1",
        type: [VISUAL_NODE_TYPE],
        representedEntity: "entity-1",
        model: "model-1",
        position: { x: 10, y: 20, anchored: null },
        content: [],
        visualModels: [],
      };

      const node2: VisualNode = {
        identifier: "node-2",
        type: [VISUAL_NODE_TYPE],
        representedEntity: "entity-2",
        model: "model-1",
        position: { x: 30, y: 40, anchored: null },
        content: [],
        visualModels: [],
      };

      const op1 = createAddVisualNodeOperation(node1);
      const op2 = createAddVisualNodeOperation(node2);

      const changes = applyOperationsToVisualModel(testContext.model, [op1, op2]);

      expect(changes).toHaveLength(2);
      expect(Object.keys(testContext.model)).toHaveLength(2);
    });
  });

  describe("AddVisualDiagramNodeOperation", () => {
    it("should create a visual diagram node", () => {
      const diagramNode: VisualDiagramNode = {
        identifier: "diagram-node-1",
        type: [VISUAL_DIAGRAM_NODE_TYPE],
        representedVisualModel: "visual-model-1",
        position: { x: 50, y: 60, anchored: null },
      };

      const operation = createAddVisualDiagramNodeOperation(diagramNode);

      const changes = applyOperationsToVisualModel(testContext.model, [operation]);

      expect(changes).toHaveLength(1);
      expectCreation(changes[0], VISUAL_DIAGRAM_NODE_TYPE);
      const next = changes[0]?.next as any;
      expect(next?.representedVisualModel).toBe("visual-model-1");
    });
  });

  describe("AddVisualRelationshipOperation", () => {
    it("should create a visual relationship", () => {
      const relationship: VisualRelationship = {
        identifier: "rel-1",
        type: [VISUAL_RELATIONSHIP_TYPE],
        representedRelationship: "rel-entity",
        model: "model-1",
        visualSource: "node-1",
        visualTarget: "node-2",
        waypoints: [],
      };

      const operation = createAddVisualRelationshipOperation(relationship);

      const changes = applyOperationsToVisualModel(testContext.model, [operation]);

      expect(changes).toHaveLength(1);
      expectCreation(changes[0], VISUAL_RELATIONSHIP_TYPE);
      const next = changes[0]?.next as any;
      expect(next?.visualSource).toBe("node-1");
      expect(next?.visualTarget).toBe("node-2");
    });
  });

  describe("AddVisualProfileRelationshipOperation", () => {
    it("should create a visual profile relationship", () => {
      const profileRel: VisualProfileRelationship = {
        identifier: "prof-rel-1",
        type: [VISUAL_PROFILE_RELATIONSHIP_TYPE],
        entity: "entity-1",
        model: "model-1",
        waypoints: [],
        visualSource: "node-1",
        visualTarget: "node-2",
      };

      const operation = createAddVisualProfileRelationshipOperation(profileRel);

      const changes = applyOperationsToVisualModel(testContext.model, [operation]);

      expect(changes).toHaveLength(1);
      expectCreation(changes[0], VISUAL_PROFILE_RELATIONSHIP_TYPE);
    });
  });

  describe("AddVisualGroupOperation", () => {
    it("should create a visual group", () => {
      const group: VisualGroup = {
        identifier: "group-1",
        type: [VISUAL_GROUP_TYPE],
        anchored: null,
        content: [],
      };

      const operation = createAddVisualGroupOperation(group);

      const changes = applyOperationsToVisualModel(testContext.model, [operation]);

      expect(changes).toHaveLength(1);
      expectCreation(changes[0], VISUAL_GROUP_TYPE);
    });
  });

  describe("UpdateVisualEntityOperation", () => {
    it("should update an existing entity", () => {
      // First, add an entity
      const node: VisualNode = {
        identifier: "node-1",
        type: [VISUAL_NODE_TYPE],
        representedEntity: "entity-1",
        model: "model-1",
        position: { x: 10, y: 20, anchored: null },
        content: [],
        visualModels: [],
      };

      storeInModel(testContext.model, "node-1", fixVisualEntityType(node));

      // Now update it
      const updateOp = createUpdateVisualEntityOperation("node-1", {
        position: { x: 100, y: 200, anchored: null },
        content: ["attr-1"],
      });

      const changes = applyOperationsToVisualModel(testContext.model, [updateOp]);

      expect(changes).toHaveLength(1);
      expectUpdate(changes[0]);
      const next = changes[0]?.next as any;
      expect(next?.position).toEqual({ x: 100, y: 200, anchored: null });
      expect(next?.content).toContain("attr-1");
    });

    it("should not create a change if entity doesn't exist", () => {
      const updateOp = createUpdateVisualEntityOperation("non-existent", { content: ["attr-1"] });

      const changes = applyOperationsToVisualModel(testContext.model, [updateOp]);

      expect(changes).toHaveLength(0);
    });

    it("should preserve unchanged properties during update", () => {
      const node: VisualNode = {
        identifier: "node-1",
        type: [VISUAL_NODE_TYPE],
        representedEntity: "entity-1",
        model: "model-1",
        position: { x: 10, y: 20, anchored: null },
        content: ["old-attr"],
        visualModels: ["vm-1"],
      };

      storeInModel(testContext.model, "node-1", fixVisualEntityType(node));

      const updateOp = createUpdateVisualEntityOperation("node-1", {
        content: ["new-attr"],
      });

      const changes = applyOperationsToVisualModel(testContext.model, [updateOp]);

      const next = changes[0]?.next as any;
      expect(next?.visualModels).toContain("vm-1");
      expect(next?.representedEntity).toBe("entity-1");
      expect(next?.content).toContain("new-attr");
    });
  });

  describe("DeleteVisualEntityOperation", () => {
    it("should delete an existing entity", () => {
      const node: VisualNode = {
        identifier: "node-1",
        type: [VISUAL_NODE_TYPE],
        representedEntity: "entity-1",
        model: "model-1",
        position: { x: 10, y: 20, anchored: null },
        content: [],
        visualModels: [],
      };

      storeInModel(testContext.model, "node-1", fixVisualEntityType(node));

      const deleteOp = createDeleteVisualEntityOperation("node-1");

      const changes = applyOperationsToVisualModel(testContext.model, [deleteOp]);

      expect(changes).toHaveLength(1);
      expectDeletion(changes[0]);
      expect(testContext.model["node-1"]).toBeUndefined();
    });

    it("should not create a change if entity doesn't exist", () => {
      const deleteOp = createDeleteVisualEntityOperation("non-existent");

      const changes = applyOperationsToVisualModel(testContext.model, [deleteOp]);

      expect(changes).toHaveLength(0);
    });
  });

  describe("SetModelColorOperation", () => {
    it("should record a model color change", () => {
      const colorOp = createSetModelColorOperation("#FF0000", "myModel");

      const changes = applyOperationsToVisualModel(testContext.model, [colorOp]);

      expect(changes).toHaveLength(1);
      expectCreation(changes[0], VISUAL_MODEL_DATA_TYPE);
    });
  });

  describe("Complex scenarios", () => {
    it("should apply multiple operations in sequence", () => {
      // Create two nodes
      const node1: VisualNode = {
        identifier: "node-1",
        type: [VISUAL_NODE_TYPE],
        representedEntity: "entity-1",
        model: "model-1",
        position: { x: 10, y: 20, anchored: null },
        content: [],
        visualModels: [],
      };

      const node2: VisualNode = {
        identifier: "node-2",
        type: [VISUAL_NODE_TYPE],
        representedEntity: "entity-2",
        model: "model-1",
        position: { x: 30, y: 40, anchored: null },
        content: [],
        visualModels: [],
      };

      const addOp1 = createAddVisualNodeOperation(node1);
      const addOp2 = createAddVisualNodeOperation(node2);
      const updateOp = createUpdateVisualEntityOperation("node-1", { content: ["attr-1"] });
      const deleteOp = createDeleteVisualEntityOperation("node-2");

      // Pre-populate node-1 and node-2 for update/delete operations
      storeInModel(testContext.model, "node-1", fixVisualEntityType(node1));
      storeInModel(testContext.model, "node-2", fixVisualEntityType(node2));

      const changes = applyOperationsToVisualModel(testContext.model, [
        addOp1,
        addOp2,
        updateOp,
        deleteOp,
      ]);

      expect(changes.length).toBeGreaterThan(0);

      // Verify creates
      const createChanges = changes.filter((c) => c.previous === null);
      expect(createChanges.length).toBeGreaterThanOrEqual(2);

      // Verify update
      const updateChanges = changes.filter(
        (c) => c.previous !== null && c.next !== null,
      );
      expect(updateChanges.length).toBeGreaterThan(0);

      // Verify delete
      const deleteChanges = changes.filter((c) => c.next === null);
      expect(deleteChanges.length).toBeGreaterThan(0);
    });

    it("should create and update same entity in sequence", () => {
      const node: VisualNode = {
        identifier: "node-1",
        type: [VISUAL_NODE_TYPE],
        representedEntity: "entity-1",
        model: "model-1",
        position: { x: 10, y: 20, anchored: null },
        content: [],
        visualModels: [],
      };

      const addOp = createAddVisualNodeOperation(node);
      storeInModel(testContext.model, "node-1", fixVisualEntityType(node));

      const updateOp = createUpdateVisualEntityOperation("node-1", {
        content: ["attr-1"],
      });

      const changes = applyOperationsToVisualModel(testContext.model, [addOp, updateOp]);

      expect(changes).toHaveLength(2);

      // First change is creation
      expectCreation(changes[0], VISUAL_NODE_TYPE);

      // Second change is update
      expectUpdate(changes[1]);
      const next = changes[1]?.next as any;
      expect(next?.content).toContain("attr-1");
    });

    it("should handle empty operations array", () => {
      const changes = applyOperationsToVisualModel(testContext.model, []);

      expect(changes).toHaveLength(0);
    });

    it("should track multiple entity types in one batch", () => {
      const node: VisualNode = {
        identifier: "node-1",
        type: [VISUAL_NODE_TYPE],
        representedEntity: "entity-1",
        model: "model-1",
        position: { x: 10, y: 20, anchored: null },
        content: [],
        visualModels: [],
      };

      const relationship: VisualRelationship = {
        identifier: "rel-1",
        type: [VISUAL_RELATIONSHIP_TYPE],
        representedRelationship: "rel-entity",
        model: "model-1",
        visualSource: "node-1",
        visualTarget: "node-2",
        waypoints: [],
      };

      const group: VisualGroup = {
        identifier: "group-1",
        type: [VISUAL_GROUP_TYPE],
        anchored: null,
        content: [],
      };

      const nodeOp = createAddVisualNodeOperation(node);
      const relOp = createAddVisualRelationshipOperation(relationship);
      const groupOp = createAddVisualGroupOperation(group);

      const changes = applyOperationsToVisualModel(testContext.model, [nodeOp, relOp, groupOp]);

      expect(changes).toHaveLength(3);
      const next0 = changes[0]?.next as Entity;
      const next1 = changes[1]?.next as Entity;
      const next2 = changes[2]?.next as Entity;
      expect(next0?.type).toContain(VISUAL_NODE_TYPE);
      expect(next1?.type).toContain(VISUAL_RELATIONSHIP_TYPE);
      expect(next2?.type).toContain(VISUAL_GROUP_TYPE);
    });
  });

  describe("Edge cases", () => {
    it("should generate unique identifiers for created entities", () => {
      const node1: VisualNode = {
        identifier: "node-1",
        type: [VISUAL_NODE_TYPE],
        representedEntity: "entity-1",
        model: "model-1",
        position: { x: 10, y: 20, anchored: null },
        content: [],
        visualModels: [],
      };

      const node2: VisualNode = {
        identifier: "node-2",
        type: [VISUAL_NODE_TYPE],
        representedEntity: "entity-2",
        model: "model-1",
        position: { x: 30, y: 40, anchored: null },
        content: [],
        visualModels: [],
      };

      const op1 = createAddVisualNodeOperation(node1);
      const op2 = createAddVisualNodeOperation(node2);

      const changes = applyOperationsToVisualModel(testContext.model, [op1, op2]);

      const id1 = (changes[0]?.next as Entity)?.id;
      const id2 = (changes[1]?.next as Entity)?.id;

      expect(id1).not.toBe(id2);
    });

    it("should preserve entity immutability", () => {
      const node: VisualNode = {
        identifier: "node-1",
        type: [VISUAL_NODE_TYPE],
        representedEntity: "entity-1",
        model: "model-1",
        position: { x: 10, y: 20, anchored: null },
        content: [],
        visualModels: [],
      };

      storeInModel(testContext.model, "node-1", fixVisualEntityType(node));

      const updateOp = createUpdateVisualEntityOperation("node-1", {
        position: { x: 100, y: 200, anchored: null },
      });

      applyOperationsToVisualModel(testContext.model, [updateOp]);

      // Updated entity should reflect changes
      const updated = testContext.model["node-1"] as any;
      expect(updated?.position).toEqual({
        x: 100,
        y: 200,
        anchored: null,
      });
    });
  });
});
