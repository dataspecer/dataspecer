import { useTranslation } from "react-i18next";
import type { DataPsmDeleteClass } from "@dataspecer/core/data-psm/operation";
import { Field } from "../shared";

export function DataPsmDeleteClassView({ operation }: { operation: DataPsmDeleteClass }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-1">
      <Field label={t("operations.structure.class")}>{operation.dataPsmClass}</Field>
    </div>
  );
}
