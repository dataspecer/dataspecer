import { describe, expect, test } from "vitest";

import {
  createClass,
  createClassProfile,
  createOperationTestContext,
  showClass,
  showClassProfile,
  visualProfileRelationships,
} from "../operation-test-utilities";

describe("showProfileClass", () => {

  test("Showing the profile adds the edge to the profiled class.", async () => {
    const context = createOperationTestContext();
    const first = await createClass(context, "first");
    const firstNode = await showClass(context, first, 0);
    const profile = await createClassProfile(context, first);

    const profileNode = await showClassProfile(context, profile, 0);
    expect(profileNode.representedEntity).toBe(profile);
    const edges = visualProfileRelationships(context.visualModel);
    expect(edges.length).toBe(1);
    expect(edges[0].visualSource).toBe(profileNode.id);
    expect(edges[0].visualTarget).toBe(firstNode.id);
  });

});
