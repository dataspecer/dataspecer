import { useTranslation } from "react-i18next";
import type { Operation } from "@dataspecer/core/operation";
import { Field } from "./shared";

/**
 * Fallback renderer for operation types that do not have a dedicated
 * component yet. Lists the operation's own properties textually.
 */
export function GenericOperationView({ operation }: { operation: Operation }) {
  const { t } = useTranslation();

  const entries = Object.entries(operation).filter(([key]) => key !== "type" && key !== "types");

  return (
    <div className="space-y-1">
      <Field label={t("operations.generic.type")}>{operation.type}</Field>
      {entries.map(([key, value]) => (
        <Field key={key} label={key}>
          {typeof value === "object" ? JSON.stringify(value) : String(value)}
        </Field>
      ))}
    </div>
  );
}
