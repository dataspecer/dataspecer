import { StructureModelClass } from "./structure-model-class.ts";

/**
 * Root of the data-psm tree in structure model.
 */
export class StructureModelSchemaRoot {
  /**
   * Data PSM iri of the root entity. Either DataPsmClass or DataPsmOr.
   */
  psmIri: string | null = null;

  /**
   * Classes that are roots of the given data-psm tree. The list represents OR
   * between those classes, hence formally "OR" is the root (first level) of the
   * tree and the classes are on the second level.
   *
   * If the array contains only one class, then the OR may be omitted.
   */
  classes: StructureModelClass[] = [];

  /**
   * Whether the root was wrapped in OR
   */
  isInOr: boolean = false;

  /**
   * Whether the property, which is local is referencing an object. This is used
   * as API workaround when there is OR as a referenced root.
   */
  isReferencing: boolean = false;

  /**
   * Technical label of the wrapping OR. If the OR is not wrapped, then it is empty.
   */
  orTechnicalLabel: string | null = null;

  /**
   * When the root references an OR, this stores the structure schema IRI where the OR is defined.
   * This is used to determine which schema to import when generating XSD.
   */
  orStructureSchema: string | null = null;

  /**
   * Current PSMv1 does not have concept of "root". Therefore the technical
   * label of the schema is used as a technical label of root. The root in this
   * case is an "association". Many formats wont use it. For example JSON
   * expects object at the root, but XML requires wrapping everything in a root
   * element, which is basically the association.
   */
  technicalLabel: string | null = null;

  /**
   * Technical label of the wrapping element if collection.
   */
  collectionTechnicalLabel: string | null = null;

  /**
   * Whether to enforce collection on the root.
   */
  enforceCollection: boolean = false;

  /**
   * Cardinality of the root element
   */
  cardinalityMin: number | null = null;

  /**
   * Cardinality of the root element
   */
  cardinalityMax: number | null = null;

  /**
   * Whether to enforce @context property in JSON Schema.
   */
  enforceJsonLdContext: "no" | "as-is" | "with-extensions" = "no";
}
