/**
 * Tests setHighlightingStylesBasedOnSelection
 */

import { expect, beforeEach, test } from "vitest";
import { EdgeType, NodeType, selectMarkerEnd } from "../../diagram-controller";
import {
  EntityColor,
  LabelVisual,
  ProfileOfColor,
  ProfileOfVisual,
} from "../../model";
import {
  Node as ApiNode,
  NodeType as NodeTypeApi,
  Edge as ApiEdge,
  EdgeType as ApiEdgeType,
} from "../../diagram-model";
import { EntityNodeName } from "../../node/entity-node";
import { Edge } from "@xyflow/react";
import { highlightColorMap, setHighlightingStylesBasedOnSelection } from "./set-selection-highlighting-styles";
import { PropertyEdgeName } from "../../edge/property-edge";
import { GeneralizationEdgeName } from "../../edge/generalization-edge";
import { ClassProfileEdgeName } from "../../edge/class-profile-edge";

beforeEach(() => {
  currentNodeId = 0;
  currentEdgeId = 0;
});

test("Test highlighting single set", () => {
  let nodes: NodeType[] = [];
  const getNode = (id: string) => {
    return nodes.find(node => node.id === id);
  }

  for (let i = 0; i < 8; i++) {
    nodes.push(createTestNodeType());
  }

  let edges: EdgeType[] = [];
  edges.push(createTestEdgeType("n-0", "n-1"));
  edges.push(createTestEdgeType("n-5", "n-6"));
  edges.push(createTestEdgeType("n-3", "n-7"));

  const selectedNodes = [
    "n-0",
    "n-1",
    "n-2",
    "n-3",
  ];
  const selectedEdges = [
    "e-0",
    "e-1",
    "e-2",
  ];

  const setNodes = (value: (prevState: NodeType[]) => NodeType[]): void => {
    nodes = value(nodes);
  };

  const setEdges = (value: (prevState: Edge<any>[]) => Edge<any>[]): void => {
    edges = value(edges);
  };

  setHighlightingStylesBasedOnSelection(
    getNode, selectedNodes, selectedEdges, setNodes, setEdges);

  const actualNodeStyles = nodes.map(node => {
    if (node?.style?.outline !== undefined) {
      if (node.style.outline.toString().includes(highlightColorMap[0])) {
        return highlightColorMap[0];
      }
      else if (node.style.outline.toString().includes(highlightColorMap[1])) {
        return highlightColorMap[1];
      }
      else {
        return "ERROR";
      }
    }
    else {
      return "no-highlight";
    }
  });
  const expectedNodeStyles: string[] = [
    highlightColorMap[0],
    highlightColorMap[0],
    highlightColorMap[0],
    highlightColorMap[0],
    "no-highlight",
    highlightColorMap[1],
    highlightColorMap[1],
    highlightColorMap[1]
  ];

  expect(actualNodeStyles).toStrictEqual(expectedNodeStyles);
  //

  const actualEdgeStyles = edges.map(edge => {
    if (edge?.style?.stroke !== undefined) {
      if (edge.style.stroke.toString().includes(highlightColorMap[0])) {
        return highlightColorMap[0];
      }
      else if (edge.style.stroke.toString().includes(highlightColorMap[1])) {
        return highlightColorMap[1];
      }
      else {
        return "ERROR";
      }
    }
    else {
      return "no-highlight";
    }
  });
  const expectedEdgeStyles: string[] = [
    highlightColorMap[0],
    highlightColorMap[0],
    highlightColorMap[0],
  ];
  expect(actualEdgeStyles).toStrictEqual(expectedEdgeStyles);
});

test("Test highlighting set back to back", () => {
  let nodes: NodeType[] = [];
  const getNode = (id: string) => {
    return nodes.find(node => node.id === id);
  }

  for (let i = 0; i < 8; i++) {
    nodes.push(createTestNodeType());
  }

  let edges: EdgeType[] = [];
  edges.push(createTestEdgeType("n-0", "n-1"));
  edges.push(createTestEdgeType("n-5", "n-6"));
  edges.push(createTestEdgeType("n-3", "n-7"));

  let selectedNodes = [
    "n-0",
    "n-1",
    "n-2",
    "n-3",
  ];
  let selectedEdges = [
    "e-0",
    "e-1",
    "e-2",
  ];

  const setNodes = (value: (prevState: NodeType[]) => NodeType[]): void => {
    nodes = value(nodes);
  };

  const setEdges = (value: (prevState: Edge<any>[]) => Edge<any>[]): void => {
    edges = value(edges);
  };

  setHighlightingStylesBasedOnSelection(
    getNode, selectedNodes, selectedEdges, setNodes, setEdges);

  selectedNodes = ["n-7"];
  selectedEdges = [
    "e-0",
  ];

  setHighlightingStylesBasedOnSelection(
    getNode, selectedNodes, selectedEdges, setNodes, setEdges);

  const actualNodeStyles = nodes.map(node => {
    if (node?.style?.outline !== undefined) {
      if (node.style.outline.toString().includes(highlightColorMap[0])) {
        return highlightColorMap[0];
      }
      else if (node.style.outline.toString().includes(highlightColorMap[1])) {
        return highlightColorMap[1];
      }
      else {
        return "ERROR";
      }
    }
    else {
      return "no-highlight";
    }
  });
  const expectedNodeStyles: string[] = [
    highlightColorMap[1],
    highlightColorMap[1],
    "no-highlight",
    "no-highlight",
    "no-highlight",
    "no-highlight",
    "no-highlight",
    highlightColorMap[0],
  ];

  expect(actualNodeStyles).toStrictEqual(expectedNodeStyles);
  //

  const actualEdgeStyles = edges.map(edge => {
    if (edge?.style?.stroke !== undefined) {
      if (edge.style.stroke.toString().includes(highlightColorMap[0])) {
        return highlightColorMap[0];
      }
      else if (edge.style.stroke.toString().includes(highlightColorMap[1])) {
        return highlightColorMap[1];
      }
      else if (edge.style.stroke.toString() === "test-color") {
        return "no-highlight";
      }
    }
  });
  const expectedEdgeStyles: string[] = [
    highlightColorMap[0],
    "no-highlight",
    highlightColorMap[1],
  ];
  expect(actualEdgeStyles).toStrictEqual(expectedEdgeStyles);
});

let currentNodeId = 0;
const createTestNodeType = (): NodeType => {
  const node: ApiNode = {
    type: NodeTypeApi.Class,
    identifier: `n-${currentNodeId++}`,
    externalIdentifier: "",
    label: "",
    description: null,
    iri: null,
    color: "",
    group: null,
    position: { x: 0, y: 0, anchored: null },
    items: [],
    options: {
      labelVisual: LabelVisual.Iri,
      entityMainColor: EntityColor.Entity,
      profileOfVisual: ProfileOfVisual.None,
      profileOfColor: ProfileOfColor.None,
      displayRangeDetail: false,
      displayRelationshipProfileArchetype: false,
      profileOfLabel: "profile of",
    },
    profileOf: [],
    vocabulary: []
  }

  return nodeToNodeType(node);
}

let currentEdgeId = 0;
const createTestEdgeType = (source: string, target: string): EdgeType => {
  const edge: ApiEdge = {
    type: ApiEdgeType.Association,
    identifier: `e-${currentEdgeId++}`,
    externalIdentifier: "",
    label: null,
    source,
    cardinalitySource: null,
    target,
    cardinalityTarget: null,
    color: "test-color",
    waypoints: [],
    options: {
      labelVisual: LabelVisual.Iri,
      entityMainColor: EntityColor.Entity,
      profileOfVisual: ProfileOfVisual.None,
      profileOfColor: ProfileOfColor.None,
      displayRangeDetail: false,
      displayRelationshipProfileArchetype: false,
      profileOfLabel: "profile of",
    },
    iri: null,
    mandatoryLevelLabel: null,
    profileOf: [],
    vocabulary: []
  };

  return edgeToEdgeType(edge);
}

// Copy-pasted to minimize GIT collisions
const nodeToNodeType = (node: ApiNode): NodeType => {
  return {
    id: node.identifier,
    type: EntityNodeName,
    position: {
      x: node.position.x,
      y: node.position.y,
    },
    data: node,
  };
};

// Copy-pasted to minimize GIT collisions
const edgeToEdgeType = (edge: ApiEdge): EdgeType => {
  return {
    id: edge.identifier,
    source: edge.source,
    target: edge.target,
    type: selectEdgeType(edge),
    label: edge.label,
    // We need to assign the marker here as the value is transformed.
    // In addition reactflow use this value.
    markerEnd: selectMarkerEnd(edge, null),
    style: {
      strokeWidth: 2,
      stroke: edge.color,
    },
    data: {
      ...edge,
      waypoints: [...edge.waypoints],
    },
  };
};

function selectEdgeType(edge: ApiEdge) {
  switch (edge.type) {
  case ApiEdgeType.Association:
  case ApiEdgeType.AssociationProfile:
    return PropertyEdgeName;
  case ApiEdgeType.Generalization:
    return GeneralizationEdgeName;
  case ApiEdgeType.ClassProfile:
    return ClassProfileEdgeName;
  }
}