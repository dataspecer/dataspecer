import {LanguageString} from "../../core/index.ts";
import {StructureModelProperty} from "./structure-model-property.ts";

export class StructureModelClass {
  /**
   * The cim level is optional as pim or data-psm level may not have an
   * interpretation.
   * @deprecated use {@link iris} instead
   */
  cimIri: string | null = null;

  iris: string[] | null = null;

  /**
   * The pim level is optional is data-psm level may not have an interpretation.
   */
  pimIri: string | null = null;

  /**
   * The psm level entity.
   */
  psmIri: string | null = null;

  /**
   * Label used by a computer, can be used as for example as a name of
   * a property in JSON.
   */
  technicalLabel: string | null = null;

  /**
   * Label visible to a human reader.
   */
  humanLabel: LanguageString | null = null;

  /**
   * Description visible to a human reader.
   */
  humanDescription: LanguageString | null = null;

  /**
   * Usage note visible to a human reader.
   */
  humanUsageNote: LanguageString | null = null;

  /**
   * Class can extend other classes, the properties of other classes
   * are not included in this class.
   */
  extends: StructureModelClass[] = [];

  /**
   * Properties declared on this class directly. The list is ordered.
   */
  properties: StructureModelProperty[] = [];

  /**
   * URL of a schema the class was loaded from.
   */
  structureSchema: string | null = null;

  /**
   * Specification this class was loaded from.
   */
  specification: string | null = null;

  /**
   * True if class represents a codelist.
   */
  isCodelist = false;

  /**
   * True if the empty class is treated as regular class instead of IRI reference.
   */
  emptyAsComplex = false;

  isReferenced = false;

  /**
   * True if class is supposed to support only its own attributes for purposes of generating validation schemas.
   */
  isClosed: boolean | null = null;

  /**
   * If class represents codelist this property holds URLs of the datasets
   * with the codelists.
   */
  codelistUrl: string[] = [];

  regex: string | null = null;

  example: unknown[] | null = null;

  objectExample: unknown[] | null = null;

  /**
   * Whether instances of this class may/must/must not have identity, for example IRI.
   */
  instancesHaveIdentity: "ALWAYS" | "NEVER" | "OPTIONAL" | undefined = undefined;

  /**
   * Require explicit instance typing. For example as @type property in JSON-LD.
   */
  instancesSpecifyTypes: "ALWAYS" | "NEVER" | "OPTIONAL" | undefined = undefined;

  /**
   * List of defined IRI prefixes for JSON-LD context.
   */
  jsonLdDefinedPrefixes: { [prefix: string]: string } = {};

  /**
   * Type iri to label used for @types.
   */
  jsonLdTypeMapping: { [iri: string]: string } = {};

  /**
   * Whether the regex pattern on IRI should be translated to accommodate defined prefixes.
   */
  jsonSchemaPrefixesInIriRegex: {
    usePrefixes: "ALWAYS" | "NEVER" | "OPTIONAL",
    includeParentPrefixes: boolean,
  } = {
    usePrefixes: "ALWAYS",
    includeParentPrefixes: true,
  };

  /**
   * Currently, xml containers such as choice or sequence are very close to
   * regular classes. Therefore, in structure model they are in fact classes
   * with this specific property that can be used to correctly interpret the
   * given container. If the consumer ignores this property, they still get
   * something less strict, but still describing the schema.
   */
  containerType: null | "choice" | "sequence" = null;
}
