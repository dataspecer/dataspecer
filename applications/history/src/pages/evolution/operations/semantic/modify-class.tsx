import { useTranslation } from "react-i18next";
import type { ModifyClassOperation } from "@dataspecer/core-v2/semantic-model/operations";
import type { SemanticModelClass } from "@dataspecer/core-v2/semantic-model/concepts";
import { CardContent } from "@/components/ui/card";
import { DiffLanguageStringText, DiffStringText, Field, OperationCardHeader } from "../shared";
import { Translate } from "@/components/translate";

export function ModifyClassOperationView({ operation, entities }: { operation: ModifyClassOperation; entities?: Record<string, any> }) {
  const { t } = useTranslation();
  const { entity } = operation;
  const current = entities?.[operation.entity.id] as SemanticModelClass | undefined;

  return (
    <>
      <OperationCardHeader
        title={t("operations.titles.semantic-modify-class")}
        entityName={current?.name ?? entity.name}
      />
      <CardContent>
        <div className="space-y-1">
          <Field label={t("operations.semantic.iri")}>
            {"iri" in entity
              ? <DiffStringText current={current?.iri} next={entity.iri} />
              : current?.iri}
          </Field>
          <Field label={t("operations.semantic.name")}>
            {"name" in entity
              ? <DiffLanguageStringText current={current?.name} next={entity.name} />
              : <Translate text={current?.name} />}
          </Field>
          <Field label={t("operations.semantic.name-property")}>
            {"nameProperty" in entity
              ? <DiffStringText current={current?.nameProperty} next={entity.nameProperty} />
              : current?.nameProperty}
          </Field>
          <Field label={t("operations.semantic.description")}>
            {"description" in entity
              ? <DiffLanguageStringText current={current?.description} next={entity.description} />
              : <Translate text={current?.description} />}
          </Field>
          <Field label={t("operations.semantic.description-property")}>
            {"descriptionProperty" in entity
              ? <DiffStringText current={current?.descriptionProperty} next={entity.descriptionProperty} />
              : current?.descriptionProperty}
          </Field>
        </div>
      </CardContent>
    </>
  );
}
