import { DiagramOptions } from "./model";

export type DiagramNodeTypes = Node | VisualModelDiagramNode;

/**
 * Node can be a class or a class profile.
 */
export type Node = {

  options: DiagramOptions;

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
   * Absolute, prefixed or relative IRI of the represented entity.
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

  /**
   * Directly profiled entities.
   */
  profileOf: {

    label: string;

    /**
     * Absolute, prefixed or relative IRI of the represented entity.
     */
    iri: string | null;

  }[];

  /**
   * Profiled vocabulary entities.
   */
  vocabulary: {

    label: string | null;

    /**
     * Absolute, prefixed or relative IRI of the represented entity.
     */
    iri: string | null;

    color: string;

  }[];

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
   * Identifier of external entity associated with this node. That is the represented visual model.
   */
  externalIdentifier: string;

  /**
   * Human readable label.
   */
  label: string;

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

  type: string;

}

export const NODE_ITEM_TYPE = "node-relationship-item";

export interface NodeRelationshipItem extends NodeItem {

  options: DiagramOptions;

  type: typeof NODE_ITEM_TYPE;

  identifier: string;

  label: string;

  /**
   * Absolute, prefixed or relative IRI of the represented entity.
   */
  iri: string | null;

  /**
   * Directly profiled entities.
   */
  profileOf: {

    label: string;

    /**
     * Absolute, prefixed or relative IRI of the represented entity.
     */
    iri: string | null;

  }[];

  /**
   * Profiled vocabulary entities.
   */
  vocabulary: {

    label: string | null;

    /**
     * Absolute, prefixed or relative IRI of the represented entity.
     */
    iri: string | null;

  }[];

  cardinalitySource: string | null;

  cardinalityTarget: string | null;

  range: null | {

    label: string;

    /**
     * Absolute, prefixed or relative IRI of the represented entity.
     */
    iri: string | null;

    /**
     * Profiled vocabulary entities.
     */
    vocabulary: {

      label: string | null;

      /**
       * Absolute, prefixed or relative IRI of the represented entity.
       */
      iri: string | null;

    }[];

  }

}

export function isNodeRelationshipItem(
  node: NodeItem,
): node is NodeRelationshipItem {
  return node.type === NODE_ITEM_TYPE;
}

export const NODE_TITLE_ITEM_TYPE = "node-title-item";

export interface NodeTitleItem extends NodeItem {

  type: typeof NODE_TITLE_ITEM_TYPE;

  title: string;

}

export function isNodeTitleItem(
  node: NodeItem,
): node is NodeTitleItem {
  return node.type === NODE_TITLE_ITEM_TYPE;
}

/**
 * Type representing group. It is currently used purely as API object to get group data
 * from visual model to the diagram component.
 */
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

/**
 * Represents positional data related to Viewport, that is position, width and height.
 */
export type ViewportDimensions = {

  /**
   * Top left position of the viewport.
   */
  position: Position;

  /**
   * Viewport's width, that is how much space does the HTML element takes on the screen.
   */
  width: number;

  /**
   * Viewport's height, that is how much space does the HTML element takes on the screen.
   */
  height: number;

}

/**
 * Any form of relation that should be rendered as an edge.
 */
export type Edge = {

  options: DiagramOptions;

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

  /**
   * Absolute, prefixed or relative IRI of the represented entity.
   */
  iri: string | null;

  source: string;

  cardinalitySource: string | null;

  target: string;

  cardinalityTarget: string | null;

  /**
   * Color to use for given entity.
   */
  color: string;

  waypoints: Waypoint[];

  mandatoryLevelLabel: string | null;

  /**
   * Directly profiled entities.
   */
  profileOf: {

    label: string;

    /**
     * Absolute, prefixed or relative IRI of the represented entity.
     */
    iri: string | null;

  }[];

  /**
   * Profiled vocabulary entities.
   */
  vocabulary: {

    label: string | null;

    /**
     * Absolute, prefixed or relative IRI of the represented entity.
     */
    iri: string | null;

    color: string;

  }[];

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
