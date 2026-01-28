import type { CoreResource } from "@dataspecer/core/core/core-resource";
import { DataPsmAssociationEnd } from "@dataspecer/core/data-psm/model/data-psm-association-end";
import { DataPsmAttribute } from "@dataspecer/core/data-psm/model/data-psm-attribute";
import { DataPsmClass } from "@dataspecer/core/data-psm/model/data-psm-class";
import { DataPsmClassReference } from "@dataspecer/core/data-psm/model/data-psm-class-reference";
import { DataPsmContainer } from "@dataspecer/core/data-psm/model/data-psm-container";
import { DataPsmExternalRoot } from "@dataspecer/core/data-psm/model/data-psm-external-root";
import { DataPsmInclude } from "@dataspecer/core/data-psm/model/data-psm-include";
import { DataPsmOr } from "@dataspecer/core/data-psm/model/data-psm-or";
import { DataPsmSchema } from "@dataspecer/core/data-psm/model/data-psm-schema";

/**
 * Returns a new structure model with reachable resources only. Since you can
 * reference only root entities, this operation is safe. However, in theory you
 * can reach them if you know their ID and you use data psm import.
 */
export function garbageCollect(structureModel: CoreResource[]): CoreResource[] {
  const schema = structureModel.find(DataPsmSchema.is);
  if (!schema) {
    throw new Error("No schema found in structure model.");
  }

  const resourceMap: Record<string, CoreResource> = Object.fromEntries(structureModel.map((res) => [res.iri, res]));

  const visited = new Set<string>([schema.iri!]);
  const toVisit = [...schema.dataPsmRoots];

  while (toVisit.length > 0) {
    const id = toVisit.pop()!;
    const entity = resourceMap[id!]!;

    if (visited.has(id)) {
      continue;
    }
    visited.add(id);

    if (DataPsmAssociationEnd.is(entity)) {
      toVisit.push(entity.dataPsmPart!);
    } else if (DataPsmAttribute.is(entity)) {
      // pass
    } else if (DataPsmClassReference.is(entity)) {
      // pass
    } else if (DataPsmClass.is(entity)) {
      toVisit.push(...entity.dataPsmParts);
    } else if (DataPsmContainer.is(entity)) {
      toVisit.push(...entity.dataPsmParts);
    } else if (DataPsmExternalRoot.is(entity)) {
      // pass
    } else if (DataPsmInclude.is(entity)) {
      toVisit.push(entity.dataPsmIncludes!);
    } else if (DataPsmOr.is(entity)) {
      toVisit.push(...entity.dataPsmChoices);
    } else {
      console.error("Unknown entity type", entity);
      throw new Error("Unknown entity type");
    }
  }

  const newSchema = {
    ...schema,
    dataPsmParts: schema.dataPsmParts.filter((partIri) => visited.has(partIri)),
  };

  const result = [newSchema, ...structureModel.filter((res) => res.iri !== schema.iri && visited.has(res.iri!))];

  return result;
}
