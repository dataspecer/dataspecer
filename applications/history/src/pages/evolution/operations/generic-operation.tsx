import { useTranslation } from "react-i18next";
import type { AnyOperation } from "../types";
import { isStructureOperation } from "../types";
import { Field } from "./shared";

/**
 * Fallback renderer for operation types that do not have a dedicated
 * component yet. Lists the operation's own properties textually.
 */
export function GenericOperationView({ operation }: { operation: AnyOperation }) {
  const { t } = useTranslation();

  const type = isStructureOperation(operation) ? operation.types.at(-1) : operation.type;
  const entries = Object.entries(operation).filter(([key]) => key !== "type" && key !== "types");

  return (
    <div className="space-y-1">
      <Field label={t("operations.generic.type")}>{type}</Field>
      {entries.map(([key, value]) => (
        <Field key={key} label={key}>
          {typeof value === "object" ? JSON.stringify(value) : String(value)}
        </Field>
      ))}
    </div>
  );
}
