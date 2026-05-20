import { beforeEach, describe, expect, test } from "vitest";
import {
  addToRecordArray,
  capitalizeFirstLetter,
  findLineCenter,
  findTopLevelGroup,
  getGroupMappings,
  getNonGroupNodesInGroup,
  PhantomElementsFactory,
  placeCoordinateOnGrid,
  placePositionOnGrid,
  reverseDirection,
  Direction,
} from "./utils.ts";

describe("utils", () => {
  test("addToRecordArray creates and appends values", () => {
    const map: Record<string, number[]> = {};

    addToRecordArray("a", 1, map);
    addToRecordArray("a", 2, map);
    addToRecordArray("b", 3, map);

    expect(map).toEqual({
      a: [1, 2],
      b: [3],
    });
  });

  test("findTopLevelGroup resolves null, direct and nested membership", () => {
    const existingGroups = {
      "group-A": { identifier: "group-A" },
      "group-B": { identifier: "group-B" },
      "group-C": { identifier: "group-C" },
    };
    const nodeToGroupMapping = {
      "node-1": "group-A",
      "group-A": "group-B",
      "group-B": "group-C",
    };

    expect(findTopLevelGroup("missing", existingGroups, nodeToGroupMapping)).toBeNull();
    expect(findTopLevelGroup("group-C", existingGroups, nodeToGroupMapping)).toBe("group-C");
    expect(findTopLevelGroup("node-1", existingGroups, nodeToGroupMapping)).toBe("group-C");
  });

  test("getGroupMappings creates lookup tables", () => {
    const groups = [
      { identifier: "group-1", content: ["node-1", "node-2"] },
      { identifier: "group-2", content: ["group-1", "node-3"] },
    ] as any[];

    const mappings = getGroupMappings(groups);

    expect(Object.keys(mappings.existingGroups)).toEqual(["group-1", "group-2"]);
    expect(mappings.nodeToGroupMapping).toEqual({
      "node-1": "group-1",
      "node-2": "group-1",
      "group-1": "group-2",
      "node-3": "group-2",
    });
  });

  test("getNonGroupNodesInGroup traverses nested groups", () => {
    const rootGroup = { identifier: "root", content: ["group-child", "node-1"] } as any;
    const childGroup = { identifier: "group-child", content: ["node-2", "node-3"] } as any;
    const existingGroups = {
      root: rootGroup,
      "group-child": childGroup,
    } as any;

    const result = getNonGroupNodesInGroup(rootGroup, existingGroups);

    expect(result.nonGroupNodes).toEqual(["node-2", "node-3", "node-1"]);
    expect(result.processedGroups).toEqual({ "group-child": true });
  });

  test("findLineCenter returns midpoint for any direction", () => {
    expect(findLineCenter({ x: 0, y: 0 }, { x: 10, y: 20 })).toEqual({ x: 5, y: 10 });
    expect(findLineCenter({ x: 10, y: 20 }, { x: 0, y: 0 })).toEqual({ x: 5, y: 10 });
  });

  test("reverseDirection maps all directions", () => {
    expect(reverseDirection(Direction.Up)).toBe(Direction.Down);
    expect(reverseDirection(Direction.Right)).toBe(Direction.Left);
    expect(reverseDirection(Direction.Down)).toBe(Direction.Up);
    expect(reverseDirection(Direction.Left)).toBe(Direction.Right);
  });

  test("grid helpers align coordinates and mutate position", () => {
    expect(placeCoordinateOnGrid(17, 10)).toBe(10);

    const position = { x: 39, y: 26 };
    placePositionOnGrid(position, 8, 5);

    expect(position).toEqual({ x: 32, y: 25 });
  });

  test("capitalizeFirstLetter capitalizes first character", () => {
    expect(capitalizeFirstLetter("dataspecer")).toBe("Dataspecer");
  });
});

describe("PhantomElementsFactory", () => {
  beforeEach(() => {
    PhantomElementsFactory.phantomNodeIndex = 0;
    PhantomElementsFactory.phantomEdgeIndex = 0;
  });

  test("generates unique phantom identifiers", () => {
    expect(PhantomElementsFactory.createUniquePhanomNodeIdentifier()).toBe("phantomNode-0");
    expect(PhantomElementsFactory.createUniquePhanomNodeIdentifier()).toBe("phantomNode-1");
    expect(PhantomElementsFactory.createUniquePhanomEdgeIdentifier()).toBe("phantomEdge-0");
    expect(PhantomElementsFactory.createUniqueGeneralizationSubgraphIdentifier()).toBe("subgraph-2");
  });

  test("constructs and deconstructs split ids", () => {
    const splitId = PhantomElementsFactory.constructSplitID("relationship1", 3);
    expect(splitId).toBe("SPLIT-3-relationship1");
    expect(PhantomElementsFactory.isSplitID(splitId)).toBe(true);
    expect(PhantomElementsFactory.isSplitID("relationship1")).toBe(false);
    expect(PhantomElementsFactory.deconstructSplitID(splitId)).toBe("relationship1");
  });
});
