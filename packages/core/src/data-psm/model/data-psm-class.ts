import { DataPsmResource } from "./data-psm-resource.ts";
import * as PSM from "../data-psm-vocabulary.ts";

/**
 * Class on the PSM level points to all its parts, e.g.: association ends,
 * attributes, choices, etc.. In addition a class may extend another class,
 * by doing so this class automatically and implicitly has inherit all the
 * other class attributes, choices, etc..
 */
export class DataPsmClass extends DataPsmResource {
  private static readonly TYPE = PSM.CLASS;

  /**
   * If true, the empty class is treated as a complex type instead of IRI
   * (=string) where is expected to use identifier of the class as its value.
   * This is PSM specific feature as we may want to have one schema with both
   * primitive and complex types.
   *
   * @default false
   */
  dataPsmEmptyAsComplex: boolean | undefined;

  dataPsmExtends: string[] = [];

  dataPsmParts: string[] = [];

  dataPsmIsClosed: boolean | null = null;

  /**
   * Key of property representing ID of the entity.
   * If set to null, the property won't be used.
   * If set to undefined, the default value will be used.
   */
  jsonIdKeyAlias?: string | null | undefined;

  /**
   * Whether the property @id is required.
   * If set to undefined, the default value will be used.
   */
  jsonIdRequired?: boolean | undefined;

  /**
   * Key of property representing the type of the entity.
   * If set to null, the property won't be used.
   * If set to undefined, the default value will be used.
   */
  jsonTypeKeyAlias?: string | null | undefined;

  /**
   * Whether the property @type is required.
   * If set to undefined, the default value will be used.
   */
  jsonTypeRequired?: boolean | undefined;

  /**
   * Whether instances of this class may/must/must not have identity, for example IRI.
   * If set to undefined, the default value will be used which is "ALWAYS" currently.
   */
  instancesHaveIdentity: "ALWAYS" | "NEVER" | "OPTIONAL" | undefined = undefined;

  /**
   * Whether data must contain a value from the controlled vocabulary 
   * that is assigned to the class with the usage "recommended".
   * If not set, the default value of the data specification is used.
   */
  requireRecommendedControlledVocabularyValue?: boolean | null;

  /**
   * Whether data must not contain values from outside of the controlled vocabulary 
   * that is assigned to the class with the usage "recommended".
   * If not set, the default value of the data specification is used.
   */
  restrictToRecommendedControlledVocabulary?: boolean | null;

  /**
   * Require explicit instance typing. For example as @type property in JSON-LD.
   * If set to undefined, the default value will be used which is "ALWAYS" currently.
   */
  instancesSpecifyTypes: "ALWAYS" | "NEVER" | "OPTIONAL" | undefined = undefined;

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

  /**
   * Whether the regex pattern on IRI should be translated to accommodate defined prefixes.
   * If set to undefined, the default value will be used which is "ALWAYS" and include parent prefixes.
   */
  jsonSchemaPrefixesInIriRegex: {
    usePrefixes: "ALWAYS" | "NEVER" | "OPTIONAL",
    includeParentPrefixes: boolean,
  } | undefined = undefined;

  constructor(iri: string | null = null) {
    super(iri);
    this.types.push(DataPsmClass.TYPE);
  }

  static is(resource: any): resource is DataPsmClass {
    return resource?.types?.includes(DataPsmClass.TYPE);
  }
}
