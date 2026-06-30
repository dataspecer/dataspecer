import { useTranslation } from "react-i18next";
import type { DataPsmCreateAttribute } from "@dataspecer/core/data-psm/operation";
import { CardContent } from "@/components/ui/card";
import { Field, OperationCardHeader } from "../shared";
import { Translate } from "@/components/translate";

export function DataPsmCreateAttributeView({ operation }: { operation: DataPsmCreateAttribute }) {
  const { t } = useTranslation();

  return (
    <>
      <OperationCardHeader title={t("operations.titles.structure-create-attribute")} />
      <CardContent>
        <div className="space-y-1">
          <Field label={t("operations.structure.new-iri")}>{operation.dataPsmNewIri}</Field>
          <Field label={t("operations.structure.owner")}>{operation.dataPsmOwner}</Field>
          <Field label={t("operations.structure.datatype")}>{operation.dataPsmDatatype}</Field>
          <Field label={t("operations.structure.human-label")}><Translate text={operation.dataPsmHumanLabel} /></Field>
        </div>
      </CardContent>
    </>
  );
}
