import {
  JsonSchema,
  JsonSchemaAny,
  JsonSchemaArray,
  JsonSchemaBoolean,
  JsonSchemaConst,
  JsonSchemaDefinition,
  JsonSchemaNull,
  JsonSchemaNumber,
  JsonSchemaObject,
  JsonSchemaRef,
  JsonSchemaString,
  JsonSchemaStringFormats,
} from "./json-schema-model.ts";
import {
  assert,
  assertFailed,
  assertNot,
  defaultStringSelector,
  StringSelector,
} from "@dataspecer/core/core";
import {
  StructureModel,
  StructureModelClass,
  StructureModelPrimitiveType,
  StructureModelProperty,
  type StructureModelComplexType,
} from "@dataspecer/core/structure-model/model";
import { XSD, OFN, OFN_LABELS } from "@dataspecer/core/well-known";
import {
  DataSpecification,
  DataSpecificationArtefact,
  DataSpecificationSchema,
} from "@dataspecer/core/data-specification/model";
import { JSON_SCHEMA } from "./json-schema-vocabulary.ts";
import { JsonConfiguration } from "../configuration.ts";
import { pathRelative } from "@dataspecer/core/core/utilities/path-relative";
import { JsonStructureModelClass } from "../json-structure-model/structure-model-class.ts";
import { JSON_LD_GENERATOR } from "../json-ld/json-ld-generator.ts";

export interface JsonTypeStructureModelProperty extends StructureModelProperty {
  typeKeyValues: string[];
}

function isJsonTypeStructureModelProperty(property: StructureModelProperty): property is JsonTypeStructureModelProperty {
  return (property as JsonTypeStructureModelProperty).typeKeyValues !== undefined;
}

function typePropertyWithValues(typeKeyValues: string[]): JsonSchemaDefinition {
  if (typeKeyValues.length === 1) {
    const constProp = new JsonSchemaConst();
    constProp.value = typeKeyValues[0];

    const arr = new JsonSchemaArray();
    arr.contains = constProp;
    arr.items = new JsonSchemaString(null);

    const oneOf = new JsonSchemaAny();
    oneOf.oneOf = [
      constProp,
      arr,
    ];
    return oneOf;
  } else {
    const arr = new JsonSchemaArray();
    arr.allOf = typeKeyValues.map((type) => {
      const constProp = new JsonSchemaConst();
      constProp.value = type;
      return constProp;
    });
    arr.items = new JsonSchemaString(null);
    return arr;
  }
}

interface Context {
  /**
   * Active specification.
   */
  specification: DataSpecification;

  /**
   * All specifications.
   */
  specifications: { [iri: string]: DataSpecification };

  /**
   * String selector.
   */
  stringSelector: StringSelector;

  /**
   * Current structural model we are generating for.
   */
  model: StructureModel;

  artefact: DataSpecificationArtefact;

  configuration: JsonConfiguration;
}

/**
 * The {@link StructureModel} must have all properties propagated to
 * in the extends hierarchy.
 */
export function structureModelToJsonSchema(
  specifications: { [iri: string]: DataSpecification },
  specification: DataSpecification,
  model: StructureModel,
  configuration: JsonConfiguration,
  artefact: DataSpecificationArtefact,
  stringSelector: StringSelector = defaultStringSelector
): JsonSchema {
  const result = new JsonSchema();
  assert(model.roots.length === 1, "Exactly one root class must be provided.");
  const contex: Context = {
    specification: specification,
    specifications: specifications,
    stringSelector: stringSelector,
    model: model,
    artefact: artefact,
    configuration,
  };
  if (artefact.publicUrl) {
    result.id = artefact.publicUrl;
  }
  if (model.roots[0].classes.length != 1) {
    const anyOf = new JsonSchemaAny();
    anyOf.anyOf = model.roots[0].classes.map((c) =>
      structureModelClassToJsonSchemaDefinition(contex, c)
    );
    result.root = anyOf;
  } else {
    result.root = structureModelClassToJsonSchemaDefinition(
      contex,
      model.roots[0].classes[0]
    );
  }

  // Wrap the single root object with array or object with array

  if (configuration.jsonRootCardinality === "array") {
    const array = new JsonSchemaArray();
    array.items = result.root;
    result.root = array;
  } else if (configuration.jsonRootCardinality === "object-with-array") {
    const array = new JsonSchemaArray();
    array.items = result.root;

    const object = new JsonSchemaObject();
    object.representsStructuralElement = null; // Because this represents the root wrapper
    object.properties[configuration.jsonRootCardinalityObjectKey] = array;
    object.required.push(configuration.jsonRootCardinalityObjectKey);
    result.root = object;
  }

  const jsonLd = specification.artefacts.find(a =>
    a.generator === JSON_LD_GENERATOR &&
    (a as DataSpecificationSchema).psm === (artefact as DataSpecificationSchema).psm
  );
  // We MUST use public URL as it is for data
  const jsonLdLink = jsonLd ? jsonLd?.publicUrl : null; // pathRelative(artefact.publicUrl, jsonLd?.publicUrl)

  // Add @context required property
  if (model.roots[0].enforceJsonLdContext !== "no" && jsonLdLink) {
    let contextProperty: JsonSchemaDefinition;

    const constProp = new JsonSchemaConst();
    constProp.value = jsonLdLink;

    if (model.roots[0].enforceJsonLdContext === "as-is") {
      contextProperty = constProp;
    } else {
      const arr = new JsonSchemaArray();
      arr.contains = constProp;
      arr.items = new JsonSchemaString(JsonSchemaStringFormats.iri);

      const oneOf = new JsonSchemaAny();
      oneOf.oneOf = [
        constProp,
        arr
      ];

      contextProperty = oneOf;
    }

    if (result.root instanceof JsonSchemaObject) {
      // Insert in the correct order
      result.root.required.unshift("@context");
      result.root.properties = {
        "@context": contextProperty,
        ...result.root.properties,
      };
    }
  }

  return result;
}

/**
 * Choice is a class-like structure element that allows [exactly one] or [at least one] property to be present in the choice's place.
 * User can use sequence to group several properties together.
 */
function structureModelChoiceToJsonSchemaDefinition(
  context: Context,
  choice: StructureModelClass
): JsonSchemaObject {
  const result = new JsonSchemaObject();
  for (const property of choice.properties) {
    if (property.propertyAsContainer === false) {
      // This is not a container.
      // To ease the processing, we will wrap it into a sequence and proceed as usual.

      const wrapperClass = {
        ...choice,
        containerType: "sequence",
        properties: [property],
      } satisfies StructureModelClass;

      const jsonSchemaFromContainer = structureModelClassToJsonSchemaDefinition(context, wrapperClass) as JsonSchemaObject;
      result.oneOf.push(jsonSchemaFromContainer);
    } else if (property.propertyAsContainer === "sequence") {
      const containerClass = (property.dataTypes[0] as StructureModelComplexType).dataType as StructureModelClass;
      const jsonSchemaFromContainer = structureModelClassToJsonSchemaDefinition(context, containerClass) as JsonSchemaObject;
      result.oneOf.push(jsonSchemaFromContainer);
    } else if (property.propertyAsContainer === "choice") {
      const innerChoice = (property.dataTypes[0] as StructureModelComplexType).dataType as StructureModelClass;
      const jsonSchemaFromContainer = structureModelChoiceToJsonSchemaDefinition(context, innerChoice);
      result.oneOf.push(jsonSchemaFromContainer);
    } else {
      console.warn("Unknown container type when generating JSON schema choice. Skipping.", property.propertyAsContainer);
    }
  }
  (result.oneOf as JsonSchemaObject[]).forEach(i => i.representsStructuralElement = null); // Because these represent just wrappers
  return result;
}

function structureModelClassToJsonSchemaDefinition(
  context: Context,
  modelClass: StructureModelClass
): JsonSchemaDefinition {
  // todo: check if there is no self-reference
  if ((context.model.psmIri !== modelClass.structureSchema || modelClass.isReferenced) && !context.configuration.dereferenceSchema) {
    const artefact = findArtefactForImport(context, modelClass);
    if (artefact !== null) {
      const url = pathRelative(context.artefact.publicUrl, artefact.publicUrl);
      const reference = new JsonSchemaRef();
      reference.url = url;
      reference.absoluteUrl = artefact.publicUrl;
      reference.representsStructuralElement = modelClass;
      return reference;
    }
  }

  if (modelClass.properties.length === 0 && !modelClass.emptyAsComplex) {
    return structureModelClassPrimitive(modelClass);
  }

  /**
   * Each definition in this list is optional on its own.
   * Because there is no easy way to express this in JSON schema, we use anyOf with additional { "type": "object" }
   */
  const nonRequiredDefinitions: JsonSchemaDefinition[] = [];

  const result = new JsonSchemaObject();
  result.representsStructuralElement = modelClass;
  result.title = context.stringSelector(modelClass.humanLabel);
  result.description = context.stringSelector(modelClass.humanDescription);
  result.additionalProperties = modelClass.isClosed === true ? false : null;
  result.examples = (modelClass.example as string[] | null) ?? [];
  result.objectExamples = (modelClass.objectExample as object[] | null) ?? [];
  for (const property of modelClass.properties) {
    // Special case: properties to containers
    if (property.propertyAsContainer) {
      const containerClass = (property.dataTypes[0] as StructureModelComplexType).dataType as StructureModelClass;

      // Skip empty containers
      if (containerClass.properties.length === 0) {
        continue;
      }

      if (containerClass.containerType === "sequence") {
        const jsonSchemaFromContainer = structureModelClassToJsonSchemaDefinition(context, containerClass) as JsonSchemaObject;
        jsonSchemaFromContainer.representsStructuralElement = null; // Because this represents just a wrapper
        if (property.cardinalityMin === 0 && property.cardinalityMax === 1) {
          nonRequiredDefinitions.push(jsonSchemaFromContainer);
          continue;
        }

        if (property.cardinalityMin !== 1 || property.cardinalityMax !== 1) {
          console.warn("Sequence container has unsupported cardinality for JSON schema generators. Treating as 1..1.");
        }

        // This is just a wrapper (basically dumb container)
        // Copy everything
        for (const containerPropertyName in jsonSchemaFromContainer.properties) {
          const containerProperty = jsonSchemaFromContainer.properties[containerPropertyName];
          result.properties[containerPropertyName] = containerProperty;
        }
        continue;
      } else if (containerClass.containerType === "choice") {
        const jsonSchemaFromContainer = structureModelChoiceToJsonSchemaDefinition(context, containerClass);
        jsonSchemaFromContainer.representsStructuralElement = null; // Because this represents just a wrapper

        let isRequired = property.cardinalityMin === 1;
        if (property.cardinalityMax !== 1) {
          console.warn("Choice container cannot have cardinality greater than 1 for JSON schema generators. Capping to 1. This will lead to MORE STRICT scheme.");
        }

        if (isRequired) {
          result.allOf.push(jsonSchemaFromContainer);
        } else {
          nonRequiredDefinitions.push(jsonSchemaFromContainer);
        }
      } else {
        console.warn("Unknown container type when generating JSON schema object. Treating the container as a regular class.", containerClass.containerType);
      }

      continue;
    }

    const name = property.technicalLabel;
    result.properties[name] = structureModelPropertyToJsonDefinition(
      context,
      property
    );
    if (property.cardinalityMin > 0) {
      result.required.push(name);
    }
  }

  if (nonRequiredDefinitions.length > 0) {
    const emptyObject = new JsonSchemaObject();
    result.anyOf.push(emptyObject, ...nonRequiredDefinitions);
  }

  return simplifyJsonSchemaObject(result);
}

/**
 * The goal of this function is to remove unnecessary nesting of objects caused by containers.
 */
function simplifyJsonSchemaObject(object: JsonSchemaObject): JsonSchemaObject {
  // Object having a single choice so it can be unwrapped
  if (
    object.allOf.length === 1 &&
    object.oneOf.length === 0 &&
    object.allOf[0] instanceof JsonSchemaObject &&
    Object.keys(object.allOf[0].properties).length === 0 &&
    object.allOf[0].allOf.length === 0 &&
    object.allOf[0].oneOf.length > 0
  ) {
    object.oneOf.push(...object.allOf[0].oneOf);
    object.allOf = [];
  }

  return object;
}

function findArtefactForImport(
  context: Context,
  modelClass: StructureModelClass
): DataSpecificationArtefact | null {
  const targetSpecification = context.specifications[modelClass.specification];
  assertNot(
    targetSpecification === undefined,
    `Missing specification ${modelClass.specification}`
  );
  for (const candidate of targetSpecification.artefacts) {
    if (candidate.generator !== JSON_SCHEMA.Generator) {
      continue;
    }
    const candidateSchema = candidate as DataSpecificationSchema;
    if (modelClass.structureSchema !== candidateSchema.psm) {
      continue;
    }
    // TODO We should check that the class is root here.
    return candidate;
  }
  return null;
}

function structureModelClassPrimitive(modelClass: StructureModelClass): JsonSchemaDefinition {
  const useStringInsteadOfIri = !!(modelClass as JsonStructureModelClass).iriUsesPrefixes
  const str = new JsonSchemaString(useStringInsteadOfIri ? null : JsonSchemaStringFormats.iri);
  if (modelClass.regex) {
    str.pattern = modelClass.regex;
  }
  if (modelClass.example && modelClass.example.length > 0) {
    str.examples = modelClass.example as string[];
  }
  return str;
}

function structureModelPropertyToJsonDefinition(
  context: Context,
  property: StructureModelProperty
): JsonSchemaDefinition {
  const dataTypes: JsonSchemaDefinition[] = [];
  for (const dataType of property.dataTypes) {
    if (dataType.isAssociation()) {
      const classData = dataType.dataType;
      dataTypes.push(
        structureModelClassToJsonSchemaDefinition(context, classData)
      );
    } else if (dataType.isAttribute()) {
      dataTypes.push(
        structureModelPrimitiveToJsonDefinition(context, dataType)
      );
    } else {
      assertFailed("Invalid data-type instance.");
    }
  }
  if (isJsonTypeStructureModelProperty(property)) {
    dataTypes.push(typePropertyWithValues(property.typeKeyValues));
  }
  let result;
  if (dataTypes.length === 0) {
    // We have no type specification so we select null.
    result = new JsonSchemaNull();
  } else if (dataTypes.length === 1) {
    // Just one type.
    result = dataTypes[0];
  } else {
    // Multiple types.
    result = new JsonSchemaAny();
    result.anyOf = dataTypes;
  }
  //
  const wrapped = wrapWithCardinality(property, result);

  const title = context.stringSelector(property.humanLabel);
  if (title && title.length > 0) {
    wrapped.title = title;
  }
  const description = context.stringSelector(property.humanDescription);
  if (description && description.length > 0) {
    wrapped.description = description;
  }

  return wrapped;
}

function wrapWithCardinality(
  property: StructureModelProperty,
  definition: JsonSchemaDefinition
): JsonSchemaDefinition {
  let hasCardinalityException = false;
  if (property.dataTypes.length === 1) {
    const dt = property.dataTypes[0];
    if (dt.isAttribute() && dt.dataType === OFN.rdfLangString && dt.jsonUseKeyValueForLangString) {
      hasCardinalityException = true;
    }
  }

  if (property.cardinalityMax == 1 || hasCardinalityException) {
    return definition;
  }
  const result = new JsonSchemaArray();
  if (property.cardinalityMin > 0) {
    result.minItems = property.cardinalityMin;
  }
  if (property.cardinalityMax !== null) {
    result.maxItems = property.cardinalityMax;
  }
  result.items = definition;
  return result;
}

function structureModelPrimitiveToJsonDefinition(
  context: Context,
  primitive: StructureModelPrimitiveType
): JsonSchemaDefinition {
  let result;
  switch (primitive.dataType) {
    case XSD.string:
    case OFN.string:
      result = new JsonSchemaString(null);
      result.title = context.stringSelector(OFN_LABELS[OFN.string]);
      result.pattern = primitive.regex;
      result.examples = primitive.example;
      break;
    case XSD.decimal:
    case OFN.decimal:
      result = new JsonSchemaNumber();
      result.title = context.stringSelector(OFN_LABELS[OFN.decimal]);
      break;
    case XSD.integer:
    case OFN.integer:
      const number = new JsonSchemaNumber();
      number.isInteger = true;
      result = number;
      result.title = context.stringSelector(OFN_LABELS[OFN.integer]);
      break;
    case XSD.boolean:
    case OFN.boolean:
      result = new JsonSchemaBoolean();
      result.title = context.stringSelector(OFN_LABELS[OFN.boolean]);
      break;
    case XSD.time:
    case OFN.time:
      result = new JsonSchemaString(JsonSchemaStringFormats.time);
      result.title = context.stringSelector(OFN_LABELS[OFN.time]);
      break;
    case XSD.date:
    case OFN.date:
      result = new JsonSchemaString(JsonSchemaStringFormats.date);
      result.title = context.stringSelector(OFN_LABELS[OFN.date]);
      break;
    case XSD.dateTimeStamp:
    case XSD.dateTime:
    case OFN.dateTime:
      result = new JsonSchemaString(JsonSchemaStringFormats.dateTime);
      result.title = context.stringSelector(OFN_LABELS[OFN.dateTime]);
      break;
    case XSD.anyURI:
    case OFN.url:
      result = new JsonSchemaString(JsonSchemaStringFormats.iri);
      result.title = context.stringSelector(OFN_LABELS[OFN.url]);
      result.pattern = primitive.regex;
      result.examples = primitive.example;
      break;
    case OFN.text:
      result = languageString(primitive.languageStringRequiredLanguages);
      result.title = context.stringSelector(OFN_LABELS[OFN.text]);
      break;
    case OFN.rdfLangString:
      if  (primitive.jsonUseKeyValueForLangString) {
        result = languageString([], true);
        result.title = context.stringSelector(OFN_LABELS[OFN.text]);
      } else {
        result = rdfLanguageString();
        result.title = context.stringSelector(OFN_LABELS[OFN.rdfLangString]);
      }
      break;
    default:
      result = new JsonSchemaString(null);
      result.title = primitive.dataType;
      break;
  }
  return result;
}

function languageString(requiredLanguages: string[], multipleCardinality: boolean = false): JsonSchemaObject {
  const result = new JsonSchemaObject();

  function getPropertyType(multipleCardinality: boolean) {
    if (multipleCardinality) {
      const type = new JsonSchemaArray();
      type.items = new JsonSchemaString(null);
      return type;
    } else {
      return new JsonSchemaString(null);
    }
  }

  result.additionalProperties = getPropertyType(multipleCardinality);
  result.additionalProperties.title = "Hodnota v jiném jazyce";

  result.required = requiredLanguages;

  const cs = getPropertyType(multipleCardinality);
  result.properties["cs"] = cs;
  cs.title = "Hodnota v českém jazyce";

  const en = getPropertyType(multipleCardinality);
  result.properties["en"] = en;
  en.title = "Hodnota v anglickém jazyce";

  return result;
}

function rdfLanguageString(): JsonSchemaObject {
  const result = new JsonSchemaObject();

  result.required = ["@value", "@language"];

  const value = new JsonSchemaString(null);
  result.properties["@value"] = value;
  value.title = "Text v daném jazyce";

  const language = new JsonSchemaString(null);
  result.properties["@language"] = language;
  language.title = "Jazyk textu";

  return result;
}
