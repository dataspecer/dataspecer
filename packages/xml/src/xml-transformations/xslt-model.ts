import { QName } from "../conventions.ts";

/**
 * Represents an XSL transformation, used for lifting or lowering.
 * This is the main data structure used for generating XSLT stylesheets.
 */
export class XmlTransformation {
  /**
   * The target namespace IRI, if used.
   */
  targetNamespace: string | null;

  /**
   * The target namespace prefix, if used.
   */
  targetNamespacePrefix: string | null;

  /**
   * The map of prefixes to RDF namespaces, used for lifting.
   */
  rdfNamespaces: Record<string, string>;

  /**
   * The array of root templates, matching a particular element.
   */
  rootTemplates: XmlRootTemplate[];

  /**
   * The array of other templates with given names.
   */
  templates: XmlTemplate[];

  /**
   * The array of imports of other stylesheets.
   */
  imports: XmlTransformationImport[];

  /**
   * True if resource IRI is represented as an attribute instead of an element.
   */
  elementIriAsAttribute: boolean;
}

/**
 * Stores the locations of included templates for each generator.
 */
export class XmlTransformationImport {
  /**
   * The locations of included templates, identified by the generator IRI.
   */
  locations: Record<string, string>;

  /**
   * The namespace prefix used by the schema.
   */
  prefix: Promise<string | null>;

  /**
   * The namespace IRI used by the schema.
   */
  namespace: Promise<string | null>;
}

export class XmlTemplate {
  /**
   * The name of the template.
   */
  name: string;

  /**
   * The IRI of the RDF class represented by this template.
   */
  classIris: string[];

  /**
   * The array of matches for each used property of the class.
   */
  propertyMatches: XmlMatch[];

  /**
   * QName of the <iri> element/attribute for this class template.
   * If null, then the IRI is not used.
   *
   * Attribute is set globally for the whole transformation.
   */
  iriElementName: QName | null;
}

/**
 * A root template, matching a specific element and calling its class's
 * template.
 */
export class XmlRootTemplate {
  /**
   * The IRI of the RDF class represented by this template.
   */
  classIris: string[];

  /**
   * The name of the element in XML.
   */
  elementName: QName;

  /**
   * The target template name to call on match.
   */
  targetTemplate: string;

  /**
   * Optional wrapping root element used when root cardinality requires
   * a collection wrapper.
   */
  collectionElementName: QName | null;
}

/**
 * Represents a property match inside a template.
 */
export class XmlMatch {
  /**
   * The name of the property in XML.
   */
  propertyName: QName;

  /**
   * The IRI of the RDF property.
   */
  propertyIris: string[];

  /**
   * True if the property is reverse, i.e. from object to subject.
   */
  isReverse: boolean;

  /**
   * True if the XML property is represented as an attribute.
   */
  isAttribute: boolean;

  /**
   * The RDF/XML name of the property, based on its IRI, for lifting.
   */
  interpretations: QName[];
}

/**
 * Represents a match created from a datatype property.
 */
export class XmlLiteralMatch extends XmlMatch {
  /**
   * The IRI of the datatype.
   */
  dataTypeIri: string;
}

/**
 * Represents a match created from a property whose range is an IRI.
 */
export class XmlIriMatch extends XmlMatch {
  isXmlIriMatch: true;
}

/**
 * Represents a match created from a class property.
 */
export class XmlClassMatch extends XmlMatch {
  /**
   * True if the property is dematerialized.
   */
  isDematerialized: boolean;

  /**
   * The array of target templates for each class in the range of the property.
   */
  targetTemplates: XmlClassTargetTemplate[];
}

/**
 * Stores information about the class in the range of a property.
 */
export class XmlClassTargetTemplate {
  /**
   * The name of the type of the property in XML, used in xsi:type.
   */
  typeName: QName | Promise<QName>;

  /**
   * The name of the template corresponding to this class.
   */
  templateName: string;

  /**
   * The IRI of the RDF class.
   */
  classIris: string[];
}

/**
 * Represents a match created from a container property.
 * Containers are used to group related elements (e.g., xs:sequence, xs:choice).
 */
export class XmlContainerMatch extends XmlMatch {
  /**
   * The type of the container (e.g., "sequence", "choice").
   */
  containerType: string;

  /**
   * The array of matches for properties within the container.
   */
  innerMatches: XmlMatch[];
}

export function xmlMatchIsLiteral(
  match: XmlMatch
): match is XmlLiteralMatch {
  return (match as XmlLiteralMatch).dataTypeIri !== undefined;
}

export function xmlMatchIsIri(
  match: XmlMatch
): match is XmlIriMatch {
  return (match as XmlIriMatch).isXmlIriMatch === true;
}

export function xmlMatchIsClass(
  match: XmlMatch
): match is XmlClassMatch {
  return (match as XmlClassMatch).targetTemplates !== undefined;
}

export function xmlMatchIsContainer(
  match: XmlMatch
): match is XmlContainerMatch {
  return (match as XmlContainerMatch).containerType !== undefined;
}
