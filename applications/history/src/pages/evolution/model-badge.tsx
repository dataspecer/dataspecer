import { Badge } from "@/components/ui/badge";
import { Database, FileJson } from "lucide-react";
import type { ModelRef } from "./types";

export function ModelBadge({ model }: { model: ModelRef }) {
  const Icon = model.kind === "semantic" ? Database : FileJson;

  return (
    <Badge variant="secondary" className="gap-1">
      <Icon className="h-3 w-3" />
      {model.alias}
    </Badge>
  );
}
