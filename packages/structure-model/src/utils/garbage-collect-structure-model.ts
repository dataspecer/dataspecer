import type { CoreResource } from "@dataspecer/core/core/core-resource";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import {
  DataPsmAssociationEnd, DataPsmAttribute, DataPsmClass, DataPsmClassReference,
  DataPsmContainer, DataPsmExternalRoot, DataPsmInclude, DataPsmOr, DataPsmSchema,
} from "@dataspecer/core/data-psm/model";

/**
 * Returns a copy of structure model but only with entities reachable from
 * schema root. Inputs and retained entity objects are not modified except the
 * root that contains list of entities in the schema.
 *
 * Traverses local parts, association targets, choices, includes, inheritance
 * and profiling targets. Class references remain external: their targets are
 * roots in other models and survive collection of those models independently.
 * Missing local references and unsupported reachable entity types throw.
 */
export function garbageCollectStructureModel(model: EntityRecord): EntityRecord {
  const resources = new Map<string, CoreResource>();
  const retained = new Set<string>();
  const pending: string[] = [];
  for (const [id, entity] of Object.entries(model)) {
    // PSM models may still contain legacy CoreResource fields.
    const resource = { ...entity, iri: id, types: entity.type ?? (entity as unknown as CoreResource).types };
    resources.set(id, resource);
    if (DataPsmSchema.is(resource)) {
      retained.add(id);
      pending.push(...resource.dataPsmRoots);
    }
  }
  while (pending.length > 0) {
    const id = pending.pop()!;
    if (retained.has(id)) continue;
    const resource = resources.get(id);
    if (!resource) throw new Error(`Cannot collect structure: missing structural entity ${id}.`);
    retained.add(id);
    if (DataPsmClass.is(resource)) pending.push(...resource.dataPsmParts, ...resource.dataPsmExtends ?? []);
    else if (DataPsmContainer.is(resource)) pending.push(...resource.dataPsmParts);
    else if (DataPsmAssociationEnd.is(resource)) { if (resource.dataPsmPart) pending.push(resource.dataPsmPart); }
    else if (DataPsmInclude.is(resource)) { if (resource.dataPsmIncludes) pending.push(resource.dataPsmIncludes); }
    else if (DataPsmOr.is(resource)) pending.push(...resource.dataPsmChoices);
    else if (!DataPsmClassReference.is(resource) && !DataPsmAttribute.is(resource) && !DataPsmExternalRoot.is(resource)) {
      throw new Error(`Cannot collect structure: unsupported structural entity ${id}.`);
    }
    if ("profiling" in resource && Array.isArray(resource.profiling)) {
      pending.push(...resource.profiling.filter(target => resources.has(target)));
    }
  }
  return Object.fromEntries(Object.entries(model).filter(([id]) => retained.has(id)).map(([id, entity]) => {
    const resource = resources.get(id)!;
    return [id, DataPsmSchema.is(resource)
      ? { ...entity, dataPsmParts: resource.dataPsmParts.filter(part => retained.has(part)) }
      : entity];
  }));
}
