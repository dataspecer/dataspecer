import { useTranslation } from "react-i18next";
import type { DataPsmSetHumanLabel } from "@dataspecer/core/data-psm/operation";
import { Field, LanguageStringText } from "../shared";

export function DataPsmSetHumanLabelView({ operation }: { operation: DataPsmSetHumanLabel }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-1">
      <Field label={t("operations.structure.resource")}>{operation.dataPsmResource}</Field>
      <Field label={t("operations.structure.human-label")}><LanguageStringText value={operation.dataPsmHumanLabel} /></Field>
    </div>
  );
}
