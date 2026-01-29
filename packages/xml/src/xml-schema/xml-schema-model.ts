import { StructureModel } from "@dataspecer/core/structure-model/model/structure-model";
import { QName } from "../conventions.ts";
import { LanguageString } from "@dataspecer/core/core/core-resource";
import { SemanticPathStep } from "@dataspecer/core/structure-model/model";
import { XmlConfiguration } from "../configuration.ts";

/**
 * Represents an xs:schema definition.
 */
export class XmlSchema {
  /**
   * The target namespace IRI, if used.
   */
  targetNamespace: string | null;

  /**
   * The target namespace prefix, if used.
   */
  targetNamespacePrefix: string | null;

  /**
   * True if the schema uses language-tagged strings.
   */
  defineLangString: boolean;

  /**
   * The array of import declarations for external schemas.
   * (If the namespace is the same as the target namespace, it is an include.)
   */
  imports: XmlSchemaImportDeclaration[];

  namespaces: XmlSchemaNamespaceDefinition[];

  /**
   * Location of XML file containing shared things for XML.
   */
  commonXmlSchemaLocation: string;

  /**
   * The array of defined types in the root of the schema.
   * Such as xs:complexType and xs:simpleType.
   */
  types: XmlSchemaType[];

  /**
   * The array of root elements.
   * Such as xs:element.
   */
  elements: XmlSchemaElement[];

  options: XmlConfiguration;
}

/**
 * Defines imports/includes of external schemas (in different/same namespace).
 */
export class XmlSchemaImportDeclaration {
  namespace: string | null;
  schemaLocation: string;
  model: StructureModel | null;
}

/**
 * Defines namespaces used in the schema.
 */
export class XmlSchemaNamespaceDefinition {
  prefix: string;
  namespace: string;
}

/**
 * Represents anything that can be provided with an annotation.
 */
export class XmlSchemaAnnotated {
  /**
   * The annotation of the object.
   */
  annotation: XmlSchemaAnnotation | null;
}

/**
 * Represents an annotation of an XML Schema object.
 */
export class XmlSchemaAnnotation {
  /**
   * The value of the sawsdl:modelReference attribute.
   */
  modelReference: string[] | null;

  /**
   * The title of the annotation for non-technical use.
   */
  metaTitle: LanguageString | null;

  /**
   * The description of the annotation for non-technical use.
   */
  metaDescription: LanguageString | null;

  /**
   * The usage note of the annotation for non-technical use.
   */
  metaUsageNote: LanguageString | null;

  structureModelEntity?: any;
}

export interface XmlNamedEntity {
  /**
   * XML name attribute of the entity.
   */
  name: QName | null;
}

/**
 * Represents an xs:element definition.
 */
export class XmlSchemaElement extends XmlSchemaAnnotated implements XmlNamedEntity {
  entityType: "element";

  name: QName;

  /**
   * The type of the element.
   */
  type: XmlSchemaType | null;
}

/**
 * Represents an xs:attribute definition.
 */
export class XmlSchemaAttribute extends XmlSchemaAnnotated implements XmlNamedEntity {
  name: QName;
  isRequired: boolean;
  type: XmlSchemaType | null;
}

/**
 * Represents an xs:simpleType or xs:complexType.
 */
export class XmlSchemaType extends XmlSchemaAnnotated implements XmlNamedEntity {
  entityType: "type";

  /**
   * The name of the type.
   * It will be used when no complex or simple definition is provided.
   */
  name: QName | null;
}

/**
 * Represents an xs:complexType.
 */
export class XmlSchemaComplexType extends XmlSchemaType {
  /**
   * The definition of xs:complexType.
   */
  complexDefinition: XmlSchemaComplexItem;

  /**
   * The value of the mixed attribute.
   */
  mixed: boolean;

  /**
   * The value of the abstract attribute.
   */
  abstract: boolean;

  attributes: XmlSchemaAttribute[];
}

/**
 * Represents an xs:simpleType.
 */
export class XmlSchemaSimpleType extends XmlSchemaType {
  /**
   * The definition of xs:simpleType.
   */
  simpleDefinition: XmlSchemaSimpleItem;
}

export class XmlSchemaLangStringType extends XmlSchemaType {
  specialType: "langString";
}

export function xmlSchemaTypeIsComplex(
  type: XmlSchemaType | null
): type is XmlSchemaComplexType {
  return type != null &&
    (type as XmlSchemaComplexType).complexDefinition !== undefined;
}

export function xmlSchemaTypeIsSimple(
  type: XmlSchemaType | null
): type is XmlSchemaSimpleType {
  return type != null &&
    (type as XmlSchemaSimpleType).simpleDefinition !== undefined;
}

export function xmlSchemaTypeIsLangString(
  type: XmlSchemaType | null
): type is XmlSchemaLangStringType {
  return type != null &&
    (type as XmlSchemaLangStringType).specialType === "langString";
}

/**
 * Represents an item in an xs:complexType.
 */
export class XmlSchemaComplexItem {
  /**
   * The name of the item's type, in the xs: namespace.
   */
  xsType: string;
}

/**
 * Represents an item in an xs:complexType that is a container of other items.
 */
export class XmlSchemaComplexContainer extends XmlSchemaComplexItem {
  /**
   * The contents of the item.
   */
  contents: XmlSchemaComplexContent[];
}

/**
 * Represents an xs:sequence element in an xs:complexType.
 */
export class XmlSchemaComplexSequence extends XmlSchemaComplexContainer {
  declare xsType: "sequence";

  /**
   * Whether this container allows additional elements at the END of the sequence.
   */
  xsAny: false | {
    processContents: "lax" | "skip" | "strict";
    namespace: string;
  } & XmlSchemaComplexContent = false;
}

/**
 * Represents an xs:choice element in an xs:complexType.
 */
export class XmlSchemaComplexChoice extends XmlSchemaComplexContainer {
  declare xsType: "choice";
}

/**
 * Represents an xs:all element in an xs:complexType.
 */
export class XmlSchemaComplexAll extends XmlSchemaComplexContainer {
  declare xsType: "all";
}

/**
 * Represents an xs:extension element in an xs:complexType.
 */
export class XmlSchemaComplexExtension extends XmlSchemaComplexContainer {
  declare xsType: "extension";

  /**
   * The name of the base type.
   */
  base: QName;
}

export function xmlSchemaComplexTypeDefinitionIsSequence(
  typeDefinition: XmlSchemaComplexItem
): typeDefinition is XmlSchemaComplexSequence {
  return typeDefinition.xsType === "sequence";
}

export function xmlSchemaComplexTypeDefinitionIsChoice(
  typeDefinition: XmlSchemaComplexItem
): typeDefinition is XmlSchemaComplexChoice {
  return typeDefinition.xsType === "choice";
}

export function xmlSchemaComplexTypeDefinitionIsAll(
  typeDefinition: XmlSchemaComplexItem
): typeDefinition is XmlSchemaComplexAll {
  return typeDefinition.xsType === "all";
}

export function xmlSchemaComplexTypeDefinitionIsExtension(
  typeDefinition: XmlSchemaComplexItem
): typeDefinition is XmlSchemaComplexExtension {
  return typeDefinition.xsType === "extension";
}

/**
 * Represents an item in an xs:simpleType.
 */
export class XmlSchemaSimpleItem {
  /**
   * The name of the item's type, in the xs: namespace.
   */
  xsType: string;

  /**
   * The contents of the type, as a list of {@link QName}s.
   */
  contents: QName[];
}

export class XmlSchemaSimpleItemRestriction extends XmlSchemaSimpleItem {
  declare xsType: "restriction";

  base: QName;

  pattern: string | null;
}

/**
 * Represents an xs:list element in an xs:simpleType.
 * Used for attributes with multi-cardinality to define lists of values.
 */
export class XmlSchemaSimpleItemList extends XmlSchemaSimpleItem {
  declare xsType: "list";

  /**
   * The type of items in the list.
   */
  itemType: QName;
}

export function xmlSchemaSimpleTypeDefinitionIsRestriction(
  typeDefinition: XmlSchemaSimpleItem
): typeDefinition is XmlSchemaSimpleItemRestriction {
  return typeDefinition.xsType === "restriction";
}

export function xmlSchemaSimpleTypeDefinitionIsList(
  typeDefinition: XmlSchemaSimpleItem
): typeDefinition is XmlSchemaSimpleItemList {
  return typeDefinition.xsType === "list";
}

/**
 * Represents an individual item inside a container item.
 */
export class XmlSchemaComplexContent {
  /**
   * The minimum cardinality of the item.
   */
  cardinalityMin: number;

  /**
   * The maximum cardinality of the item.
   */
  cardinalityMax: number | null;
}

/**
 * Represents a concrete xs:element inside a container item.
 */
export class XmlSchemaComplexContentElement extends XmlSchemaComplexContent {
  /**
   * The element represented by this item.
   */
  element: XmlSchemaElement;

  /**
   * Defines how the parent complex content is related to this element on a semantic level.
   */
  semanticRelationToParentElement: SemanticPathStep[] | null = null;

  /**
   * The effective cardinality of the element, taking into account the parent container.
   *
   * For documentation purposes only.
   */
  effectiveCardinalityMin: number;

  /**
   * The effective maximum cardinality of the element, taking into account the parent
   * container.
   *
   * For documentation purposes only.
   */
  effectiveCardinalityMax: number | null;
}

/**
 * Represents a model item inside a container item.
 */
export class XmlSchemaComplexContentItem extends XmlSchemaComplexContent {
  /**
   * The model item represented by this item.
   */
  item: XmlSchemaComplexItem;
}

export function xmlSchemaComplexContentIsElement(
  content: XmlSchemaComplexContent
): content is XmlSchemaComplexContentElement {
  return (content as XmlSchemaComplexContentElement).element !== undefined;
}

export function xmlSchemaComplexContentIsItem(
  content: XmlSchemaComplexContent
): content is XmlSchemaComplexContentItem {
  return (content as XmlSchemaComplexContentItem).item !== undefined;
}
