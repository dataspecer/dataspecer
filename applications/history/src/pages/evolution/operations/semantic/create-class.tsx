import { useTranslation } from "react-i18next";
import type { CreateClassOperation } from "@dataspecer/core-v2/semantic-model/operations";
import { Field, LanguageStringText } from "../shared";

export function CreateClassOperationView({ operation }: { operation: CreateClassOperation }) {
  const { t } = useTranslation();
  const { entity } = operation;

  return (
    <div className="space-y-1">
      <Field label={t("operations.semantic.id")}>{entity.id}</Field>
      <Field label={t("operations.semantic.iri")}>{entity.iri}</Field>
      <Field label={t("operations.semantic.name")}><LanguageStringText value={entity.name} /></Field>
      <Field label={t("operations.semantic.description")}><LanguageStringText value={entity.description} /></Field>
    </div>
  );
}
