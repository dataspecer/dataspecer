import { useTranslation } from "react-i18next";
import type { DataPsmCreateClass } from "@dataspecer/core/data-psm/operation";
import { Field, LanguageStringText } from "../shared";

export function DataPsmCreateClassView({ operation }: { operation: DataPsmCreateClass }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-1">
      <Field label={t("operations.structure.new-iri")}>{operation.dataPsmNewIri}</Field>
      <Field label={t("operations.structure.interpretation")}>{operation.dataPsmInterpretation}</Field>
      <Field label={t("operations.structure.human-label")}><LanguageStringText value={operation.dataPsmHumanLabel} /></Field>
      <Field label={t("operations.structure.extends")}>{operation.dataPsmExtends.join(", ")}</Field>
    </div>
  );
}
