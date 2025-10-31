import {StructureModelClass} from "./structure-model-class.ts";
import { SemanticPathStep } from "./structure-model-property.ts";

export interface StructureModelType {
  isAttribute(): this is StructureModelPrimitiveType;

  isAssociation(): this is StructureModelComplexType;
}

export class StructureModelPrimitiveType implements StructureModelType {
  dataType: string | null = null;

  languageStringRequiredLanguages: string[] = [];

  regex: string | null = null;

  /**
   * Set of examples of values of this property.
   */
  example: unknown[] | null = null;

  /**
   * Json specific property
   */
  jsonUseKeyValueForLangString: boolean = false;

  isAttribute(): this is StructureModelPrimitiveType {
    return true;
  }

  isAssociation(): this is StructureModelComplexType {
    return false;
  }
}

export class StructureModelComplexType implements StructureModelType {
  dataType: StructureModelClass = null;

  /**
   * Because the structure data type belongs to one property, this represents the path in semantic graph model from the property to an object.
   * The path does not contain the property itself.
   * Examples:
   *  - only the object if it is directly in the association
   *  - path to child class
   */
  semanticPath: SemanticPathStep[] | null = null;

  isAttribute(): this is StructureModelPrimitiveType {
    return false;
  }

  isAssociation(): this is StructureModelComplexType {
    return true;
  }
}
