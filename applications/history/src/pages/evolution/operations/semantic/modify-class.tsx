import { useTranslation } from "react-i18next";
import type { ModifyClassOperation } from "@dataspecer/core-v2/semantic-model/operations";
import { Field, LanguageStringText } from "../shared";

export function ModifyClassOperationView({ operation }: { operation: ModifyClassOperation }) {
  const { t } = useTranslation();
  const { entity } = operation;

  return (
    <div className="space-y-1">
      <Field label={t("operations.semantic.id")}>{operation.id}</Field>
      <Field label={t("operations.semantic.iri")}>{entity.iri}</Field>
      <Field label={t("operations.semantic.name")}><LanguageStringText value={entity.name} /></Field>
      <Field label={t("operations.semantic.description")}><LanguageStringText value={entity.description} /></Field>
    </div>
  );
}
