import type { StructureModelClass, StructureModelProperty } from "@dataspecer/generators/structure-model/model";
import { OFN } from "@dataspecer/core/well-known";
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
 * Each rule is an assertion of its own. A property without a value satisfies it,
 * as the property is optional or its cardinality has its own checks.
 * Names are matched in any namespace (`*:name`), so the assertion does not
 * depend on the namespace of the schema or on the profiling that put the
 * element elsewhere. The pattern is wrapped as `^(pattern)$`, as in XPath
 * it is not anchored by default.
 *
 * For a value that is the IRI of a class without properties, the element of
 * the property holds the IRI itself, so the pattern is checked on it.
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
    const rulesOfTypes = property.dataTypes.map((type) => {
      if (type.isAssociation()) {
        return { valueClass: type.dataType, rules: getXmlSchemaRules(type.dataType).atLeastOne };
      }
      // The IRI of a class without properties is the value itself, it has no iri element.
      return { valueClass: null, rules: type.isAttribute() && type.dataType === OFN.url ? getXmlSchemaRules(type).atLeastOne : [] };
    });
    if (rulesOfTypes.every(({ rules }) => rules.length === 0)) {
      continue;
    }

    const description = `property ${property.technicalLabel} of class ${structureClass.technicalLabel}`;
    if (property.dataTypes.length !== 1 || property.isInOr) {
      result.unsupported.push(`${description} has several types`);
      continue;
    }
    const { valueClass, rules } = rulesOfTypes[0]!;
    if (valueClass !== null) {
      if (valueClass.isReferenced) {
        result.unsupported.push(`${description} has a class that comes from another schema`);
        continue;
      }
      if (valueClass.instancesHaveIdentity === "NEVER" || !valueClass.iris?.length) {
        result.unsupported.push(`${description} has a class without an IRI`);
        continue;
      }
    }

    const value = `*:${property.technicalLabel}`;
    const checked = valueClass === null ? value : `${value}/${iri}`;
    for (const rule of rules) {
      const pattern = `^(${rule.pattern})$`.replaceAll("'", "''");
      result.assertions.push({
        test: `not(${value}) or ${checked}[matches(., '${pattern}')]`,
        controlledVocabularyId: rule.vocabularyId,
        elementName: property.technicalLabel,
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
