import type { StructureModel } from "@dataspecer/core/structure-model/model/structure-model";
import {
  JsonSchema,
  JsonSchemaAny,
  JsonSchemaArray,
  JsonSchemaBoolean,
  JsonSchemaConst,
  JsonSchemaEnum,
  JsonSchemaNull,
  JsonSchemaNumber,
  JsonSchemaObject,
  JsonSchemaRef,
  JsonSchemaString,
  type JsonSchemaDefinition,
} from "../json-schema/json-schema-model.ts";
import type {
  JsonSchemaArrayViewModel,
  JsonSchemaBooleanViewModel,
  JsonSchemaConstViewModel,
  JsonSchemaDefinitionViewModel,
  JsonSchemaNumericViewModel,
  JsonSchemaObjectPropertyViewModel,
  JsonSchemaObjectViewModel,
  JsonSchemaRefViewModel,
  JsonSchemaStringViewModel,
  JsonSchemaViewModel,
} from "./view-model.ts";
import type { ConceptualModel } from "@dataspecer/core/conceptual-model/model/conceptual-model";
import type { ConceptualModelProperty } from "@dataspecer/core/conceptual-model/model/conceptual-model-property";
import { selectLanguage } from "../json-schema/json-schema-generator.ts";
import { StructureModelClass } from "@dataspecer/core/structure-model/model/structure-model-class";
import { StructureModelProperty } from "@dataspecer/core/structure-model/model/structure-model-property";
import type { JsonConfiguration } from "../configuration.ts";
import type { ArtefactGeneratorContext } from "@dataspecer/core/generator/artefact-generator-context";
import { pathRelative } from "@dataspecer/core/core/utilities/path-relative";
import type { DataSpecificationArtefact } from "@dataspecer/core/data-specification/model/data-specification-artefact";

interface ViewAdapterParams {
  structureModel: StructureModel;
  conceptualModel: ConceptualModel;
  jsonSchema: JsonSchema;
  configuration: JsonConfiguration;
  context: ArtefactGeneratorContext;
  artefact: DataSpecificationArtefact;

  // Preferred languages for labels and descriptions
  languages: string[];
}

/**
 * Creates a view model representing single JSON Schema document based on the provided JSON Schema and Structure Model.
 */
export function createJsonSchemaViewModel(params: ViewAdapterParams): JsonSchemaViewModel {
  const adapter = new ViewAdapter();
  return adapter.process(params);
}

function normalizeLabel(label: string) {
  return label?.replace(/ /g, "-").toLowerCase() ?? "";
}

class ViewAdapter {
  private mainClasses: JsonSchemaObjectViewModel[] = [];
  private structureModel: StructureModel | null = null;
  private conceptualModel: ConceptualModel | null = null;
  private conceptualModelProperties: Record<string, ConceptualModelProperty> = {};
  private context: ArtefactGeneratorContext;
  private artefact: DataSpecificationArtefact;
  private languages: string[] = [];

  public process(params: ViewAdapterParams): JsonSchemaViewModel {
    this.structureModel = params.structureModel;
    this.conceptualModel = params.conceptualModel;
    this.context = params.context;
    this.artefact = params.artefact;
    this.languages = params.languages;
    this.preprocess();

    // Traverse JSON Schema and collect all objects representing structural elements
    const root = this.jsonSchemaDefinitionToViewModel(params.jsonSchema.root);

    const viewModel: JsonSchemaViewModel = {
      structureModel: params.structureModel,
      jsonSchema: params.jsonSchema,

      anchor: this.getAnchorForStructure(params.structureModel),

      dialect: metaschemaToDialect(params.jsonSchema.schema ?? ""),

      id: params.jsonSchema.id ?? "",

      root,
      mainClasses: this.mainClasses.toReversed(), // We need to reverse the order because we traverse recursively and add the main class at the end
    };

    return viewModel;
  }

  private getAnchorForStructure(structure: StructureModel): string {
    const labelToNormalize = structure.technicalLabel || selectLanguage(structure!.humanLabel, this.languages) || structure.psmIri;

    // todo decide whether anchors shall be localized
    return `json-schema--${normalizeLabel(labelToNormalize)}`;
  }

  /**
   * Returns anchor for describing JSON Schema parts based on structural entity.
   */
  private getAnchor(structuralEntity: StructureModelClass | StructureModelProperty): string {
    const structureLabel = this.structureModel.technicalLabel || normalizeLabel(selectLanguage(this.structureModel.humanLabel, ["en"]));

    if (structuralEntity instanceof StructureModelClass) {
      const label = structuralEntity.humanLabel?.cs ?? structuralEntity.humanLabel?.en ?? "";
      return `json-object--${structureLabel}--${normalizeLabel(label)}`;
    } else if (structuralEntity instanceof StructureModelProperty) {
      const obj = this.structureModel.getClasses().find((c) => c.properties.find((p) => p === structuralEntity))!;
      const objLabel = obj.humanLabel?.cs ?? obj.humanLabel?.en ?? "";
      //const label = this.humanLabel?.cs ?? this.humanLabel?.en ?? "";
      return `json-property--${structureLabel}--${normalizeLabel(objLabel)}-${normalizeLabel(structuralEntity.technicalLabel)}`;
    }
  }

  private preprocess() {
    Object.values(this.conceptualModel.classes).forEach((cls) => {
      cls.properties.forEach((prop) => {
        this.conceptualModelProperties[prop.pimIri] = prop;
      });
    });
  }

  private jsonSchemaDefinitionToViewModel(definition: JsonSchemaDefinition): JsonSchemaDefinitionViewModel {
    if (JsonSchemaObject.is(definition)) {
      return this.jsonSchemaObjectToViewModel(definition);
    }
    if (JsonSchemaArray.is(definition)) {
      return this.jsonSchemaArrayToViewModel(definition);
    }
    if (JsonSchemaNull.is(definition)) {
      return this.createConstViewModel(null, definition);
    }
    if (JsonSchemaBoolean.is(definition)) {
      return this.jsonSchemaBooleanToViewModel(definition);
    }
    if (JsonSchemaNumber.is(definition)) {
      return this.jsonSchemaNumberToViewModel(definition);
    }
    if (JsonSchemaString.is(definition)) {
      return this.jsonSchemaStringToViewModel(definition);
    }
    if (JsonSchemaConst.is(definition)) {
      return this.createConstViewModel(definition.value, definition);
    }
    if (JsonSchemaEnum.is(definition)) {
      return this.jsonSchemaEnumToViewModel(definition);
    }
    if (JsonSchemaRef.is(definition)) {
      return this.jsonSchemaRefToViewModel(definition);
    }
    if (JsonSchemaAny.is(definition)) {
      return this.jsonSchemaAnyToViewModel(definition);
    }
    throw new Error(`Unsupported JSON Schema definition type (${definition.type}) when creating documentation.`);
  }

  private processCommonProperties(definition: JsonSchemaDefinition): Omit<JsonSchemaDefinitionViewModel, "examples" | "isMain" | "type" | "anchor"> {
    return {
      jsonSchemaDefinition: definition,

      anyOf: definition.anyOf.length > 0 ? definition.anyOf.map((d) => this.jsonSchemaDefinitionToViewModel(d)) : null,
      oneOf: definition.oneOf.length > 0 ? definition.oneOf.map((d) => this.jsonSchemaDefinitionToViewModel(d)) : null,
      allOf: definition.allOf.length > 0 ? definition.allOf.map((d) => this.jsonSchemaDefinitionToViewModel(d)) : null,
    };
  }

  private jsonSchemaAnyToViewModel(definition: JsonSchemaDefinition): JsonSchemaDefinitionViewModel {
    return {
      ...this.processCommonProperties(definition),
      type: "any",
      anchor: null,

      isMain: false,

      examples: null,
    };
  }

  /**
   * Helper function to create const view model
   */
  private createConstViewModel(value: any, definition: JsonSchemaDefinition): JsonSchemaConstViewModel {
    const strValue = stringifyConstValue(value);

    return {
      ...this.processCommonProperties(definition),
      type: "const",
      isMain: false,

      const: strValue,
      multiline: strValue.includes("\n"),

      examples: [],
    } as JsonSchemaConstViewModel;
  }

  private jsonSchemaBooleanToViewModel(definition: JsonSchemaBoolean): JsonSchemaBooleanViewModel {
    return {
      ...this.processCommonProperties(definition),
      type: "boolean",
      anchor: null,

      isMain: false,

      examples: null,
    };
  }

  private jsonSchemaEnumToViewModel(definition: JsonSchemaEnum): JsonSchemaDefinitionViewModel {
    return {
      ...this.processCommonProperties(definition),
      type: "enum",
      anchor: null,

      isMain: false,
      examples: null,
    };
  }

  private jsonSchemaNumberToViewModel(definition: JsonSchemaNumber): JsonSchemaNumericViewModel {
    return {
      ...this.processCommonProperties(definition),
      type: "numeric",
      anchor: null,

      isMain: false,
      integerOnly: definition.isInteger,

      examples: null,
    };
  }

  private jsonSchemaStringToViewModel(definition: JsonSchemaString): JsonSchemaStringViewModel {
    return {
      ...this.processCommonProperties(definition),
      type: "string",
      anchor: null,

      isMain: false,
      format: definition.format,
      pattern: definition.pattern,

      examples: null,
    };
  }

  private jsonSchemaRefToViewModel(definition: JsonSchemaRef): JsonSchemaRefViewModel {
    const cls = definition.representsStructuralElement!;

    const specification = this.context.specifications[cls.specification];
    const isExternal = this.structureModel.specification !== cls.specification;

    const artefact = specification.artefacts.find((a) => a.generator === "https://schemas.dataspecer.com/generator/template-artifact");
    const path = pathRelative(this.artefact.publicUrl, artefact.publicUrl);
    const anchor = this.getAnchorForStructure(this.context.structureModels[cls.structureSchema]);
    const link = `${isExternal ? path : ""}#${anchor}`;
    const semanticModel = this.context.conceptualModels[this.context.specifications[cls.specification].pim];

    return {
      ...this.processCommonProperties(definition),
      type: "ref",
      anchor: null, // todo

      structureEntity: definition.representsStructuralElement || null,

      link,
      fromExternalSpecification: isExternal,
      semanticModel,

      isMain: false,
      ref: null as any, // todo

      examples: null,
    };
  }

  private jsonSchemaObjectToViewModel(definition: JsonSchemaObject): JsonSchemaObjectViewModel {
    const properties: JsonSchemaObjectPropertyViewModel[] = [];

    for (const [key, value] of Object.entries(definition.properties)) {
      const structureModelProperty = definition.representsStructuralElement?.properties.find((p) => p.technicalLabel === key) ?? null;
      properties.push({
        key,
        required: definition.required.includes(key),
        value: this.jsonSchemaDefinitionToViewModel(value),

        structureEntity: structureModelProperty,
        semanticEntity: this.conceptualModelProperties[structureModelProperty?.pimIri ?? ""] || null,
      });
    }

    const isMain = !!definition.representsStructuralElement;

    const result = {
      ...this.processCommonProperties(definition),
      jsonSchemaDefinition: definition,
      type: "object",
      isMain,
      anchor: isMain && definition.representsStructuralElement ? this.getAnchor(definition.representsStructuralElement) : null,

      structureEntity: definition.representsStructuralElement,
      semanticEntity: definition.representsStructuralElement ? this.conceptualModel.classes[definition.representsStructuralElement.pimIri] : null,

      properties: properties.length > 0 ? properties : null,

      additionalProperties: false,

      examples: null,
    } satisfies JsonSchemaObjectViewModel;

    if (isMain) {
      this.mainClasses.push(result);
    }

    return result;
  }

  private jsonSchemaArrayToViewModel(definition: JsonSchemaArray): JsonSchemaArrayViewModel {
    const minItems = 0;
    const maxItems = null;
    return {
      ...this.processCommonProperties(definition),
      jsonSchemaDefinition: definition,
      type: "array",
      isMain: false,
      anchor: null,

      items: this.jsonSchemaDefinitionToViewModel(definition.items!),
      contains: definition.contains ? this.jsonSchemaDefinitionToViewModel(definition.contains) : null,

      minItems,
      maxItems,

      cardinalityText: `{${minItems}..${maxItems === null ? "*" : maxItems}}`,

      examples: null,
    };
  }
}

function metaschemaToDialect(metaschemaIri: string) {
  if (metaschemaIri === "https://json-schema.org/draft/2020-12/schema") {
    return {
      number: "2020-12",
      specificationUrl: "https://json-schema.org/specification-links.html#2020-12-release",
      metaschemaIri: metaschemaIri,
    };
  }

  if (metaschemaIri === "https://json-schema.org/draft/2019-09/schema") {
    return {
      number: "2019-09",
      specificationUrl: "https://json-schema.org/draft/2019-09/draft-handrews-json-schema-02.html",
      metaschemaIri: metaschemaIri,
    };
  }

  return null;
}

function stringifyConstValue(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
