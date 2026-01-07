import { LanguageString } from "../../core/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";
import { DataPsmBaseResource } from "./data-psm-resource.ts";

/**
 * Originally the schema point only to root classes. The rest of the diagram
 * has been loaded by resolving the referenced entities.
 *
 * This mean that each class must be either a root class or added to
 * diagram as an association. This is not possible as in order to create
 * an association the class must already exists. So before adding the
 * association the class would need to be root class, and after the association
 * is created the class would be removed from the root class list.
 * Such approach would make it difficult to manage the schema.
 *
 * A solution is to introduce list of all parts. This list contains
 * all resources in the schema. A class can then be optionally added
 * to the list of root classes.
 */
export class DataPsmSchema extends DataPsmBaseResource {
  private static readonly TYPE = PSM.SCHEMA;

  /**
   * Label used in human readable documents as a name for this resource.
   */
  dataPsmHumanLabel: LanguageString | null = null;

  /**
   * Description, longer plain text, shown in human readable documents
   * as a description for this resource.
   */
  dataPsmHumanDescription: LanguageString | null = null;

  dataPsmParts: string[] = [];

  constructor(iri: string | null = null) {
    super(iri);
    this.types.push(DataPsmSchema.TYPE);
  }

  static is(resource: any): resource is DataPsmSchema {
    return resource?.types?.includes(DataPsmSchema.TYPE);
  }

  /**
   * List of defined IRI prefixes for JSON-LD context. These prefixes then can be used
   * instead of full IRI in JSON-LD context, JSON Schema and also in the JSON data.
   */
  jsonLdDefinedPrefixes: {
    [prefix: string]: string;
  } | undefined = undefined;

  /**
   * Defines mapping of types in JSON-LD from IRI to label
   */
  jsonLdDefinedTypeMapping: {
    [iri: string]: string;
  } | undefined = undefined;

  /*
  todo: We are missing the concept of "DataPsmSchemaRoot", which would be between this class - DataPsmSchema and the actual root class - DataPsmClass.
  This class would contain additional metadata and may serve as some king of "association" to the actual root class.
  For now we expect there is only one root and therefore all root-related properties are here, see below.
  */

  dataPsmRoots: string[] = [];

  /**
   * Label used by file formats, may represent a name of a property
   * in JSON or tag name in XML.
   */
  dataPsmTechnicalLabel: string | null = null;

  /**
   * Minimum and maximum cardinality of the root element, if possible.
   * If the maximum cardinality is null, then the cardinality is unbounded.
   * @default [1, 1]
   */
  dataPsmCardinality?: [number, number | null] | null;

  /**
   * Name of the wrapping element that contains the root element, if possible, if the cardinality is different than 1..1 or it is enforced.
   */
  dataPsmCollectionTechnicalLabel?: string;

  /**
   * If true, the collection is enforced, i.e. the root element is wrapped in a collection, if possible.
   * @default false
   */
  dataPsmEnforceCollection?: boolean;

  /**
   * Whether to enforce @context property in JSON Schema.
   * @default "no"
   */
  jsonEnforceContext?: "no" | "as-is" | "with-extensions";
}
