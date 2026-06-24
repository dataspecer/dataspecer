import { useTranslation } from "react-i18next";
import type { ModifyRelationOperation } from "@dataspecer/core-v2/semantic-model/operations";
import { CardinalityText, Field, LanguageStringText } from "../shared";

export function ModifyRelationOperationView({ operation }: { operation: ModifyRelationOperation }) {
  const { t } = useTranslation();
  const { entity } = operation;
  const ends = entity.ends ?? [];

  return (
    <div className="space-y-1">
      <Field label={t("operations.semantic.id")}>{operation.id}</Field>
      <Field label={t("operations.semantic.name")}><LanguageStringText value={entity.name} /></Field>
      {ends.map((end, index) => (
        <Field key={index} label={t("operations.semantic.end", { index })}>
          {end.concept} (<CardinalityText value={end.cardinality} />)
        </Field>
      ))}
    </div>
  );
}
