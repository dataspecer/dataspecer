import type { QName } from "../conventions.ts";
import type { XmlSchemaSimpleItemRestriction, XmlSchemaSimpleType, XmlSchemaType } from "./xml-schema-model.ts";
import type { XmlSchemaPatternRule } from "./xml-schema-rules.ts";

export interface IriTypeParameters {
  /**
   * Technical label of the class whose IRI the type describes. It names the types.
   */
  classLabel: string;

  /**
   * Prefix of the namespace of the XML Schema, where xs:anyURI is.
   */
  xsdPrefix: string | null;

  /**
   * Prefix of the target namespace of the schema, with which the types are referenced.
   */
  schemaPrefix: string | null;
}

export interface IriType {
  /**
   * Named simple types to define in the schema by their names.
   * A type is derived from the one before it, in the order of the record.
   */
  definitions: Record<string, XmlSchemaSimpleType>;

  /**
   * Type of the IRI, a reference to the last definition or to xs:anyURI when there are no rules.
   */
  type: XmlSchemaType;
}

/**
 * Creates the type of the IRI of a class so that the IRI matches every rule.
 * Patterns of one restriction in XML Schema are alternatives, so each rule
 * gets a named simple type that restricts the type of the previous rule. A
 * value of the last type must therefore match all rules.
 *
 * The last type is named `<class>-iri`, the types before it `<class>-iri-1`,
 * `<class>-iri-2` and so on, starting with the one derived from xs:anyURI.
 */
export function createIriType(rules: readonly XmlSchemaPatternRule[], parameters: IriTypeParameters): IriType {
  const definitions: Record<string, XmlSchemaSimpleType> = {};

  let base: QName = [parameters.xsdPrefix, "anyURI"];
  rules.forEach((rule, index) => {
    const isLast = index === rules.length - 1;
    const name = isLast ? `${parameters.classLabel}-iri` : `${parameters.classLabel}-iri-${index + 1}`;
    definitions[name] = {
      entityType: "type",
      name: [null, name],
      annotation: null,
      simpleDefinition: {
        xsType: "restriction",
        base,
        pattern: rule.pattern,
        controlledVocabularyId: rule.vocabularyId,
        contents: [],
      } as XmlSchemaSimpleItemRestriction,
    } satisfies XmlSchemaSimpleType;
    base = [parameters.schemaPrefix, name];
  });

  return {
    definitions,
    type: {
      entityType: "type",
      name: base,
      annotation: null,
    } satisfies XmlSchemaType,
  };
}
