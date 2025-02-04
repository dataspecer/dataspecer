import { expect, test } from "vitest";
import { noActionNotificationServiceWriter } from "../../notification/notification-service-context";
import { addGroupToVisualModelAction } from "../add-group-to-visual-model";
import { createDefaultVisualModelFactory, VisualGroup, WritableVisualModel } from "@dataspecer/core-v2/visual-model";
import { removeTopLevelGroupFromVisualModelAction } from "../remove-group-from-visual-model";
import { removeFromVisualModelAction } from "../remove-from-visual-model";
import { removePartOfGroupContentAction } from "../remove-part-of-group-content";

test("Test dissolving top level groups", () => {
  const visualModel: WritableVisualModel = createDefaultVisualModelFactory().createNewWritableVisualModelSync();
  const model = "TEST MODEL";

  const visualIdentifiers = [];
  for(let i = 0; i < 4; i++) {
    const visualIdentifier = createNewVisualNodeForTesting(visualModel, model, i);
    visualIdentifiers.push(visualIdentifier);
  }
  const group1 = addGroupToVisualModelAction(
    visualModel,
    [visualIdentifiers[0], visualIdentifiers[1]],
  );
  const group2 = addGroupToVisualModelAction(
    visualModel,
    [visualIdentifiers[2], visualIdentifiers[3]],
  );
  addGroupToVisualModelAction(
    visualModel,
    [group1, group2],
  );

  expect(visualModel.getVisualEntities().size).toEqual(7);
  removeTopLevelGroupFromVisualModelAction(noActionNotificationServiceWriter, visualModel, visualIdentifiers[0]);
  expect(visualModel.getVisualEntities().size).toEqual(6);
  removeTopLevelGroupFromVisualModelAction(noActionNotificationServiceWriter, visualModel, visualIdentifiers[0]);
  expect(visualModel.getVisualEntities().size).toEqual(5);
  removeTopLevelGroupFromVisualModelAction(noActionNotificationServiceWriter, visualModel, visualIdentifiers[0]);
  expect(visualModel.getVisualEntities().size).toEqual(5);
  removeTopLevelGroupFromVisualModelAction(noActionNotificationServiceWriter, visualModel, visualIdentifiers[2]);
  expect(visualModel.getVisualEntities().size).toEqual(4);
});

test("Test dissolving group through visibility", () => {
  const visualModel: WritableVisualModel = createDefaultVisualModelFactory().createNewWritableVisualModelSync();
  const model = "TEST MODEL";

  const visualIdentifiers = [];
  for(let i = 0; i < 3; i++) {
    const visualIdentifier = createNewVisualNodeForTesting(visualModel, model, i);
    visualIdentifiers.push(visualIdentifier);
  }
  addGroupToVisualModelAction(
    visualModel,
    [visualIdentifiers[0], visualIdentifiers[1]],
  );

  expect(visualModel.getVisualEntities().size).toEqual(4);
  removeFromVisualModelAction(noActionNotificationServiceWriter, visualModel, ["0", "1"], false);
  expect(visualModel.getVisualEntities().size).toEqual(1);
});

test("Test dissolving multi-group through visibility of one whole group", () => {
  const visualModel: WritableVisualModel = createDefaultVisualModelFactory().createNewWritableVisualModelSync();
  const model = "TEST MODEL";

  const visualIdentifiers = [];
  for(let i = 0; i < 4; i++) {
    const visualIdentifier = createNewVisualNodeForTesting(visualModel, model, i);
    visualIdentifiers.push(visualIdentifier);
  }
  const group1 = addGroupToVisualModelAction(
    visualModel,
    [visualIdentifiers[0], visualIdentifiers[1]],
  );
  const group2 = addGroupToVisualModelAction(
    visualModel,
    [visualIdentifiers[2], visualIdentifiers[3]],
  );
  addGroupToVisualModelAction(
    visualModel,
    [group1, group2],
  );

  expect(visualModel.getVisualEntities().size).toEqual(7);
  removeFromVisualModelAction(noActionNotificationServiceWriter, visualModel, ["0", "1"], false);
  expect(visualModel.getVisualEntities().size).toEqual(3);
});

test("Test dissolving multi-group through visibility sequentially", () => {
  const visualModel: WritableVisualModel = createDefaultVisualModelFactory().createNewWritableVisualModelSync();
  const model = "TEST MODEL";

  const visualIdentifiers = [];
  for(let i = 0; i < 4; i++) {
    const visualIdentifier = createNewVisualNodeForTesting(visualModel, model, i);
    visualIdentifiers.push(visualIdentifier);
  }
  const group1 = addGroupToVisualModelAction(
    visualModel,
    [visualIdentifiers[0], visualIdentifiers[1]],
  );
  const group2 = addGroupToVisualModelAction(
    visualModel,
    [visualIdentifiers[2], visualIdentifiers[3]],
  );
  const group3 = addGroupToVisualModelAction(
    visualModel,
    [group1, group2],
  );

  expect(visualModel.getVisualEntities().size).toEqual(7);
  removeFromVisualModelAction(noActionNotificationServiceWriter, visualModel, ["0"], false);
  expect(visualModel.getVisualEntities().size).toEqual(6);
  removeFromVisualModelAction(noActionNotificationServiceWriter, visualModel, ["3"], false);
  expect(visualModel.getVisualEntities().size).toEqual(5);
  removeTopLevelGroupFromVisualModelAction(noActionNotificationServiceWriter, visualModel, group3);
  expect(visualModel.getVisualEntities().size).toEqual(2);
});

test("Test dissolving multi-group through visibility sequentially again", () => {
  const visualModel: WritableVisualModel = createDefaultVisualModelFactory().createNewWritableVisualModelSync();
  const model = "TEST MODEL";

  const visualIdentifiers = [];
  for(let i = 0; i < 4; i++) {
    const visualIdentifier = createNewVisualNodeForTesting(visualModel, model, i);
    visualIdentifiers.push(visualIdentifier);
  }
  const group1 = addGroupToVisualModelAction(
    visualModel,
    [visualIdentifiers[0], visualIdentifiers[1]],
  );
  const group2 = addGroupToVisualModelAction(
    visualModel,
    [visualIdentifiers[2], visualIdentifiers[3]],
  );
  addGroupToVisualModelAction(
    visualModel,
    [group1, group2],
  );

  expect(visualModel.getVisualEntities().size).toEqual(7);
  removeFromVisualModelAction(noActionNotificationServiceWriter, visualModel, ["0"], false);
  expect(visualModel.getVisualEntities().size).toEqual(6);
  removeFromVisualModelAction(noActionNotificationServiceWriter, visualModel, ["3"], false);
  expect(visualModel.getVisualEntities().size).toEqual(5);
  removeTopLevelGroupFromVisualModelAction(noActionNotificationServiceWriter, visualModel, group1);
  expect(visualModel.getVisualEntities().size).toEqual(2);      // "1", "2"
});

test("Test dissolving everything through visiblity", () => {
  const visualModel: WritableVisualModel = createDefaultVisualModelFactory().createNewWritableVisualModelSync();
  const model = "TEST MODEL";

  const visualIdentifiers = [];
  for(let i = 0; i < 4; i++) {
    const visualIdentifier = createNewVisualNodeForTesting(visualModel, model, i);
    visualIdentifiers.push(visualIdentifier);
  }
  const group1 = addGroupToVisualModelAction(
    visualModel,
    [visualIdentifiers[0], visualIdentifiers[1]],
  );
  const group2 = addGroupToVisualModelAction(
    visualModel,
    [visualIdentifiers[2], visualIdentifiers[3]],
  );
  addGroupToVisualModelAction(
    visualModel,
    [group1, group2],
  );

  expect(visualModel.getVisualEntities().size).toEqual(7);
  removeFromVisualModelAction(noActionNotificationServiceWriter, visualModel, ["0", "1", "2", "3"], false);
  expect(visualModel.getVisualEntities().size).toEqual(0);
});

test("Test removing part of visual group", () => {
  const visualModel: WritableVisualModel = createDefaultVisualModelFactory().createNewWritableVisualModelSync();
  const model = "TEST MODEL";

  const visualIdentifiers = [];
  for(let i = 0; i < 4; i++) {
    const visualIdentifier = createNewVisualNodeForTesting(visualModel, model, i);
    visualIdentifiers.push(visualIdentifier);
  }
  const group1 = addGroupToVisualModelAction(
    visualModel,
    [visualIdentifiers[0], visualIdentifiers[1]],
  );
  const group2 = addGroupToVisualModelAction(
    visualModel,
    [visualIdentifiers[2], visualIdentifiers[3]],
  );
  const group3 = addGroupToVisualModelAction(
    visualModel,
    [group1, group2],
  );

  expect(visualModel.getVisualEntities().size).toEqual(7);
  removePartOfGroupContentAction(noActionNotificationServiceWriter, visualModel, group1, [visualIdentifiers[3]], false);
  expect(visualModel.getVisualEntities().size).toEqual(7);
  removePartOfGroupContentAction(noActionNotificationServiceWriter, visualModel, group1, [visualIdentifiers[1]], false);
  expect(visualModel.getVisualEntities().size).toEqual(7);
  expect((visualModel.getVisualEntity(group1) as VisualGroup).content).toEqual([visualIdentifiers[0]]);
  removePartOfGroupContentAction(noActionNotificationServiceWriter, visualModel, group1, [visualIdentifiers[0]], false);
  expect(visualModel.getVisualEntity(group1)).toEqual(null);
  expect(visualModel.getVisualEntity(group3)).toEqual(null);      // Because the group will have only 1 underlying group therefore it can be destroyed
  expect(visualModel.getVisualEntities().size).toEqual(5);
});

//

export const createNewVisualNodeForTesting = (visualModel: WritableVisualModel, model: string, semanticIdentifierAsNumber: number) => {
  const visualId = visualModel.addVisualNode({
    representedEntity: semanticIdentifierAsNumber.toString(),
    model,
    content: [],
    visualModels: [],
    position: { x: semanticIdentifierAsNumber, y: 0, anchored: null },
  });

  return visualId;
}
