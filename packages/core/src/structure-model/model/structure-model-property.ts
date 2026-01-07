import { ConceptualModelProperty, ConceptualModelClass } from "../../conceptual-model/index.ts";
import {LanguageString} from "../../core/index.ts";
import {StructureModelType} from "./structure-model-type.ts";

/**
 * Represents one step in the semantic graph from one entity to another.
 * The step is represented as a relation (association or generalization) and the target entity.
 */
export type SemanticPathStep =
  SemanticPathStepClass |
  SemanticPathStepProperty |
  SemanticPathStepGeneralization |
  SemanticPathStepSpecialization;

export type SemanticPathStepClass = {
  type: "class";
  class: ConceptualModelClass;
}

export type SemanticPathStepProperty = {
  type: "property";
  property: ConceptualModelProperty;
}

export type SemanticPathStepGeneralization = {
  type: "generalization";
}

export type SemanticPathStepSpecialization = {
  type: "specialization";
}

export class StructureModelProperty {
  /**
   * The cim level is optional as pim or data-psm level may not have an
   * interpretation.
   * @deprecated use {@link iris} instead
   */
  cimIri: string | null = null;

  iris: string[] | null = null;

  /**
   * If the property is a container, this will represent the type of the container,
   * it will have single data type with "abstract" class with content of the container.
   *
   * Used mainly for XML xs:sequence and xs:choice.
   */
  propertyAsContainer: string | false = false;

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
  usageNote: LanguageString | null = null;

  /**
   * Indicates that the association is oriented and reversed. The title and
   * the description may be incorrect because they may describe the forward
   * direction if there is no title and description for the reverse direction.
   */
  isReverse: boolean | null = null;

  cardinalityMin: number | null = null;

  cardinalityMax: number | null = null;

  dataTypes: StructureModelType[] = [];

  /**
   * Whether the property was wrapped in OR
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
   * If true the output is not materialized.
   */
  dematerialize: boolean | null = null;

  /**
   * If this property is not on it's PSM owner class, this store
   * path from the original location to the current owner. This can happen
   * for by dematerialization. The first item is the original owner class.
   */
  pathToOrigin: {
    /**
     * PSM property from current class.
     */
    psmProperty: string;

    /**
     * IRI of PSM class obtained by resolving the property.
     */
    psmTargetClass: string;
  }[] = [];

  /**
   * Because the structure property belongs to one object, this represents the path in semantic graph model from the object to this property.
   * The path does not contain the object itself.
   * Examples:
   *  - only the property if it belongs directly to the class
   *  - path to parent class and then the property if the property belongs to the parent class
   */
  semanticPath: SemanticPathStep[] | null = null;

  /**
   * Whether this property should be treated as attribute in XML.
   */
  xmlIsAttribute: boolean = false;

  /**
   * List of identifiers of entities this structure entity profiles.
   */
  profiling: string[] = [];
}
