import type { ConceptualModel, ConceptualModelClass, ConceptualModelProperty } from "@dataspecer/core";
import type { StructureModel } from "@dataspecer/core/structure-model/model/structure-model";
import type { StructureModelClass } from "@dataspecer/core/structure-model/model/structure-model-class";
import type { StructureModelProperty } from "@dataspecer/core/structure-model/model/structure-model-property";
import type { JsonSchema, JsonSchemaArray, JsonSchemaDefinition, JsonSchemaObject } from "../json-schema/json-schema-model.ts";

/**
 * View model for generating JSON Schema documentation.
 * Each view model corresponds to one structure model.
 * It is expected that the structure model has exactly one root.
 */
export interface JsonSchemaViewModel {
  structureModel: StructureModel;
  jsonSchema: JsonSchema;

  anchor: string;

  dialect: {
    number: string;
    specificationUrl: string;
    metaschemaIri: string;
  } | null;

  /**
   * Full IRI of the schema
   */
  id: string;

  root: JsonSchemaDefinitionViewModel;

  mainClasses: JsonSchemaObjectViewModel[];
}

export interface JsonSchemaDefinitionViewModel {
  type: string;

  /**
   * If true, it means that other views should link to this, not continue expanding the definition.
   */
  isMain: boolean;

  /**
   * Anchor for linking in the document (without the #).
   * Only when {@link isMain} is true.
   */
  anchor: string | null;

  jsonSchemaDefinition: JsonSchemaDefinition;

  allOf: JsonSchemaDefinitionViewModel[] | null;
  anyOf: JsonSchemaDefinitionViewModel[] | null;
  oneOf: JsonSchemaDefinitionViewModel[] | null;

  /**
   * Array of examples (if any).
   */
  examples: any[] | null;

  // todo title, description
}

/**
 * For cases when the type is not defined
 */
export interface JsonSchemaAnyViewModel extends JsonSchemaDefinitionViewModel {
  type: "any";
}

export interface JsonSchemaConstViewModel extends JsonSchemaDefinitionViewModel {
  type: "const";

  /**
   * JSON serialization of the constant value.
   */
  const: string;

  /**
   * Should {@link const} be rendered as a multi-line block.
   */
  multiline: boolean;
}

export interface JsonSchemaNumericViewModel extends JsonSchemaDefinitionViewModel {
  type: "numeric";

  /**
   * True if type: integer, false if type: number
   */
  integerOnly: boolean;

  // There are multipleOf, ranges, etc.
}

export interface JsonSchemaStringViewModel extends JsonSchemaDefinitionViewModel {
  type: "string";

  format: string | null;
  pattern: string | null;
}

export interface JsonSchemaBooleanViewModel extends JsonSchemaDefinitionViewModel {
  type: "boolean";
}

export interface JsonSchemaEnumViewModel extends JsonSchemaDefinitionViewModel {
  type: "enum";

  values: (string | number | boolean)[];
}

/**
 * Represents physical reference in schema which points to either self, schema
 * from the same specification or external schema. As it may not point to a
 * "main object", we cannot say that this represents a specific structure or
 * semantic entity.
 */
export interface JsonSchemaRefViewModel extends JsonSchemaDefinitionViewModel {
  type: "ref";

  /**
   * Whether the referenced schema is from an external specification.
   */
  fromExternalSpecification: boolean;

  link: string;
  semanticModel: ConceptualModel | null;

  ref: JsonSchemaDefinitionViewModel;

  structureEntity: StructureModelClass | null;
}

/**
 * Represents view for one JSON Schema object.
 */
export interface JsonSchemaObjectViewModel extends JsonSchemaDefinitionViewModel {
  type: "object";
  jsonSchemaDefinition: JsonSchemaObject;

  // In theory, this can support pattern properties as well
  properties: JsonSchemaObjectPropertyViewModel[] | null;

  additionalProperties: JsonSchemaDefinitionViewModel | false;

  structureEntity: StructureModelClass | null;
  semanticEntity: ConceptualModelClass | null;
}

export interface JsonSchemaArrayViewModel extends JsonSchemaDefinitionViewModel {
  type: "array";
  jsonSchemaDefinition: JsonSchemaArray;

  items: JsonSchemaDefinitionViewModel;
  contains: JsonSchemaDefinitionViewModel | null;

  /**
   * @default 0
   */
  minItems: number;
  maxItems: number | null;

  cardinalityText: string;

  /**
   * Array of required constant values extracted from allOf contains constraints.
   * Used for documenting type arrays that must contain specific values.
   */
  requiredTypeValues: string[] | null;
}

export interface JsonSchemaObjectPropertyViewModel {
  key: string;
  required: boolean;
  value: JsonSchemaDefinitionViewModel;

  structureEntity: StructureModelProperty | null;
  semanticEntity: ConceptualModelProperty | null;
}
