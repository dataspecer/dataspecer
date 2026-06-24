import { useTranslation } from "react-i18next";
import type { DeleteEntityOperation } from "@dataspecer/core-v2/semantic-model/operations";
import { Field } from "../shared";

export function DeleteEntityOperationView({ operation }: { operation: DeleteEntityOperation }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-1">
      <Field label={t("operations.semantic.id")}>{operation.id}</Field>
    </div>
  );
}
