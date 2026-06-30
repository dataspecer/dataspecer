import { useTranslation } from "react-i18next";
import type { Operation } from "@dataspecer/core/operation";
import { CardContent } from "@/components/ui/card";
import { Field, OperationCardHeader } from "./shared";

export function GenericOperationView({ operation, title }: { operation: Operation; title: string }) {
  const { t } = useTranslation();

  const entries = Object.entries(operation).filter(([key]) => key !== "type" && key !== "types");

  return (
    <>
      <OperationCardHeader title={title} />
      <CardContent>
        <div className="space-y-1">
          <Field label={t("operations.generic.type")}>{operation.type}</Field>
          {entries.map(([key, value]) => (
            <Field key={key} label={key}>
              {typeof value === "object" ? JSON.stringify(value) : String(value)}
            </Field>
          ))}
        </div>
      </CardContent>
    </>
  );
}
