/**
 * Tests:
 * {@link addVisualDiagramNodeForExistingModelToVisualModelAction}
 */

import { expect, test } from "vitest";
import {
  createDefaultVisualModelFactory,
  isVisualDiagramNode,
  VisualDiagramNode,
} from "@dataspecer/visual-model";

import { notificationMockup, TestedSemanticConnectionType } from "./test/actions-test-suite";
import { ActionsTestSuite } from "./test/actions-test-suite";
import {
  addVisualDiagramNodeForExistingModelToVisualModelAction
} from "./create-visual-diagram-node-for-existing-model";

test("Test creating visual diagram node from existing visual model", () => {
  const {
    visualModel,
    firstModel,
    graph
  } = ActionsTestSuite.prepareModelsWithSemanticData(0, TestedSemanticConnectionType.Association);
  const diagram = ActionsTestSuite.createTestDiagram();

  // Prepare data
  const referencedVisualModel = createDefaultVisualModelFactory().createNewWritableVisualModelSync(null);
  ActionsTestSuite.createNewVisualNodeForTesting(referencedVisualModel, firstModel.getId(), "2");
  ActionsTestSuite.createNewVisualNodeForTesting(referencedVisualModel, firstModel.getId(), "3");
  graph.aggregator.addModel(referencedVisualModel);

  // Perform action
  addVisualDiagramNodeForExistingModelToVisualModelAction(
    notificationMockup, graph, diagram, visualModel, referencedVisualModel.getIdentifier());

  // Check results
  expect([...visualModel.getVisualEntities().keys()].length).toBe(1);
  const visualDiagramNode = [...visualModel.getVisualEntities().values()][0];
  expect(isVisualDiagramNode(visualDiagramNode)).toBeTruthy();
  expect((visualDiagramNode as VisualDiagramNode).representedVisualModel)
    .toBe(referencedVisualModel.getIdentifier());
});
