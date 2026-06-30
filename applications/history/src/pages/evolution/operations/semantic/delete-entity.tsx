import { useTranslation } from "react-i18next";
import type { DeleteEntityOperation } from "@dataspecer/core-v2/semantic-model/operations";
import {
  isSemanticModelClass,
  isSemanticModelRelationship,
  isSemanticModelGeneralization,
} from "@dataspecer/core-v2/semantic-model/concepts";
import type { LanguageString } from "@dataspecer/core/core/core-resource";
import { CardContent } from "@/components/ui/card";
import { CardinalityText, EntityName, Field, OperationCardHeader } from "../shared";
import { Translate } from "@/components/translate";

export function DeleteEntityOperationView({ operation, entities }: { operation: DeleteEntityOperation; entities?: Record<string, any> }) {
  const { t } = useTranslation();
  const entity = entities?.[operation.entityId];

  let title = t("operations.titles.semantic-delete-entity");
  let entityName: LanguageString | null = null;

  if (isSemanticModelClass(entity)) {
    title = t("operations.titles.semantic-delete-class");
    entityName = entity.name ?? null;
  } else if (isSemanticModelRelationship(entity)) {
    title = t("operations.titles.semantic-delete-relationship");
    entityName = (entity.ends?.[1]?.name as LanguageString) ?? null;
  } else if (isSemanticModelGeneralization(entity)) {
    title = t("operations.titles.semantic-delete-generalization");
  }

  return (
    <>
      <OperationCardHeader title={title} entityName={entityName} />
      <CardContent>
        {isSemanticModelClass(entity) && (
          <div className="space-y-1">
            <Field label={t("operations.semantic.iri")}>{entity.iri}</Field>
            <Field label={t("operations.semantic.name")}><Translate text={entity.name} /></Field>
            <Field label={t("operations.semantic.name-property")}>{entity.nameProperty}</Field>
            <Field label={t("operations.semantic.description")}><Translate text={entity.description} /></Field>
            <Field label={t("operations.semantic.description-property")}>{entity.descriptionProperty}</Field>
          </div>
        )}
        {isSemanticModelRelationship(entity) && (() => {
          const domain = entity.ends?.[0];
          const range = entity.ends?.[1];
          return (
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
          );
        })()}
        {isSemanticModelGeneralization(entity) && (
          <div className="space-y-1">
            <Field label={t("operations.semantic.child")}><EntityName entities={entities} id={entity.child} showIri /></Field>
            <Field label={t("operations.semantic.parent")}><EntityName entities={entities} id={entity.parent} showIri /></Field>
          </div>
        )}
      </CardContent>
    </>
  );
}
