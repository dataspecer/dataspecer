import { useTranslation } from "react-i18next";
import type { ModifyGeneralizationOperation } from "@dataspecer/core-v2/semantic-model/operations";
import type { SemanticModelGeneralization } from "@dataspecer/core-v2/semantic-model/concepts";
import { CardContent } from "@/components/ui/card";
import { EntityName, Field, OperationCardHeader } from "../shared";

function DiffEntityName({
  entities,
  currentId,
  nextId,
}: {
  entities: Record<string, any> | undefined;
  currentId: string | undefined;
  nextId: string | undefined;
}) {
  if (currentId === nextId) return <EntityName entities={entities} id={currentId} />;
  return (
    <>
      <span className="line-through text-red-500"><EntityName entities={entities} id={currentId} /></span>
      {" → "}
      <span className="text-green-600 dark:text-green-400"><EntityName entities={entities} id={nextId} /></span>
    </>
  );
}

export function ModifyGeneralizationOperationView({ operation, entities }: { operation: ModifyGeneralizationOperation; entities?: Record<string, any> }) {
  const { t } = useTranslation();
  const { entity } = operation;
  const current = entities?.[operation.entity.id] as SemanticModelGeneralization | undefined;

  return (
    <>
      <OperationCardHeader title={t("operations.titles.semantic-modify-generalization")} />
      <CardContent>
        <div className="space-y-1">
          <Field label={t("operations.semantic.child")}>
            {"child" in entity
              ? <DiffEntityName entities={entities} currentId={current?.child} nextId={entity.child} />
              : <EntityName entities={entities} id={current?.child} />}
          </Field>
          <Field label={t("operations.semantic.parent")}>
            {"parent" in entity
              ? <DiffEntityName entities={entities} currentId={current?.parent} nextId={entity.parent} />
              : <EntityName entities={entities} id={current?.parent} />}
          </Field>
        </div>
      </CardContent>
    </>
  );
}
