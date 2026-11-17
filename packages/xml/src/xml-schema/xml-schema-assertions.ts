import type { StructureModelClass, StructureModelProperty } from "@dataspecer/generators/structure-model/model";
import type { XmlSchemaAssertion } from "./xml-schema-model.ts";
import { getXmlSchemaRules } from "./xml-schema-rules.ts";

export interface AtLeastOneAssertions {
  assertions: XmlSchemaAssertion[];

  /**
   * Descriptions of the properties with a rule that could not be written as an assertion.
   */
  unsupported: string[];
}

/**
 * Creates the assertions of the complex type of a class that require at least
 * one value of its properties to match a pattern of a controlled vocabulary.
 *
 * A pattern of one value is not enough for that, as a rule on the type of the
 * value can only restrict every value.
 *
 * Each rule is an assertion of its own. A property without a value satisfiesit,
 * as the property is optional or its cardinality has its own checks.
 * Names are matched in any namespace (`*:name`), so the assertion does not
 * depend on the namespace of the schema or on the profiling that put the
 * element elsewhere. The pattern is wrapped as `^(pattern)$`, as in XPath
 * it is not anchored by default.
 *
 * Properties of containers (xs:choice and xs:sequence) are in the same
 * element, so they are included. The rule cannot be written for a property that
 * has several types, whose class comes from another schema, or whose
 * class has no IRI to check.
 */
export function createAtLeastOneAssertions(structureClass: StructureModelClass, iriIsAttribute: boolean): AtLeastOneAssertions {
  const result: AtLeastOneAssertions = { assertions: [], unsupported: [] };
  const iri = iriIsAttribute ? "@iri" : "*:iri";

  for (const property of propertiesOfElement(structureClass.properties)) {
    if (property.xmlIsAttribute) {
      continue;
    }
    const valueClasses = property.dataTypes.filter((type) => type.isAssociation()).map((type) => type.dataType);
    const rulesOfClasses = valueClasses.map((valueClass) => ({ valueClass, rules: getXmlSchemaRules(valueClass).atLeastOne }));
    if (rulesOfClasses.every(({ rules }) => rules.length === 0)) {
      continue;
    }

    const description = `property ${property.technicalLabel} of class ${structureClass.technicalLabel}`;
    if (property.dataTypes.length !== 1 || property.isInOr) {
      result.unsupported.push(`${description} has several types`);
      continue;
    }
    const { valueClass, rules } = rulesOfClasses[0]!;
    if (valueClass.isReferenced) {
      result.unsupported.push(`${description} has a class that comes from another schema`);
      continue;
    }
    if (valueClass.instancesHaveIdentity === "NEVER" || !valueClass.iris?.length) {
      result.unsupported.push(`${description} has a class without an IRI`);
      continue;
    }

    for (const rule of rules) {
      const pattern = `^(${rule.pattern})$`.replaceAll("'", "''");
      const value = `*:${property.technicalLabel}`;
      result.assertions.push({
        test: `not(${value}) or ${value}/${iri}[matches(., '${pattern}')]`,
        controlledVocabularyId: rule.vocabularyId,
      });
    }
  }
  return result;
}

/**
 * Properties whose elements are children of the element of the class. A
 * container only groups its properties, so they are taken from it.
 */
function propertiesOfElement(properties: readonly StructureModelProperty[]): StructureModelProperty[] {
  return properties.flatMap((property) => {
    if (!property.propertyAsContainer) {
      return [property];
    }
    const container = property.dataTypes[0];
    return container?.isAssociation() ? propertiesOfElement(container.dataType.properties ?? []) : [];
  });
}
