import { CmeSemanticModelType } from "../dataspecer/cme-model";
import * as Actions from "./catalog-action";
import {
  ClassNode,
  ClassProfileNode,
  GeneralizationNode,
  RelationshipNode,
  RelationshipProfileNode,
  SemanticModelNode,
} from "./catalog-state";
import { t } from "../application";

export function SemanticModelToolbar(
  { node }: { node: SemanticModelNode },
) {
  return (
    <div
      className="flex flex-row justify-end"
      data-model={node.identifier}
      data-path={node.path.join(",")}
    >
      <Button
        action={Actions.ACTION_SEMANTIC_MODEL_SHOW}
        title="catalog.model.show"
      >
        👁
      </Button>
      <Button
        action={Actions.ACTION_SEMANTIC_MODEL_HIDE}
        title="catalog.model.hide"
      >
        🕶️
      </Button>
      <Button
        action={Actions.ACTION_SEMANTIC_MODEL_EDIT}
        title="catalog.model.edit"
      >
        ✏
      </Button>
      <Button
        action={Actions.ACTION_PROFILE_MODEL}
        title="catalog.model.profile"
      >
        🧲
      </Button>
      <Button
        action={Actions.ACTION_SEMANTIC_MODEL_DELETE}
        title="catalog.model.delete"
      >
        🗑️
      </Button>
    </div>
  )
}

function Button({ action, children, title, ...props }: {
  action: string,
  title: string,
  children: React.ReactNode,
}) {
  return (
    <button
      className="hover:bg-slate-200"
      data-action={action}
      title={t(title)}
      {...props}
    >
      {children}
    </button>
  )
}

export function SemanticModelGroupToolbar(
  { node }: { node: SemanticModelNode },
) {
  return (
    <div
      className="flex flex-row"
      style={{ float: "right" }}
      data-model={node.identifier}
      data-path={node.path.join(",")}
    >
      {node.addEntityAction === undefined ? null :
        <Button
          action={node.addEntityAction?.action}
          title={node.addEntityAction.title}
        >
          ➕
        </Button>}
      <Button
        action={Actions.ACTION_SEMANTIC_MODEL_EDIT}
        title="catalog.model.edit"
      >
        ✏
      </Button>
      <Button
        action={Actions.ACTION_SEMANTIC_MODEL_TOGGLE_COLLAPSE}
        title="catalog.model.toggle"
      >
        {node.collapsed ? "🔽" : "🔼"}
      </Button>
    </div>
  )
}

export function ClassToolbar(
  { node }: { node: ClassNode },
) {
  const canBeVisible = node.canBeVisible;
  const visible = node.visualEntities.length > 0;
  const canBeExpanded =
    node.value.model.modelType === CmeSemanticModelType.ExternalSemanticModel;
  return (
    <div
      className="flex flex-row justify-end"
      data-identifier={node.identifier}
      data-model={node.model}
      data-visible={node.visualEntities.length > 0 ? 1 : 0}
      data-path={node.path.join(",")}
    >
      {canBeExpanded ? (
        <Button
          action={Actions.ACTION_CLASS_ADD_SURROUNDINGS}
          title="catalog.class.add-surroundings"
        >
          ➕
        </Button>
      ) : null}
      {canBeExpanded ? (
        <Button
          action={Actions.ACTION_CLASS_RELEASE_SURROUNDINGS}
          title="catalog.class.release-surroundings"
        >
          ❌
        </Button>
      ) : null}
      {visible ?
        <Button
          action={Actions.ACTION_CLASS_FOCUS}
          title="catalog.class.focus"
        >
          🎯
        </Button> : null}
      <Button
        action={Actions.ACTION_CLASS_DELETE}
        title="catalog.class.delete"
      >
        🗑️
      </Button>
      <Button
        action={Actions.ACTION_CLASS_EDIT}
        title="catalog.class.edit"
      >
        ✏
      </Button>
      <Button
        action={Actions.ACTION_CLASS_DETAIL}
        title="catalog.class.detail"
      >
        ℹ
      </Button>
      {canBeVisible ?
        <Button
          action={Actions.ACTION_CLASS_TOGGLE_VISIBLE}
          title="catalog.class.toggle"
        >
          {visible ? "👁" : "🕶️"}
        </Button> : null}
      <Button
        action={Actions.ACTION_CLASS_PROFILE}
        title="catalog.class.profile"
      >
        🧲
      </Button>
      <Button
        action={Actions.ACTION_CLASS_NEIGHBORHOOD}
        title="catalog.class.neighborhood"
      >
        🌎
      </Button>
    </div>
  )
}

export function ClassProfileToolbar(
  { node }: { node: ClassProfileNode },
) {
  const canBeVisible = node.canBeVisible;
  const visible = node.visualEntities.length > 0;
  return (
    <div
      className="flex flex-row justify-end"
      data-identifier={node.identifier}
      data-model={node.model}
      data-visible={node.visualEntities.length > 0 ? 1 : 0}
      data-path={node.path.join(",")}
    >
      {visible ?
        <Button
          action={Actions.ACTION_CLASS_PROFILE_FOCUS}
          title="catalog.class-profile.focus"
        >
          🎯
        </Button> : null}
      <Button
        action={Actions.ACTION_CLASS_PROFILE_DELETE}
        title="catalog.class-profile.delete"
      >
        🗑️
      </Button>
      <Button
        action={Actions.ACTION_CLASS_PROFILE_EDIT}
        title="catalog.class-profile.edit"
      >
        ✏
      </Button>
      <Button
        action={Actions.ACTION_CLASS_PROFILE_DETAIL}
        title="catalog.class-profile.detail"
      >
        ℹ
      </Button>
      {canBeVisible ?
        <Button
          action={Actions.ACTION_CLASS_PROFILE_TOGGLE_VISIBLE}
          title="catalog.class-profile.toggle"
        >
          {visible ? "👁" : "🕶️"}
        </Button> : null}
      <Button
        action={Actions.ACTION_CLASS_PROFILE_PROFILE}
        title="catalog.class-profile.profile"
      >
        🧲
      </Button>
      <Button
        action={Actions.ACTION_CLASS_PROFILE_NEIGHBORHOOD}
        title="catalog.class-profile.neighborhood"
      >
        🌎
      </Button>
    </div>
  )
}

export function RelationshipToolbar(
  { node }: { node: RelationshipNode },
) {
  const canBeVisible = node.canBeVisible;
  const visible = node.visualEntities.length > 0;
  return (
    <div
      className="flex flex-row justify-end"
      data-identifier={node.identifier}
      data-model={node.model}
      data-visible={node.visualEntities.length > 0 ? 1 : 0}
      data-path={node.path.join(",")}
    >
      {visible ?
        <Button
          action={Actions.ACTION_RELATIONSHIP_FOCUS}
          title="catalog.relationship.focus"
        >
          🎯
        </Button> : null}
      <Button
        action={Actions.ACTION_RELATIONSHIP_DELETE}
        title="catalog.relationship.delete"
      >
        🗑️
      </Button>
      <Button
        action={Actions.ACTION_RELATIONSHIP_EDIT}
        title="catalog.relationship.edit"
      >
        ✏
      </Button>
      <Button
        action={Actions.ACTION_RELATIONSHIP_DETAIL}
        title="catalog.relationship.detail"
      >
        ℹ
      </Button>
      {canBeVisible ?
        <Button
          action={Actions.ACTION_RELATIONSHIP_TOGGLE_VISIBLE}
          title="catalog.relationship.toggle"
        >
          {visible ? "👁" : "🕶️"}
        </Button> : null}
      <Button
        action={Actions.ACTION_RELATIONSHIP_PROFILE}
        title="catalog.relationship.profile"
      >
        🧲
      </Button>
      <Button
        action={Actions.ACTION_RELATIONSHIP_NEIGHBORHOOD}
        title="catalog.relationship.neighborhood"
      >
        🌎
      </Button>
    </div>
  )
}

export function RelationshipProfileToolbar(
  { node }: { node: RelationshipProfileNode },
) {
  const canBeVisible = node.canBeVisible;
  const visible = node.visualEntities.length > 0;
  return (
    <div
      className="flex flex-row justify-end"
      data-identifier={node.identifier}
      data-model={node.model}
      data-visible={node.visualEntities.length > 0 ? 1 : 0}
      data-path={node.path.join(",")}
    >
      {visible ?
        <Button
          action={Actions.ACTION_RELATIONSHIP_PROFILE_FOCUS}
          title="catalog.relationship-profile.focus"
        >
          🎯
        </Button> : null}
      <Button
        action={Actions.ACTION_RELATIONSHIP_PROFILE_DELETE}
        title="catalog.relationship-profile.delete"
      >
        🗑️
      </Button>
      <Button
        action={Actions.ACTION_RELATIONSHIP_PROFILE_EDIT}
        title="catalog.relationship-profile.edit"
      >
        ✏
      </Button>
      <Button
        action={Actions.ACTION_RELATIONSHIP_PROFILE_DETAIL}
        title="catalog.relationship-profile.detail"
      >
        ℹ
      </Button>
      {canBeVisible ?
        <Button
          action={Actions.ACTION_RELATIONSHIP_PROFILE_TOGGLE_VISIBLE}
          title="catalog.relationship-profile.toggle"
        >
          {visible ? "👁" : "🕶️"}
        </Button> : null}
      <Button
        action={Actions.ACTION_RELATIONSHIP_PROFILE_PROFILE}
        title="catalog.relationship-profile.profile"
      >
        🧲
      </Button>
      <Button
        action={Actions.ACTION_RELATIONSHIP_PROFILE_NEIGHBORHOOD}
        title="catalog.relationship-profile.neighborhood"
      >
        🌎
      </Button>
    </div>
  )
}

export function GeneralizationToolbar(
  { node }: { node: GeneralizationNode },
) {
  const canBeVisible = node.canBeVisible;
  const visible = node.visualEntities.length > 0;
  return (
    <div
      className="flex flex-row justify-end"
      data-identifier={node.identifier}
      data-model={node.model}
      data-visible={node.visualEntities.length > 0 ? 1 : 0}
      data-path={node.path.join(",")}
    >
      <Button
        action={Actions.ACTION_GENERALIZATION_DELETE}
        title="catalog.generalization.delete"
      >
        🗑️
      </Button>
      <Button
        action={Actions.ACTION_GENERALIZATION_DETAIL}
        title="catalog.generalization.detail"
      >
        ℹ
      </Button>
      {canBeVisible ?
        <Button
          action={Actions.ACTION_GENERALIZATION_TOGGLE_VISIBLE}
          title="catalog.generalization.toggle"
        >
          {visible ? "👁" : "🕶️"}
        </Button> : null}
    </div>
  )
}
