import type { StructureModelClass } from "@dataspecer/core/structure-model/model/structure-model-class";

export class JsonSchema {
  schema: string | null = "https://json-schema.org/draft/2020-12/schema";

  id: string | null = null;

  root: JsonSchemaDefinition | null = null;
}

export class JsonSchemaDefinition {
  readonly type: string;

  title: string | null = null;

  description: string | null = null;

  anyOf: JsonSchemaDefinition[] = [];
  oneOf: JsonSchemaDefinition[] = [];
  allOf: JsonSchemaDefinition[] = [];

  constructor(type: string) {
    this.type = type;
  }
}

/**
 * Does not have any specific type.
 */
export class JsonSchemaAny extends JsonSchemaDefinition {
  private static TYPE = "json-schema-any" as const;
  declare readonly type: typeof JsonSchemaAny.TYPE;

  constructor() {
    super(JsonSchemaAny.TYPE);
  }

  static is(resource: JsonSchemaDefinition): resource is JsonSchemaAny {
    return resource.type.includes(JsonSchemaAny.TYPE);
  }
}

export class JsonSchemaObject extends JsonSchemaDefinition {
  private static TYPE = "json-schema-object";

  properties: { [name: string]: JsonSchemaDefinition } = {};

  required: string[] = [];

  examples: string[] = [];

  objectExamples: object[] = [];

  additionalProperties: JsonSchemaDefinition | false | null = null;

  constructor() {
    super(JsonSchemaObject.TYPE);
  }

  static is(resource: JsonSchemaDefinition): resource is JsonSchemaObject {
    return resource.type.includes(JsonSchemaObject.TYPE);
  }

  /**
   * Structural element this object represents (if any).
   */
  representsStructuralElement: StructureModelClass | null = null;
}

export class JsonSchemaArray extends JsonSchemaDefinition {
  private static TYPE = "json-schema-array";

  items: JsonSchemaDefinition | null = null;

  minItems: number | null = null;
  maxItems: number | null = null;

  anyOf: (JsonSchemaArray | JsonSchemaConst)[] = [];
  oneOf: (JsonSchemaArray | JsonSchemaConst)[] = [];
  allOf: (JsonSchemaArray | JsonSchemaConst)[] = [];

  /**
   * Definition of items that must be part of the array.
   */
  contains: JsonSchemaDefinition | null = null;

  constructor() {
    super(JsonSchemaArray.TYPE);
  }

  static is(resource: JsonSchemaDefinition): resource is JsonSchemaArray {
    return resource.type.includes(JsonSchemaArray.TYPE);
  }
}

export class JsonSchemaNull extends JsonSchemaDefinition {
  private static TYPE = "json-schema-null" as const;
  declare readonly type: typeof JsonSchemaNull.TYPE;

  constructor() {
    super(JsonSchemaNull.TYPE);
  }

  static is(resource: JsonSchemaDefinition): resource is JsonSchemaNull {
    return resource.type.includes(JsonSchemaNull.TYPE);
  }
}

export class JsonSchemaBoolean extends JsonSchemaDefinition {
  private static TYPE = "json-schema-boolean" as const;
  declare readonly type: typeof JsonSchemaBoolean.TYPE;

  constructor() {
    super(JsonSchemaBoolean.TYPE);
  }

  static is(resource: JsonSchemaDefinition): resource is JsonSchemaBoolean {
    return resource.type.includes(JsonSchemaBoolean.TYPE);
  }
}

export class JsonSchemaNumber extends JsonSchemaDefinition {
  private static TYPE = "json-schema-number" as const;
  declare readonly type: typeof JsonSchemaNumber.TYPE;

  public isInteger = false;

  constructor() {
    super(JsonSchemaNumber.TYPE);
  }

  static is(resource: JsonSchemaDefinition): resource is JsonSchemaNumber {
    return resource.type.includes(JsonSchemaNumber.TYPE);
  }
}

export class JsonSchemaString extends JsonSchemaDefinition {
  private static TYPE = "json-schema-string";

  format: string | null = null;

  pattern: string | null = null;

  examples: string[] = [];

  constructor(format: string | null) {
    super(JsonSchemaString.TYPE);
    this.format = format;
  }

  static is(resource: JsonSchemaDefinition): resource is JsonSchemaString {
    return resource.type.includes(JsonSchemaString.TYPE);
  }
}

export class JsonSchemaConst extends JsonSchemaDefinition {
  private static TYPE = "json-schema-const";

  value: string | number | boolean | null = null;

  constructor() {
    super(JsonSchemaConst.TYPE);
  }

  static is(resource: JsonSchemaDefinition): resource is JsonSchemaConst {
    return resource.type.includes(JsonSchemaConst.TYPE);
  }
}

export class JsonSchemaEnum extends JsonSchemaDefinition {
  private static TYPE = "json-schema-enum";

  values: (string | number | boolean)[] = [];

  constructor() {
    super(JsonSchemaEnum.TYPE);
  }

  static is(resource: JsonSchemaDefinition): resource is JsonSchemaEnum {
    return resource.type.includes(JsonSchemaEnum.TYPE);
  }
}

export class JsonSchemaRef extends JsonSchemaDefinition {
  private static TYPE = "json-schema-ref";

  url: string | null = null;

  constructor() {
    super(JsonSchemaRef.TYPE);
  }

  static is(resource: JsonSchemaDefinition): resource is JsonSchemaRef {
    return resource.type.includes(JsonSchemaRef.TYPE);
  }

  // Helper to store absolute URL of the referenced schema
  absoluteUrl: string | null = null;

  /**
   * Structural element this object represents (if any).
   */
  representsStructuralElement: StructureModelClass | null = null;
}

// https://json-schema.org/understanding-json-schema/reference/string.html
export const JsonSchemaStringFormats = {
  dateTime: "date-time",
  time: "time",
  date: "date",
  iri: "iri",
};
