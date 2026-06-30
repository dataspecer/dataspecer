import { useTranslation } from "react-i18next";
import type { CreateRelationshipOperation } from "@dataspecer/core-v2/semantic-model/operations";
import type { LanguageString } from "@dataspecer/core/core/core-resource";
import { CardContent } from "@/components/ui/card";
import { CardinalityText, EntityName, Field, OperationCardHeader } from "../shared";
import { Translate } from "@/components/translate";

export function CreateRelationshipOperationView({ operation, entities }: { operation: CreateRelationshipOperation; entities?: Record<string, any> }) {
  const { t } = useTranslation();
  const { entity } = operation;
  const domain = entity.ends?.[0];
  const range = entity.ends?.[1];

  return (
    <>
      <OperationCardHeader
        title={t("operations.titles.semantic-create-relationship")}
        entityName={range?.name as LanguageString | undefined}
      />
      <CardContent>
        <div className="space-y-1">
          <Field label={t("operations.semantic.iri")}>{range?.iri}</Field>
          <Field label={t("operations.semantic.name")}><Translate text={range?.name} /></Field>
          <Field label={t("operations.semantic.name-property")}>{range?.nameProperty}</Field>
          <Field label={t("operations.semantic.description")}><Translate text={range?.description} /></Field>
          <Field label={t("operations.semantic.description-property")}>{range?.descriptionProperty}</Field>
          <Field label={t("operations.semantic.domain")}>
            <EntityName entities={entities} id={domain?.concept} /> (<CardinalityText value={domain?.cardinality} />)
          </Field>
          <Field label={t("operations.semantic.range")}>
            <EntityName entities={entities} id={range?.concept} /> (<CardinalityText value={range?.cardinality} />)
          </Field>
        </div>
      </CardContent>
    </>
  );
}
