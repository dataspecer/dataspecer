/**
 * Tests Utilities actions
 */

import { expect, test } from "vitest";

import {
  computeRelatedAssociationsBarycenterAction,
  findTopLevelGroupInVisualModel,
  getGroupMappings,
  getRemovedAndAdded,
  getSelections
} from "./utilities";
import {
  isSemanticModelClass,
  SemanticModelClass,
  SemanticModelRelationship
} from "@dataspecer/core-v2/semantic-model/concepts";
import { addGroupToVisualModelAction } from "./add-group-to-visual-model";
import { UseDiagramType } from "../diagram/diagram-hook";
import { DiagramActions, DiagramCallbacks, Edge, Node } from "../diagram";
import { Selections } from "./filter-selection-action";
import { ActionsTestSuite, notificationMockup, TestedSemanticConnectionType } from "./test/actions-test-suite";

test("Test getRemovedAndAdded", () => {
  const previous = ["0", "1"];
  const next = ["1", "2"];

  const result = getRemovedAndAdded(previous, next);
  const expectedResult = {
    removed: ["0"],
    added: ["2"]
  };

  expect(result).toEqual(expectedResult);
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
test("Test groupMappings", () => {
  const { visualModel, visualNodeIdentifiers } = ActionsTestSuite.prepareModelsWithSemanticData(
    4, TestedSemanticConnectionType.Association);
  const groups = [];
  groups.push(addGroupToVisualModelAction(visualModel, [visualNodeIdentifiers[0], visualNodeIdentifiers[1]]));
  groups.push(addGroupToVisualModelAction(visualModel, [visualNodeIdentifiers[2], visualNodeIdentifiers[3]]));
  groups.push(addGroupToVisualModelAction(visualModel, [groups[0], groups[1]]));
  const result = getGroupMappings(visualModel);
  const expectedResult = {
    existingGroups: {
      [groups[0]]: visualModel.getVisualEntity(groups[0]),
      [groups[1]]: visualModel.getVisualEntity(groups[1]),
      [groups[2]]: visualModel.getVisualEntity(groups[2]),
    },
    nodeToGroupMapping: {
      [visualNodeIdentifiers[0]]: groups[0],
      [visualNodeIdentifiers[1]]: groups[0],
      [visualNodeIdentifiers[2]]: groups[1],
      [visualNodeIdentifiers[3]]: groups[1],

      [groups[0]]: groups[2],
      [groups[1]]: groups[2],
    }
  }
  expect(result).toEqual(expectedResult);
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
test("Test findTopLevelGroupInVisualModel", () => {
  const { visualModel, visualNodeIdentifiers } = ActionsTestSuite.prepareModelsWithSemanticData(
    4, TestedSemanticConnectionType.Association);
  const groups = [];
  groups.push(addGroupToVisualModelAction(visualModel, [visualNodeIdentifiers[0], visualNodeIdentifiers[1]]));
  groups.push(addGroupToVisualModelAction(visualModel, [visualNodeIdentifiers[2], visualNodeIdentifiers[3]]));
  groups.push(addGroupToVisualModelAction(visualModel, [groups[0], groups[1]]));
  expect(findTopLevelGroupInVisualModel(visualNodeIdentifiers[0], visualModel)).toEqual(groups[2]);
  expect(findTopLevelGroupInVisualModel(visualNodeIdentifiers[2], visualModel)).toEqual(groups[2]);
  expect(findTopLevelGroupInVisualModel(groups[0], visualModel)).toEqual(groups[2]);
  expect(findTopLevelGroupInVisualModel(groups[1], visualModel)).toEqual(groups[2]);
  expect(findTopLevelGroupInVisualModel(groups[2], visualModel)).toEqual(groups[2]);
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
test("Test computeRelatedAssociationsBarycenterAction with enough neighbors", async () => {
  const { visualModel, graph, models, firstModel } = ActionsTestSuite.prepareModelsWithSemanticData(
    0, TestedSemanticConnectionType.Association);
  const emptyDiagram: UseDiagramType = {
    areActionsReady: false,
    actions: function (): DiagramActions {
      throw new Error("Function not implemented.");
    },
    setActions: function (_nextActions: DiagramActions): void {
      throw new Error("Function not implemented.");
    },
    callbacks: function (): DiagramCallbacks {
      throw new Error("Function not implemented.");
    },
    setCallbacks: function (_nextCallbacks: DiagramCallbacks): void {
      throw new Error("Function not implemented.");
    }
  };

  const modelIdentifier = firstModel.getId();

  ActionsTestSuite.createSemanticClassTestVariant(models, "", modelIdentifier, []);
  ActionsTestSuite.createSemanticClassTestVariant(models, "", modelIdentifier, []);
  ActionsTestSuite.createSemanticClassTestVariant(models, "", modelIdentifier, []);
  const semanticClasses: SemanticModelClass[] = Object.values(firstModel.getEntities()).filter(isSemanticModelClass);

  const classesContext = ActionsTestSuite.createClassesContextTypeForTests([], [], [], []);
  classesContext.classes = semanticClasses;

  ActionsTestSuite.createNewVisualNodeForTesting(
    visualModel, firstModel.getId(), semanticClasses[0].id, { x: 10, y: 10 });
  ActionsTestSuite.createNewVisualNodeForTesting(
    visualModel, firstModel.getId(), semanticClasses[1].id, { x: 20, y: 20 });
  const relationship1 = ActionsTestSuite.createSemanticRelationshipTestVariant(
    models,
    semanticClasses[0].id,
    semanticClasses[2].id,
    modelIdentifier,
  );
  classesContext.relationships.push(firstModel.getEntities()[relationship1.identifier] as SemanticModelRelationship);
  const relationship2 = ActionsTestSuite.createSemanticRelationshipTestVariant(
    models,
    semanticClasses[1].id,
    semanticClasses[2].id,
    modelIdentifier,
  );
  classesContext.relationships.push(firstModel.getEntities()[relationship2.identifier] as SemanticModelRelationship);

  const result = await computeRelatedAssociationsBarycenterAction(
    notificationMockup,
    graph, visualModel, emptyDiagram,
    classesContext, semanticClasses[2].id,
  );
  const expected = {
    position: {
      x: 15,
      y: 15,
      anchored: null
    },
    isInCenterOfViewport: false,
  }
  expect(result).toEqual(expected);
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////

test("Test getSelections - visual ids", () => {
  // Prepare
  const getSelectedNodes = (): Node[] => {
    return [ActionsTestSuite.createTestDiagramNode("node0"), ActionsTestSuite.createTestDiagramNode("node1")];
  };
  const getSelectedEdges = (): Edge[] => {
    return [ActionsTestSuite.createTestDiagramEdge("edge0"), ActionsTestSuite.createTestDiagramEdge("edge1")];
  };
  const diagram: UseDiagramType = ActionsTestSuite.createTestDiagram({ getSelectedNodes, getSelectedEdges });

  // Run
  const result = getSelections(diagram, false, true);

  // Compare
  const expected: Selections = {
    nodeSelection: ["node0", "node1"],
    edgeSelection: ["edge0", "edge1"]
  };
  expect(result).toEqual(expected);
});

test("Test getSelections - semantic ids", () => {
  const getSelectedNodes = (): Node[] => {
    return [ActionsTestSuite.createTestDiagramNode("node0"), ActionsTestSuite.createTestDiagramNode("node1")];
  };
  const getSelectedEdges = (): Edge[] => {
    return [ActionsTestSuite.createTestDiagramEdge("edge0"), ActionsTestSuite.createTestDiagramEdge("edge1")];
  };

  const diagram: UseDiagramType = ActionsTestSuite.createTestDiagram({ getSelectedNodes, getSelectedEdges });
  const result = getSelections(diagram, false, false);

  const expected: Selections = {
    nodeSelection: ["enode0", "enode1"],
    edgeSelection: ["eedge0", "eedge1"]
  };
  expect(result).toEqual(expected);
});
