import { expect, test } from "vitest";
import { createDefaultVisualModelFactory, VisualGroup, WritableVisualModel } from "@dataspecer/visual-model";
import { ActionsTestSuite, notificationMockup, TestedSemanticConnectionType } from "./test/actions-test-suite";
import { addGroupToVisualModelAction } from "./add-group-to-visual-model";
import { removeTopLevelGroupFromVisualModelAction } from "./remove-group-from-visual-model";
import { removeFromVisualModelByRepresentedAction } from "./remove-from-visual-model-by-represented";
import { removePartOfGroupContentAction } from "./remove-part-of-group-content";

test("Test dissolving top level groups", () => {
  const {
    visualModel,
    visualNodeIdentifiers
  } = ActionsTestSuite.prepareModelsWithSemanticData(4, TestedSemanticConnectionType.Association);

  const group1 = addGroupToVisualModelAction(
    visualModel,
    [visualNodeIdentifiers[0], visualNodeIdentifiers[1]],
  );
  const group2 = addGroupToVisualModelAction(
    visualModel,
    [visualNodeIdentifiers[2], visualNodeIdentifiers[3]],
  );
  addGroupToVisualModelAction(
    visualModel,
    [group1, group2],
  );
  expect(visualModel.getVisualEntities().size).toEqual(7);
  //
  removeTopLevelGroupFromVisualModelAction(notificationMockup, visualModel, visualNodeIdentifiers[0]);
  expect(visualModel.getVisualEntities().size).toEqual(6);
  //
  removeTopLevelGroupFromVisualModelAction(notificationMockup, visualModel, visualNodeIdentifiers[0]);
  expect(visualModel.getVisualEntities().size).toEqual(5);
  //
  removeTopLevelGroupFromVisualModelAction(notificationMockup, visualModel, visualNodeIdentifiers[0]);
  expect(visualModel.getVisualEntities().size).toEqual(5);
  //
  removeTopLevelGroupFromVisualModelAction(notificationMockup, visualModel, visualNodeIdentifiers[2]);
  expect(visualModel.getVisualEntities().size).toEqual(4);
});

test("Test dissolving group through visibility", () => {
  const {
    visualModel,
    visualNodeIdentifiers,
    graph,
    classesContext,
  } = ActionsTestSuite.prepareModelsWithSemanticData(3, TestedSemanticConnectionType.Association);

  addGroupToVisualModelAction(
    visualModel,
    [visualNodeIdentifiers[0], visualNodeIdentifiers[1]],
  );
  expect(visualModel.getVisualEntities().size).toEqual(4);
  //
  removeFromVisualModelByRepresentedAction(
    notificationMockup, graph, classesContext, visualModel, ["0", "1"]);
  expect(visualModel.getVisualEntities().size).toEqual(1);
});

test("Test dissolving multi-group through visibility of one whole group", () => {
  const {
    visualModel,
    visualNodeIdentifiers,
    graph,
    classesContext,
  } = ActionsTestSuite.prepareModelsWithSemanticData(4, TestedSemanticConnectionType.Association);

  const group1 = addGroupToVisualModelAction(
    visualModel,
    [visualNodeIdentifiers[0], visualNodeIdentifiers[1]],
  );
  const group2 = addGroupToVisualModelAction(
    visualModel,
    [visualNodeIdentifiers[2], visualNodeIdentifiers[3]],
  );
  addGroupToVisualModelAction(
    visualModel,
    [group1, group2],
  );
  expect(visualModel.getVisualEntities().size).toEqual(7);
  //
  removeFromVisualModelByRepresentedAction(
    notificationMockup, graph, classesContext, visualModel, ["0", "1"]);
  expect(visualModel.getVisualEntities().size).toEqual(3);
});

test("Test dissolving multi-group through visibility sequentially", () => {
  const {
    visualModel,
    visualNodeIdentifiers,
    graph,
    classesContext,
  } = ActionsTestSuite.prepareModelsWithSemanticData(4, TestedSemanticConnectionType.Association);

  const group1 = addGroupToVisualModelAction(
    visualModel,
    [visualNodeIdentifiers[0], visualNodeIdentifiers[1]],
  );
  const group2 = addGroupToVisualModelAction(
    visualModel,
    [visualNodeIdentifiers[2], visualNodeIdentifiers[3]],
  );
  const group3 = addGroupToVisualModelAction(
    visualModel,
    [group1, group2],
  );
  expect(visualModel.getVisualEntities().size).toEqual(7);
  //
  removeFromVisualModelByRepresentedAction(
    notificationMockup, graph, classesContext, visualModel, ["0"]);
  expect(visualModel.getVisualEntities().size).toEqual(6);
  //
  removeFromVisualModelByRepresentedAction(
    notificationMockup, graph, classesContext, visualModel, ["3"]);
  expect(visualModel.getVisualEntities().size).toEqual(5);
  //
  removeTopLevelGroupFromVisualModelAction(notificationMockup, visualModel, group3);
  expect(visualModel.getVisualEntities().size).toEqual(2);
});

test("Test dissolving multi-group through visibility sequentially again", () => {
  const {
    visualModel,
    visualNodeIdentifiers,
    graph,
    classesContext,
  } = ActionsTestSuite.prepareModelsWithSemanticData(4, TestedSemanticConnectionType.Association);

  const group1 = addGroupToVisualModelAction(
    visualModel,
    [visualNodeIdentifiers[0], visualNodeIdentifiers[1]],
  );
  const group2 = addGroupToVisualModelAction(
    visualModel,
    [visualNodeIdentifiers[2], visualNodeIdentifiers[3]],
  );
  addGroupToVisualModelAction(
    visualModel,
    [group1, group2],
  );
  expect(visualModel.getVisualEntities().size).toEqual(7);
  //
  removeFromVisualModelByRepresentedAction(
    notificationMockup, graph, classesContext, visualModel, ["0"]);
  expect(visualModel.getVisualEntities().size).toEqual(6);
  //
  removeFromVisualModelByRepresentedAction(
    notificationMockup, graph, classesContext, visualModel, ["3"]);
  expect(visualModel.getVisualEntities().size).toEqual(5);
  //
  removeTopLevelGroupFromVisualModelAction(notificationMockup, visualModel, group1);
  expect(visualModel.getVisualEntities().size).toEqual(2);      // "1", "2"
});

test("Test dissolving everything through visiblity", () => {
  const {
    visualModel,
    visualNodeIdentifiers,
    graph,
    classesContext,
  } = ActionsTestSuite.prepareModelsWithSemanticData(4, TestedSemanticConnectionType.Association);

  const group1 = addGroupToVisualModelAction(
    visualModel,
    [visualNodeIdentifiers[0], visualNodeIdentifiers[1]],
  );
  const group2 = addGroupToVisualModelAction(
    visualModel,
    [visualNodeIdentifiers[2], visualNodeIdentifiers[3]],
  );
  addGroupToVisualModelAction(
    visualModel,
    [group1, group2],
  );
  expect(visualModel.getVisualEntities().size).toEqual(7);
  //
  removeFromVisualModelByRepresentedAction(
    notificationMockup, graph, classesContext, visualModel, ["0", "1", "2", "3"]);
  expect(visualModel.getVisualEntities().size).toEqual(0);
});

test("Test removing part of visual group", () => {
  const visualModel: WritableVisualModel = createDefaultVisualModelFactory().createNewWritableVisualModelSync(null);
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
  //
  removePartOfGroupContentAction(notificationMockup, visualModel, group1, [visualIdentifiers[3]], false);
  expect(visualModel.getVisualEntities().size).toEqual(7);
  //
  removePartOfGroupContentAction(notificationMockup, visualModel, group1, [visualIdentifiers[1]], false);
  expect(visualModel.getVisualEntities().size).toEqual(7);
  expect((visualModel.getVisualEntity(group1) as VisualGroup).content).toEqual([visualIdentifiers[0]]);
  //
  removePartOfGroupContentAction(notificationMockup, visualModel, group1, [visualIdentifiers[0]], false);
  expect(visualModel.getVisualEntity(group1)).toEqual(null);
  // Because the group will have only 1 underlying group therefore it can be destroyed
  expect(visualModel.getVisualEntity(group3)).toEqual(null);
  expect(visualModel.getVisualEntities().size).toEqual(5);
});

//

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
