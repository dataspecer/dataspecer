/**
 * Tests actions related to layouting. That is {@link layoutActiveVisualModelAction}
 * and {@link findPositionForNewNodesUsingLayouting}
 */

import { expect, test } from "vitest";
import { isVisualNode } from "@dataspecer/visual-model";
import { ExplicitAnchors, getDefaultUserGivenAlgorithmConfigurationsFull } from "@dataspecer/layout";
import { isSemanticModelClass } from "@dataspecer/core-v2/semantic-model/concepts";
import { ActionsTestSuite, notificationMockup, TestedSemanticConnectionType } from "./test/actions-test-suite";
import { findPositionForNewNodesUsingLayouting, layoutActiveVisualModelAction } from "./layout-visual-model";

test("Test anchored nodes in layouting not moving", async () => {
  const connectionType = TestedSemanticConnectionType.Association;

  const {
    classesContext,
    graph,
    models,
    visualModel,
  } = ActionsTestSuite.prepareModelsWithSemanticData(0, connectionType);
  const diagram = ActionsTestSuite.createTestDiagram();
  const fullyConnectedModel = [...models.entries()][2][1];

  const { nodes } = ActionsTestSuite.fillVisualModelWithData(
    fullyConnectedModel, visualModel, connectionType);

  const layoutConfiguration = getDefaultUserGivenAlgorithmConfigurationsFull();
  layoutConfiguration.chosenMainAlgorithm = "elk_stress";
  layoutConfiguration.main.elk_stress.run_node_overlap_removal_after = false;
  layoutConfiguration.main.elk_stress.interactive = true;
  layoutConfiguration.main.elk_stress.stress_edge_len = 500;
  const explicitAnchors: ExplicitAnchors | undefined = undefined;

  const defaultPosition = { x: 10000, y: 10000, anchored: true };
  for(const node of nodes) {
    visualModel.updateVisualEntity(node, { position: { ...defaultPosition } });
  }
  visualModel.updateVisualEntity(nodes.at(-1)!, { position: { x: 10000, y: 10000, anchored: null } });

  await layoutActiveVisualModelAction(
    notificationMockup, classesContext, diagram, graph,
    visualModel, layoutConfiguration, explicitAnchors);

  const result = nodes.map(node => visualModel.getVisualEntity(node))
    .filter(visualNode => visualNode !== null)
    .filter(isVisualNode);

  expect(result.length).toBe(4);
  expect(result[0].position).toEqual(defaultPosition);
  expect(result[1].position).toEqual(defaultPosition);
  expect(result[2].position).toEqual(defaultPosition);
  expect(result[3].position).not.toEqual(defaultPosition);
});

test("Test that finding position doesn't insert new visual entities into model", async () => {
  const {
    classesContext,
    graph,
    models,
    visualModel,
  } = ActionsTestSuite.prepareModelsWithSemanticData(0, TestedSemanticConnectionType.Association);
  const diagram = ActionsTestSuite.createTestDiagram();
  const model = [...models.entries()][1][1];

  let sourceNode = "";
  const classIdentifiersToAdd = [];
  for(const entity of Object.values(model.getEntities())) {
    if(isSemanticModelClass(entity)) {
      if(sourceNode === "") {
        sourceNode = ActionsTestSuite.createNewVisualNodeForTesting(visualModel, model.getId(), entity.id);
      }
      else {
        classIdentifiersToAdd.push(entity.id);
      }
    }
  }

  const result = await findPositionForNewNodesUsingLayouting(
    notificationMockup, diagram, graph, visualModel,
    classesContext, classIdentifiersToAdd);
  expect([...visualModel.getVisualEntities().entries()].length).toBe(1);
  expect(Object.keys(result)).toEqual(classIdentifiersToAdd);
});
