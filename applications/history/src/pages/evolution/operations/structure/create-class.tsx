import { useTranslation } from "react-i18next";
import type { DataPsmCreateClass } from "@dataspecer/core/data-psm/operation";
import { CardContent } from "@/components/ui/card";
import { Field, OperationCardHeader } from "../shared";
import { Translate } from "@/components/translate";

export function DataPsmCreateClassView({ operation }: { operation: DataPsmCreateClass }) {
  const { t } = useTranslation();

  return (
    <>
      <OperationCardHeader title={t("operations.titles.structure-create-class")} />
      <CardContent>
        <div className="space-y-1">
          <Field label={t("operations.structure.new-iri")}>{operation.dataPsmNewIri}</Field>
          <Field label={t("operations.structure.interpretation")}>{operation.dataPsmInterpretation}</Field>
          <Field label={t("operations.structure.human-label")}><Translate text={operation.dataPsmHumanLabel} /></Field>
          <Field label={t("operations.structure.extends")}>{operation.dataPsmExtends.join(", ")}</Field>
        </div>
      </CardContent>
    </>
  );
}
