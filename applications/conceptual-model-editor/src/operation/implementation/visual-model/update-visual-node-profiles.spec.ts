import { describe, expect, test } from "vitest";

import { cmeOperations } from "../../operations";
import {
  createClass,
  createClassProfile,
  createOperationTestContext,
  getVisualNode,
  run,
  showClass,
  showClassProfile,
  visualProfileRelationships,
} from "../operation-test-utilities";

describe("updateVisualNodeProfiles", () => {

  test("Profile edges follow changes in profiled entities.", async () => {
    const context = createOperationTestContext();
    const first = await createClass(context, "first");
    const second = await createClass(context, "second");
    await showClass(context, first, 0);
    await showClass(context, second, 500);
    const profile = await createClassProfile(context, first);
    // Showing the profile adds the edge to the first class.
    await showClassProfile(context, profile, 0);
    expect(visualProfileRelationships(context.visualModel).length).toBe(1);

    await run(context, cmeOperations.updateVisualNodeProfiles.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      entity: profile,
      model: context.semanticModel.getId(),
      previous: [first],
      next: [second],
    }));
    const edges = visualProfileRelationships(context.visualModel);
    expect(edges.length).toBe(1);
    const target = getVisualNode(context.visualModel, edges[0].visualTarget);
    expect(target.representedEntity).toBe(second);
  });

});
