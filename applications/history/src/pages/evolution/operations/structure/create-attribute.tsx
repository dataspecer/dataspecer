import { useTranslation } from "react-i18next";
import type { DataPsmCreateAttribute } from "@dataspecer/core/data-psm/operation";
import { Field, LanguageStringText } from "../shared";

export function DataPsmCreateAttributeView({ operation }: { operation: DataPsmCreateAttribute }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-1">
      <Field label={t("operations.structure.new-iri")}>{operation.dataPsmNewIri}</Field>
      <Field label={t("operations.structure.owner")}>{operation.dataPsmOwner}</Field>
      <Field label={t("operations.structure.datatype")}>{operation.dataPsmDatatype}</Field>
      <Field label={t("operations.structure.human-label")}><LanguageStringText value={operation.dataPsmHumanLabel} /></Field>
    </div>
  );
}
