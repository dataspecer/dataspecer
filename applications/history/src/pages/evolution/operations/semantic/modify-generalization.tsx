import { useTranslation } from "react-i18next";
import type { ModifyGeneralizationOperation } from "@dataspecer/core-v2/semantic-model/operations";
import { Field } from "../shared";

export function ModifyGeneralizationOperationView({ operation }: { operation: ModifyGeneralizationOperation }) {
  const { t } = useTranslation();
  const { entity } = operation;

  return (
    <div className="space-y-1">
      <Field label={t("operations.semantic.id")}>{operation.id}</Field>
      <Field label={t("operations.semantic.child")}>{entity.child}</Field>
      <Field label={t("operations.semantic.parent")}>{entity.parent}</Field>
    </div>
  );
}
