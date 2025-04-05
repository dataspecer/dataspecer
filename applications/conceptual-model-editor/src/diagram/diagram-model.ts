export type DiagramNodeTypes = Node | VisualModelDiagramNode;

/**
 * Node can be a class or a class profile.
 */
export type Node = {

  type: NodeType;

  /**
   * Entity identifier in scope of the diagram.
   */
  identifier: string;

  /**
   * Identifier of external entity associated with this node.
   */
  externalIdentifier: string;

  /**
   * Human readable label.
   */
  label: string;

  /**
   * Human readable description.
   */
  description: string | null;

  /**
   * Full IRI of represented entity or null.
   */
  iri: string | null;

  /**
   * Color to use for given entity.
   */
  color: string;

  /**
   * Group this node belongs to.
   */
  group: string | null;

  /**
   * Position of the Node at the canvas.
   */
  position: AnchoredPosition;

  profileOf: null | {

    label: string;

    usageNote: string | null;

  }

  /**
   * Node content, i.e. attributes, properties.
   */
  items: NodeItem[];

}

export enum NodeType {
  /**
   * Represents a class.
   */
  Class,
  /**
   * Represents a class profile.
   */
  ClassProfile
}

/**
 * Represents the visual diagram node.
 * The node contains other nodes, which are present in other visual model (and hides them inside).
 */
export type VisualModelDiagramNode = {

  /**
   * Entity identifier in scope of the diagram.
   */
  identifier: string;

  /**
   * Identifier of external entity associated with this node.
   */
  externalIdentifier: string;

  /**
   * Human readable label.
   */
  label: string;

  /**
   * Human readable description.
   */
  description: string | null;

  /**
   * The alias of the represented visual model
   */
  representedModelAlias: string;

  /**
   * Group this node belongs to.
   */
  group: string | null;

  /**
   * Position of the Node at the canvas.
   */
  position: AnchoredPosition;

}

export function isVisualModelDiagramNode(what: DiagramNodeTypes): what is VisualModelDiagramNode {
  return (what as any)?.representedModelAlias !== undefined;
}

export interface AnchoredPosition extends Position {

  /**
   * Used by layout algorithm to express desire of user
   * to not move the element.
   */
  anchored: true | null;

}

export interface Position {

  x: number;

  y: number;

}

export interface NodeItem {

  identifier: string;

  label: string;

  profileOf: null | {

    label: string;

    usageNote: string | null;

  }

}

export type GroupWithContent = {

  /**
   * The group.
   */
  group: Group,

  /**
   * The group's content.
   */
  content: string[],

}

/**
 * Non-visual node used to represent group of other nodes.
 */
export type Group = {

  identifier: string;

}

export type ViewportDimensions = {

  position: Position;

  width: number;

  height: number;

}

/**
 * Any form of relation that should be rendered as an edge.
 */
export type Edge = {

  type: EdgeType;

  identifier: string;

  /**
   * Identifier of external entity associated with this node.
   */
  externalIdentifier: string;

  /**
   * Human readable label.
   */
  label: string | null;

  source: string;

  cardinalitySource: string | null;

  target: string;

  cardinalityTarget: string | null;

  /**
   * Color to use for given entity.
   */
  color: string;

  waypoints: Waypoint[];

  profileOf: null | {

    label: string;

    usageNote: string | null;

  }

}

export enum EdgeType {
  /**
   * Represents an association.
   */
  Association,
  /**
   * Represents a profile of a association.
   */
  AssociationProfile,
  /**
   * Represents a generalization.
   */
  Generalization,
  /**
   * Represents a class profile.
   */
  ClassProfile,
}

export type Waypoint = {

  x: number;

  y: number;

}
