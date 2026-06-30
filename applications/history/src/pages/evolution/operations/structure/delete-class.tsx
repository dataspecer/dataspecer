import { useTranslation } from "react-i18next";
import type { DataPsmDeleteClass } from "@dataspecer/core/data-psm/operation";
import { CardContent } from "@/components/ui/card";
import { Field, OperationCardHeader } from "../shared";

export function DataPsmDeleteClassView({ operation }: { operation: DataPsmDeleteClass }) {
  const { t } = useTranslation();

  return (
    <>
      <OperationCardHeader title={t("operations.titles.structure-delete-class")} />
      <CardContent>
        <div className="space-y-1">
          <Field label={t("operations.structure.class")}>{operation.dataPsmClass}</Field>
        </div>
      </CardContent>
    </>
  );
}
