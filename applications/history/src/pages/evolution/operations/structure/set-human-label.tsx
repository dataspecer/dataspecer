import { useTranslation } from "react-i18next";
import type { DataPsmSetHumanLabel } from "@dataspecer/core/data-psm/operation";
import { CardContent } from "@/components/ui/card";
import { Field, OperationCardHeader } from "../shared";
import { Translate } from "@/components/translate";

export function DataPsmSetHumanLabelView({ operation }: { operation: DataPsmSetHumanLabel }) {
  const { t } = useTranslation();

  return (
    <>
      <OperationCardHeader title={t("operations.titles.structure-set-human-label")} />
      <CardContent>
        <div className="space-y-1">
          <Field label={t("operations.structure.resource")}>{operation.dataPsmResource}</Field>
          <Field label={t("operations.structure.human-label")}><Translate text={operation.dataPsmHumanLabel} /></Field>
        </div>
      </CardContent>
    </>
  );
}
