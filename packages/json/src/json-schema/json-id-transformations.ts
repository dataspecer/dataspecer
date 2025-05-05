import { LocalEntityWrapped } from "@dataspecer/core-v2/hierarchical-semantic-aggregator";
import { SemanticModelClass } from "@dataspecer/core-v2/semantic-model/concepts";
import { SemanticModelClassProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { clone } from "@dataspecer/core/core";
import { StructureModel, StructureModelClass, StructureModelComplexType, StructureModelCustomType, StructureModelProperty } from "@dataspecer/core/structure-model/model";
import { JsonConfiguration } from "../configuration.ts";
import { getClassTypeKey } from "../json-ld/json-ld-adapter.ts";

/**
 * For each PSM class with CIM interpretation, it adds iri and type property
 * based on generator configuration.
 * @see https://github.com/mff-uk/dataspecer/issues/245
 */
export function structureModelAddIdAndTypeProperties(
  structure: StructureModel,
  configuration: JsonConfiguration,
  semanticModel: Record<string, LocalEntityWrapped>,
): StructureModel {
  const result = clone(structure) as StructureModel;
  const classes = result.getClasses();
  for (const structureClass of classes) {
    const localClassConfiguration = {
      jsonIdKeyAlias: configuration.jsonIdKeyAlias,
      jsonIdRequired: structureClass.instancesHaveIdentity === "ALWAYS",
      jsonTypeKeyAlias: configuration.jsonTypeKeyAlias/*)*/,
      jsonTypeRequired: structureClass.instancesSpecifyTypes === "ALWAYS",
    };
    if (structureClass.instancesHaveIdentity === "NEVER") {
        localClassConfiguration.jsonIdKeyAlias = null;
    }
    if (structureClass.instancesSpecifyTypes === "NEVER") {
      localClassConfiguration.jsonTypeKeyAlias = null;
    }
    // todo: properties are added only to non-empty classes as empty are treated differently
    if (structureClass.cimIri !== null && (structureClass.properties.length > 0 || structureClass.emptyAsComplex)) {
      if (localClassConfiguration.jsonTypeKeyAlias !== null) {
        const typeKeyValue = getClassTypeKey(semanticModel[structureClass.pimIri] as LocalEntityWrapped<SemanticModelClass | SemanticModelClassProfile>, structureClass, configuration, structure.jsonLdTypeMapping);

        const datatype = new StructureModelCustomType();
        if (typeKeyValue.length === 1) {
          const type = typeKeyValue[0];
          datatype.data = {
            oneOf: [
              {
                const: type
              },
              {
                type: "array",
                contains: {
                  const: type
                },
                items: {
                  type: "string"
                }
              }
            ]
          };
        } else {
          datatype.data = {
            type: "array",
            allOf: typeKeyValue.map(item => ({contains: {const: item}})),
            items: {
              type: "string"
            }
          }
        }

        const id = new StructureModelProperty();
        id.technicalLabel = localClassConfiguration.jsonTypeKeyAlias;
        id.cardinalityMax = 1;
        if (localClassConfiguration.jsonTypeRequired) {
          id.cardinalityMin = 1;
        }
        id.dataTypes = [datatype];

        structureClass.properties.unshift(id);
      }
      if (localClassConfiguration.jsonIdKeyAlias !== null) {
        const idDatatype = new StructureModelComplexType();
        idDatatype.dataType = new StructureModelClass();
        idDatatype.dataType.specification = structureClass.specification;
        if (structureClass.regex) {
          idDatatype.dataType.regex = structureClass.regex;
        }
        if (structureClass.example && structureClass.example.length > 0) {
          idDatatype.dataType.example = structureClass.example as string[];
        }

        const id = new StructureModelProperty();
        id.technicalLabel = localClassConfiguration.jsonIdKeyAlias;
        id.cardinalityMax = 1;
        if (localClassConfiguration.jsonIdRequired) {
          id.cardinalityMin = 1;
        }
        id.dataTypes = [idDatatype];
        structureClass.properties.unshift(id);
      }
    }
  }
  return result;
}