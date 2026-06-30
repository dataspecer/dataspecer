import { useTranslation } from "react-i18next";
import type { CreateClassOperation } from "@dataspecer/core-v2/semantic-model/operations";
import { CardContent } from "@/components/ui/card";
import { Field, OperationCardHeader } from "../shared";
import { Translate } from "@/components/translate";

export function CreateClassOperationView({ operation }: { operation: CreateClassOperation }) {
  const { t } = useTranslation();
  const { entity } = operation;

  return (
    <>
      <OperationCardHeader title={t("operations.titles.semantic-create-class")} entityName={entity.name} />
      <CardContent>
        <div className="space-y-1">
          <Field label={t("operations.semantic.iri")}>{entity.iri}</Field>
          <Field label={t("operations.semantic.name")}><Translate text={entity.name} /></Field>
          <Field label={t("operations.semantic.description")}><Translate text={entity.description} /></Field>
        </div>
      </CardContent>
    </>
  );
}
