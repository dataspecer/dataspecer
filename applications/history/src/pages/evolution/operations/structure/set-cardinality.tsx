import { useTranslation } from "react-i18next";
import type { DataPsmSetCardinality } from "@dataspecer/core/data-psm/operation";
import { CardContent } from "@/components/ui/card";
import { CardinalityText, Field, OperationCardHeader } from "../shared";

export function DataPsmSetCardinalityView({ operation }: { operation: DataPsmSetCardinality }) {
  const { t } = useTranslation();

  return (
    <>
      <OperationCardHeader title={t("operations.titles.structure-set-cardinality")} />
      <CardContent>
        <div className="space-y-1">
          <Field label={t("operations.structure.entity")}>{operation.entityId}</Field>
          <Field label={t("operations.structure.cardinality")}><CardinalityText value={operation.dataPsmCardinality} /></Field>
        </div>
      </CardContent>
    </>
  );
}
