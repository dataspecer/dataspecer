import { createDefaultEntityModel } from "./entity-model/default-entity-model.ts";
import { VisualEntity, VisualNode, isVisualNode } from "./concepts/index.ts";
import { createDefaultVisualModelFactory } from "./visual-model-factory.ts";
import { WritableVisualModel } from "./writable-visual-model.ts";
import { VISUAL_MODE_TYPE } from "./visual-model.ts";

const factory = createDefaultVisualModelFactory();

test("Create default visual model.", () => {
  const identifier = "abc";
  const model = createModel(identifier);
  //
  expect(model.getIdentifier()).toBe(identifier);
});

function createModel(identifier: string) : WritableVisualModel {
  const internal = createDefaultEntityModel(VISUAL_MODE_TYPE, identifier);
  const model = factory.createWritableVisualModelSyncNoWrap(internal);
  expect(model).not.toBeNull;
  // TypeScript does not infer the not null from previous line.
  return model as WritableVisualModel;
}

test("Set and delete model color.", () => {
  const model = createModel("abc");
  //
  expect(model.getModelColor("1234")).toBeNull();
  model.setModelColor("1234", "#00ff00");
  expect(model.getModelColor("1234")).toBe("#00ff00");
  model.deleteModelColor("1234");
  expect(model.getModelColor("1234")).toBeNull();
});

test("Set and delete visual entity.", () => {
  const model = createModel("abc");
  const numberOfEntitiesInModelAfterInitialization = [...model.getVisualEntities().entries()].length;
  //
  expect(model.getVisualEntitiesForRepresented("s").length).toBe(0);
  model.addVisualNode({
    representedEntity: "s",
    model: "m",
    content: [],
    visualModels: [],
    position: { x: 100, y: 200, anchored: null },
  });
  const actual = model.getVisualEntitiesForRepresented("s");
  expect(actual.length).toBeGreaterThan(0);
  expect(isVisualNode(actual[0] as VisualEntity)).toBeTruthy();
  const visualNode = actual[0] as VisualNode;
  expect(visualNode.representedEntity).toBe("s");
  model.deleteVisualEntity(visualNode.identifier);
  expect(model.getVisualEntitiesForRepresented("s").length).toBe(0);
  expect([...model.getVisualEntities().entries()].length).toBe(numberOfEntitiesInModelAfterInitialization);
});

test("Create 2 visual entities for one semantic and remove one of the visuals.", () => {
  const model = createModel("abc");
  //
  expect(model.getVisualEntitiesForRepresented("s").length).toBe(0);
  model.addVisualNode({
    representedEntity: "s",
    model: "m",
    content: [],
    visualModels: [],
    position: { x: 100, y: 200, anchored: null },
  });
  model.addVisualNode({
    representedEntity: "s",
    model: "m",
    content: [],
    visualModels: [],
    position: { x: 200, y: 300, anchored: null },
  });
  const actual = model.getVisualEntitiesForRepresented("s");
  expect(actual.length).toBe(2);
  const [visualNode1, visualNode2] = actual as VisualNode[];
  //
  expect(isVisualNode(visualNode1!)).toBeTruthy();
  expect(visualNode1!.representedEntity).toBe("s");
  //
  expect(isVisualNode(visualNode2!)).toBeTruthy();
  expect(visualNode2!.representedEntity).toBe("s");
  //
  model.deleteVisualEntity(visualNode1!.identifier);
  expect(model.getVisualEntitiesForRepresented("s").length).toBe(1);
});

test("Create and set visual view.", () => {
  const model = createModel("abc");
  // This should create new entity.
  model.setView({
    initialPositions: {x: 0, y: 0},
  });
  expect(model.getVisualEntities().size).toBe(1);
  // This should not create a new entity.
  model.setView({
    initialPositions: {x: 10, y: 10},
  });
  expect(model.getVisualEntities().size).toBe(1);
});
