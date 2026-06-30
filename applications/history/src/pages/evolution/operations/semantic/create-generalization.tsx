import { useTranslation } from "react-i18next";
import type { CreateGeneralizationOperation } from "@dataspecer/core-v2/semantic-model/operations";
import { CardContent } from "@/components/ui/card";
import { EntityName, Field, OperationCardHeader } from "../shared";

export function CreateGeneralizationOperationView({ operation, entities }: { operation: CreateGeneralizationOperation; entities?: Record<string, any> }) {
  const { t } = useTranslation();
  const { entity } = operation;

  return (
    <>
      <OperationCardHeader title={t("operations.titles.semantic-create-generalization")} />
      <CardContent>
        <div className="space-y-1">
          <Field label={t("operations.semantic.child")}><EntityName entities={entities} id={entity.child} showIri /></Field>
          <Field label={t("operations.semantic.parent")}><EntityName entities={entities} id={entity.parent} showIri /></Field>
        </div>
      </CardContent>
    </>
  );
}
