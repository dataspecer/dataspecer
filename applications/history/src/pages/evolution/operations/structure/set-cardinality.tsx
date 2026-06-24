import { useTranslation } from "react-i18next";
import type { DataPsmSetCardinality } from "@dataspecer/core/data-psm/operation";
import { CardinalityText, Field } from "../shared";

export function DataPsmSetCardinalityView({ operation }: { operation: DataPsmSetCardinality }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-1">
      <Field label={t("operations.structure.entity")}>{operation.entityId}</Field>
      <Field label={t("operations.structure.cardinality")}><CardinalityText value={operation.dataPsmCardinality} /></Field>
    </div>
  );
}
