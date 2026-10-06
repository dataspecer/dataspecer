import {StructureModel, StructureModelClass, StructureModelProperty,} from "../model/index.ts";
import {clone} from "@dataspecer/core/core";

/**
 * Copy properties from extending classes to the specializations, effectively
 * flattening the class hierarchy.
 */
export function structureModelFlattenInheritance(
  structure: StructureModel
): StructureModel {
  const result = clone(structure) as StructureModel;
  const classes = result.getClasses();
  // First traverse everything and then add properties to not end up in a cycle.
  const propertiesToAdd = new Map<StructureModelClass, StructureModelProperty[]>();
  for (const classData of classes) {
    propertiesToAdd.set(classData, findTopologicalSortOfExtends(classData)
        .flatMap(cls => cls.properties));
  }
  for (const [cls, properties] of propertiesToAdd) {
    cls.properties = properties;
  }
  // Remove all extends because we flattened the hierarchy.
  for (const cls of classes) {
    cls.extends = [];
  }
  return result;
}

/**
 * Applies DFS and return class hierarchy topologically sorted.
 */
function findTopologicalSortOfExtends(
  cls: StructureModelClass
): StructureModelClass[] {
  const visited = new Set<string>();
  const result = [] as StructureModelClass[];
  function visit(cls: StructureModelClass): void {
    visited.add(cls.psmIri);
    for (const ext of cls.extends) {
      if (!visited.has(ext.psmIri)) {
        visit(ext);
      }
    }
    result.push(cls);
  }
  visit(cls);
  return result;
}
