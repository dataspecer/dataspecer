import {
  isRemoveEntityOperation,
  isSetEntityOperation,
  isUndoOperation,
  isUpdateEntityOperation,
  isVersionOperation,
  type Operation,
} from "@dataspecer/core/operation";
import { isCreateModelOperation, isRemoveModelOperation } from "@dataspecer/project-model";
import {
  CircleHelp,
  PackagePlus,
  PackageMinus,
  Pencil,
  Plus,
  Replace,
  Tag,
  Trash2,
  Undo2,
  type LucideIcon,
} from "lucide-react";

/**
 * Visual classification of the operations shown on the history page: every
 * operation gets a category with an icon and a color, plus the identifier of
 * the entity (or transaction, or version) it concerns. Operations on the
 * project model are additionally highlighted by the page itself, as they
 * change the structure of the whole project.
 */

export type OperationCategory =
  | "create"
  | "modify"
  | "delete"
  | "set"
  | "undo"
  | "version"
  | "create-model"
  | "remove-model"
  | "other";

export interface OperationDisplay {
  category: OperationCategory;
  icon: LucideIcon;
  /** Tailwind text color classes of the icon. */
  colorClass: string;
  /** Identifier of what the operation concerns, when it can be determined. */
  targetEntityId: string | null;
}

const CATEGORY_STYLE: Record<OperationCategory, { icon: LucideIcon; colorClass: string }> = {
  "create": { icon: Plus, colorClass: "text-green-600 dark:text-green-400" },
  "modify": { icon: Pencil, colorClass: "text-blue-600 dark:text-blue-400" },
  "delete": { icon: Trash2, colorClass: "text-red-600 dark:text-red-400" },
  "set": { icon: Replace, colorClass: "text-sky-600 dark:text-sky-400" },
  "undo": { icon: Undo2, colorClass: "text-orange-600 dark:text-orange-400" },
  "version": { icon: Tag, colorClass: "text-purple-600 dark:text-purple-400" },
  "create-model": { icon: PackagePlus, colorClass: "text-amber-700 dark:text-amber-400" },
  "remove-model": { icon: PackageMinus, colorClass: "text-amber-700 dark:text-amber-400" },
  "other": { icon: CircleHelp, colorClass: "text-muted-foreground" },
};

/**
 * Categorizes an operation. Known operations are recognized by their type
 * guards; the rest (semantic, profile, visual, ... operations) is classified
 * by the create/modify/delete keyword of their type string, so that new
 * operation kinds still get a reasonable icon.
 */
function categorize(operation: Operation): { category: OperationCategory; targetEntityId: string | null } {
  if (isUndoOperation(operation)) {
    return { category: "undo", targetEntityId: operation.cancelTransactionId };
  }
  if (isVersionOperation(operation)) {
    return { category: "version", targetEntityId: operation.versionedTransactionId };
  }
  if (isCreateModelOperation(operation)) {
    return { category: "create-model", targetEntityId: operation.modelId };
  }
  if (isRemoveModelOperation(operation)) {
    return { category: "remove-model", targetEntityId: operation.modelId };
  }
  if (isSetEntityOperation(operation)) {
    return { category: "set", targetEntityId: operation.entity.id };
  }
  if (isUpdateEntityOperation(operation)) {
    return { category: "modify", targetEntityId: operation.update.id };
  }
  if (isRemoveEntityOperation(operation)) {
    return { category: "delete", targetEntityId: operation.entityId };
  }

  // Model-specific operations (semantic model, profiles, visual model, ...)
  // follow a create/modify/delete naming convention in their type strings.
  // Recorded histories may contain operations without a type; show them as
  // "other" instead of failing.
  const type = typeof operation.type === "string" ? operation.type.toLowerCase() : "";
  const targetEntityId = extractTargetEntityId(operation);
  if (type.includes("create") || type.includes("add")) {
    return { category: "create", targetEntityId };
  }
  if (type.includes("delete") || type.includes("remove")) {
    return { category: "delete", targetEntityId };
  }
  if (type.includes("modify") || type.includes("update") || type.includes("set")) {
    return { category: "modify", targetEntityId };
  }
  return { category: "other", targetEntityId };
}

/**
 * Best-effort extraction of the entity identifier a model-specific operation
 * concerns, based on the common shapes of the operation payloads.
 */
function extractTargetEntityId(operation: Operation): string | null {
  const payload = operation as Operation & { entity?: { id?: string }; entityId?: string; identifier?: string };
  return payload.entity?.id ?? payload.entityId ?? payload.identifier ?? null;
}

export function getOperationDisplay(operation: Operation): OperationDisplay {
  const { category, targetEntityId } = categorize(operation);
  return { category, ...CATEGORY_STYLE[category], targetEntityId };
}
