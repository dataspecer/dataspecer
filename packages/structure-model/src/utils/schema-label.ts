import type { DataPsmSchema } from "@dataspecer/core/data-psm/model/data-psm-schema";

export function getSchemaLabel(schema: DataPsmSchema): string {
  if (schema.dataPsmTechnicalLabel && schema.dataPsmTechnicalLabel.length > 0) {
    return schema.dataPsmTechnicalLabel;
  }

  if (schema && schema.dataPsmHumanLabel) {
    if (schema.dataPsmHumanLabel["en"]) {
      return normalizeName(schema.dataPsmHumanLabel["en"]);
    }
    // Get any value from object
    const anyValue = Object.values(schema.dataPsmHumanLabel)?.[0];
    if (anyValue) {
      return normalizeName(anyValue);
    }
  }

  return schema.iri!.split("/").pop()!;
}

function normalizeName(name: string): string {
  return name
    .replace(/[\s/<>:"\\|?*]+/g, "-") // Windows and Linux forbidden characters
    .toLowerCase();
}
