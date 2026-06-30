import { useTranslation } from "react-i18next";
import type { ModifyRelationOperation } from "@dataspecer/core-v2/semantic-model/operations";
import type { SemanticModelRelationship, SemanticModelRelationshipEnd } from "@dataspecer/core-v2/semantic-model/concepts";
import type { LanguageString } from "@dataspecer/core/core/core-resource";
import { CardContent } from "@/components/ui/card";
import { CardinalityText, DiffLanguageStringText, DiffStringText, EntityName, Field, OperationCardHeader } from "../shared";
import { Translate } from "@/components/translate";

function EndView({
  current,
  next,
  entities,
}: {
  current: SemanticModelRelationshipEnd | undefined;
  next: SemanticModelRelationshipEnd | undefined;
  entities: Record<string, any> | undefined;
}) {
  const conceptChanged = (current?.concept ?? null) !== (next?.concept ?? null);
  const cardChanged = JSON.stringify(current?.cardinality) !== JSON.stringify(next?.cardinality);

  if (!conceptChanged && !cardChanged) {
    return (
      <>
        <EntityName entities={entities} id={current?.concept} /> (<CardinalityText value={current?.cardinality} />)
      </>
    );
  }

  return (
    <>
      <span className="line-through text-red-500">
        <EntityName entities={entities} id={current?.concept} /> (<CardinalityText value={current?.cardinality} />)
      </span>
      {" → "}
      <span className="text-green-600 dark:text-green-400">
        <EntityName entities={entities} id={next?.concept} /> (<CardinalityText value={next?.cardinality} />)
      </span>
    </>
  );
}

export function ModifyRelationOperationView({ operation, entities }: { operation: ModifyRelationOperation; entities?: Record<string, any> }) {
  const { t } = useTranslation();
  const { entity } = operation;
  const current = entities?.[operation.entity.id] as SemanticModelRelationship | undefined;
  const endsChanged = "ends" in entity;
  const entityName = (current?.ends?.[1]?.name ?? entity.ends?.[1]?.name) as LanguageString | undefined;

  return (
    <>
      <OperationCardHeader title={t("operations.titles.semantic-modify-relationship")} entityName={entityName} />
      <CardContent>
        <div className="space-y-1">
          <Field label={t("operations.semantic.iri")}>
            {endsChanged
              ? <DiffStringText current={current?.ends?.[1]?.iri} next={entity.ends?.[1]?.iri} />
              : current?.ends?.[1]?.iri}
          </Field>
          <Field label={t("operations.semantic.name")}>
            {endsChanged
              ? <DiffLanguageStringText current={current?.ends?.[1]?.name} next={entity.ends?.[1]?.name} />
              : <Translate text={current?.ends?.[1]?.name} />}
          </Field>
          <Field label={t("operations.semantic.name-property")}>
            {endsChanged
              ? <DiffStringText current={current?.ends?.[1]?.nameProperty} next={entity.ends?.[1]?.nameProperty} />
              : current?.ends?.[1]?.nameProperty}
          </Field>
          <Field label={t("operations.semantic.description")}>
            {endsChanged
              ? <DiffLanguageStringText current={current?.ends?.[1]?.description} next={entity.ends?.[1]?.description} />
              : <Translate text={current?.ends?.[1]?.description} />}
          </Field>
          <Field label={t("operations.semantic.description-property")}>
            {endsChanged
              ? <DiffStringText current={current?.ends?.[1]?.descriptionProperty} next={entity.ends?.[1]?.descriptionProperty} />
              : current?.ends?.[1]?.descriptionProperty}
          </Field>
          <Field label={t("operations.semantic.domain")}>
            {endsChanged
              ? <EndView current={current?.ends?.[0]} next={entity.ends?.[0]} entities={entities} />
              : <><EntityName entities={entities} id={current?.ends?.[0]?.concept} /> (<CardinalityText value={current?.ends?.[0]?.cardinality} />)</>}
          </Field>
          <Field label={t("operations.semantic.range")}>
            {endsChanged
              ? <EndView current={current?.ends?.[1]} next={entity.ends?.[1]} entities={entities} />
              : <><EntityName entities={entities} id={current?.ends?.[1]?.concept} /> (<CardinalityText value={current?.ends?.[1]?.cardinality} />)</>}
          </Field>
        </div>
      </CardContent>
    </>
  );
}
