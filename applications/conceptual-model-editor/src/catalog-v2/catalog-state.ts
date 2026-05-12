import {
  UiSemanticModel,
  UiClass,
  UiClassProfile,
  UiRelationship,
  UiRelationshipProfile,
  UiGeneralization,
  UiEntity,
} from "./ui-model";
import { CatalogLayout } from "./catalog-layout";

export interface CatalogState {

  /**
   * Active layout.
   */
  layout: CatalogLayout;

  /**
   * Available layouts.
   */
  availableLayouts: CatalogLayout[];

  /**
   * Active array of items.
   */
  items: TreeNode[];

  /**
   * Items for all available layouts.
   */
  availableLayoutItems: TreeNode[][];

  /**
   * Search filter.
   */
  search: string;

}

export interface TreeNode {

  type: string;

  /**
   * Uniq item identifier.
   */
  identifier: string;

  /**
   * Child items.
   */
  items: TreeNode[];

  /**
   * Item label to render.
   */
  displayLabel: string;

  /**
   * Item color.
   */
  displayColor: string;

  /**
   * Path to navigate to this node from the root.
   * We pair state changes with nodes.
   */
  path: number[];

  /**
   * Text used for filtering, must be lowercase.
   */
  filterText: string;

  /**
   * If true the node is visible to the user.
   */
  filter: boolean;

  /**
   * Text value used for sorting.
   */
  sortText: string;

}

export interface SemanticModelNode extends TreeNode {

  type: typeof SEMANTIC_MODEL_NODE_TYPE;

  value: UiSemanticModel;

  collapsed: boolean;

  /**
   * If set represents the add action.
   */
  addEntityAction?: {

    title: string;

    action: string;

  };

}

export const SEMANTIC_MODEL_NODE_TYPE = "semantic-model";

export interface EntityNode extends TreeNode {

  /**
   * Identifier of the owning model.
   */
  model: string;

  /**
   * Array of visual entities associated with this node.
   */
  visualEntities: string[];

  /**
   * True if the node can be visible.
   * Does not reflect whether it is actually visible or not.
   */
  canBeVisible: boolean;

  /**
   * We narrow the types in specialized interfaces.
   */
  value: UiEntity;

}

export function isEntityNode(node: TreeNode): node is EntityNode {
  return (node as any).model !== undefined
    && (node as any).visualEntities !== undefined;
}

export interface ClassNode extends EntityNode {

  type: typeof CLASS_NODE_TYPE;

  value: UiClass;

}

export const CLASS_NODE_TYPE = "class";

export interface ClassProfileNode extends EntityNode {

  type: typeof CLASS_PROFILE_NODE_TYPE;

  value: UiClassProfile;

}

export const CLASS_PROFILE_NODE_TYPE = "class-profile";

export interface RelationshipNode extends EntityNode {

  type: typeof RELATIONSHIP_NODE_TYPE;

  value: UiRelationship;

}

export const RELATIONSHIP_NODE_TYPE = "relationship";

export interface RelationshipProfileNode extends EntityNode {

  type: typeof RELATIONSHIP_PROFILE_NODE_TYPE;

  value: UiRelationshipProfile;

}

export const RELATIONSHIP_PROFILE_NODE_TYPE = "relationship-profile";

export interface GeneralizationNode extends EntityNode {

  type: typeof GENERALIZATION_NODE_TYPE;

  value: UiGeneralization;

}

export const GENERALIZATION_NODE_TYPE = "generalization";
