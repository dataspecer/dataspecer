import {
  JsonSchema,
  JsonSchemaArray,
  JsonSchemaBoolean,
  JsonSchemaConst,
  JsonSchemaDefinition,
  JsonSchemaEnum,
  JsonSchemaNull,
  JsonSchemaNumber,
  JsonSchemaObject,
  JsonSchemaRef,
  JsonSchemaString,
} from "./json-schema-model.ts";
import { OutputStream } from "@dataspecer/core/io/stream/output-stream";
import { StringJsonWriter } from "./string-json-writer.ts";
import { JsonArrayWriter, JsonObjectWriter } from "./json-writer.ts";
import { assertNot } from "@dataspecer/core/core";

export async function writeJsonSchema(schema: JsonSchema, stream: OutputStream): Promise<void> {
  const writer = StringJsonWriter.createObject(stream);
  await writer.valueIfNotNull("$schema", schema.schema);
  await writer.valueIfNotNull("$id", schema.id);
  await writeJsonDefinition(writer, schema.root);
  await writer.closeObject();
}

async function writeJsonDefinition(writer: JsonObjectWriter, schema: JsonSchemaDefinition): Promise<void> {
  if (JsonSchemaRef.is(schema)) {
    return writeJsonSchemaRef(writer, schema);
  }
  // Common header properties
  await writeJsonSchemaDefinitionProperties(writer, schema);
  if (JsonSchemaObject.is(schema)) {
    await writeJsonSchemaObject(writer, schema);
  } else if (JsonSchemaArray.is(schema)) {
    await writeJsonSchemaArray(writer, schema);
  } else if (JsonSchemaNull.is(schema)) {
    await writeJsonSchemaNull(writer);
  } else if (JsonSchemaBoolean.is(schema)) {
    await writeJsonSchemaBoolean(writer);
  } else if (JsonSchemaNumber.is(schema)) {
    await writeJsonSchemaNumber(writer, (schema as JsonSchemaNumber).isInteger);
  } else if (JsonSchemaString.is(schema)) {
    await writeJsonSchemaString(writer, schema);
  } else if (JsonSchemaConst.is(schema)) {
    await writeJsonSchemaConst(writer, schema);
  } else if (JsonSchemaEnum.is(schema)) {
    await writeJsonSchemaEnum(writer, schema);
  }
  // Common footer properties
  await writeJsonSchemaCommonProperties(writer, schema);
}

async function writeJsonSchemaDefinitionProperties(writer: JsonObjectWriter, schema: JsonSchemaDefinition): Promise<void> {
  await writer.valueIfNotNull("title", schema.title);
  await writer.valueIfNotNull("description", schema.description);
}

async function writeJsonSchemaObject(writer: JsonObjectWriter, schema: JsonSchemaObject): Promise<void> {
  await writer.value("type", "object");
  if (schema.additionalProperties === false) {
    await writer.value("additionalProperties", false);
  } else if (schema.additionalProperties !== null) {
    const propWriter = writer.object("additionalProperties");
    await writeJsonDefinition(propWriter, schema.additionalProperties);
    await propWriter.closeObject();
  }
  if (Object.keys(schema.required).length > 0) {
    const required = writer.array("required");
    for (const key of schema.required) {
      await required.value(key);
    }
    await required.closeArray();
  }
  if (schema.objectExamples.length > 0) {
    const examples = writer.array("examples");
    for (const example of schema.objectExamples) {
      await examples.value(example);
    }
    await examples.closeArray();
  }
  if (Object.keys(schema.properties).length > 0) {
    const properties = writer.object("properties");
    for (const [key, value] of Object.entries(schema.properties)) {
      const property = properties.object(key);
      await writeJsonDefinition(property, value);
      await properties.closeObject();
    }
    await properties.closeObject();
  }
}

async function writeJsonSchemaCommonProperties(writer: JsonObjectWriter, schema: JsonSchemaDefinition): Promise<void> {
  if (schema.anyOf.length > 0) {
    const anyOf = writer.array("anyOf");
    for (const definition of schema.anyOf) {
      const valueWriter = anyOf.object();
      await writeJsonDefinition(valueWriter, definition);
      await valueWriter.closeObject();
    }
    await anyOf.closeArray();
  }
  if (schema.oneOf.length > 0) {
    const oneOf = writer.array("oneOf");
    for (const definition of schema.oneOf) {
      const valueWriter = oneOf.object();
      await writeJsonDefinition(valueWriter, definition);
      await valueWriter.closeObject();
    }
    await oneOf.closeArray();
  }
  if (schema.allOf.length > 0) {
    const allOf = writer.array("allOf");
    for (const definition of schema.allOf) {
      const valueWriter = allOf.object();
      await writeJsonDefinition(valueWriter, definition);
      await valueWriter.closeObject();
    }
    await allOf.closeArray();
  }
}

async function writeJsonSchemaArray(writer: JsonObjectWriter, schema: JsonSchemaArray): Promise<void> {
  await writer.value("type", "array");
  if (schema.minItems !== null) {
    await writer.value("minItems", schema.minItems);
  }
  if (schema.maxItems !== null) {
    await writer.value("maxItems", schema.maxItems);
  }
  if (schema.contains) {
    const containsWriter = writer.object("contains");
    await writeJsonDefinition(containsWriter, schema.contains);
    await containsWriter.closeObject();
  }
  const items = writer.object("items");
  assertNot(schema.items === null, "Missing items specification.");
  await writeJsonDefinition(items, schema.items);
  await items.closeObject();
}

async function writeJsonSchemaNull(writer: JsonObjectWriter): Promise<void> {
  await writer.value("type", "null");
}

async function writeJsonSchemaBoolean(writer: JsonObjectWriter): Promise<void> {
  await writer.value("type", "boolean");
}

async function writeJsonSchemaNumber(writer: JsonObjectWriter, isInteger: boolean): Promise<void> {
  await writer.value("type", isInteger ? "integer" : "number");
}

async function writeJsonSchemaString(writer: JsonObjectWriter, schema: JsonSchemaString): Promise<void> {
  await writer.value("type", "string");
  await writer.valueIfNotNull("format", schema.format);
  await writer.valueIfNotNull("pattern", schema.pattern);
  if (schema.examples && schema.examples.length > 0) {
    const array = writer.array("examples");
    for (const example of schema.examples) {
      await array.value(example);
    }
    await array.closeArray();
  }
}

async function writeJsonSchemaConst(writer: JsonObjectWriter, schema: JsonSchemaConst): Promise<void> {
  await writer.value("const", schema.value);
}

async function writeJsonSchemaEnum(writer: JsonObjectWriter, schema: JsonSchemaEnum): Promise<void> {
  const array = writer.array("enum");
  for (const value of schema.values) {
    await array.value(value);
  }
  await array.closeArray();
}

async function writeJsonSchemaRef(writer: JsonObjectWriter, schema: JsonSchemaRef): Promise<void> {
  await writer.value("$ref", schema.url);
}

async function objectToJsonWriter(o: Record<string, unknown>, writer: JsonObjectWriter) {
  for (const [key, value] of Object.entries(o)) {
    // value is array
    if (Array.isArray(value)) {
      const array = writer.array(key);
      await arrayToJsonWriter(value, array);
      await array.closeArray();
    } else if (typeof value === "object") {
      const object = writer.object(key);
      await objectToJsonWriter(value as Record<string, unknown>, object);
      await object.closeObject();
    } else {
      await writer.value(key, value as string);
    }
  }
}

async function arrayToJsonWriter(a: unknown[], writer: JsonArrayWriter) {
  for (const item of a) {
    if (Array.isArray(item)) {
      const array = writer.array();
      await arrayToJsonWriter(item, array);
      await array.closeArray();
    } else if (typeof item === "object") {
      const object = writer.object();
      await objectToJsonWriter(item as Record<string, unknown>, object);
      await object.closeObject();
    } else {
      await writer.value(item as string);
    }
  }
}
