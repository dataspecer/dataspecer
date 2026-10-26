import { DataSpecification } from "@dataspecer/core/data-specification/model";
import {clone} from "@dataspecer/core/core";
import {StructureModel} from "../model/index.ts";

/**
 * For each class set the owner specification.
 */
export function addDataSpecification(
  structure: StructureModel,
  specifications: DataSpecification[]
): StructureModel {
  const schemaToSpecification = buildSchemaToSpecificationMap(specifications);
  const result = clone(structure) as StructureModel;
  const classes = result.getClasses();

  result.specification = schemaToSpecification[structure.psmIri] ?? null;
  for (const structureClass of classes) {
    structureClass.specification = schemaToSpecification[structureClass.structureSchema] ?? null;
    structureClass.properties.forEach(property => {
      if (property.referencingStructureSchema) {
        property.referencingSpecification = schemaToSpecification[property.referencingStructureSchema] ?? null;
      }
    });
  }
  return result;
}

function buildSchemaToSpecificationMap(specifications: DataSpecification[]): {
  [schema: string]: string;
} {
  const result = {};
  for (const specification of specifications) {
    for (const iri of specification.psms) {
      result[iri] = specification.iri;
    }
  }
  return result;
}
