import { JSX } from "react";
import { UiModelState } from "./ui-model";
import * as State from "./catalog-state";

type Toolbar<T> = ({ node }: { node: T }) => JSX.Element;

export interface CatalogLayout {

  /**
   * Uniq layout identifier.
   */
  identifier: string;

  /**
   * Tab label before translation.
   */
  label: string;

  /**
   * Create a layout for given state.
   */
  layoutFactory: (uiModelState: UiModelState) => State.TreeNode[];

  /**
   * Toolbars to use for the layout.
   */
  toolbars: {

    [State.SEMANTIC_MODEL_NODE_TYPE]?:
    Toolbar<State.SemanticModelNode>,

    [State.CLASS_NODE_TYPE]?:
    Toolbar<State.ClassNode>,

    [State.CLASS_PROFILE_NODE_TYPE]?:
    Toolbar<State.ClassProfileNode>,

    [State.RELATIONSHIP_NODE_TYPE]?:
    Toolbar<State.RelationshipNode>,

    [State.RELATIONSHIP_PROFILE_NODE_TYPE]?:
    Toolbar<State.RelationshipProfileNode>,

    [State.GENERALIZATION_NODE_TYPE]?:
    Toolbar<State.GeneralizationNode>,

  };

  /**
   * If true add new model is rendered under all the items.
   */
  showAddModel?: boolean;

}
