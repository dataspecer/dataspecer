import { LocalEntityWrapped } from "@dataspecer/core-v2/hierarchical-semantic-aggregator";
import { ConceptualModel } from "@dataspecer/core/conceptual-model";
import { assertFailed, assertNot, createStringSelector, LanguageString } from "@dataspecer/core/core";
import { DataSpecificationConfiguration, DataSpecificationConfigurator, DefaultDataSpecificationConfiguration } from "@dataspecer/core/data-specification/configuration";
import { DataSpecification, DataSpecificationArtefact, DataSpecificationSchema } from "@dataspecer/core/data-specification/model";
import { ArtefactGenerator, ArtefactGeneratorContext } from "@dataspecer/core/generator";
import { StreamDictionary } from "@dataspecer/core/io/stream/stream-dictionary";
import { StructureModel } from "@dataspecer/core/structure-model/model";
import { structureModelAddDefaultValues, transformStructureModel } from "@dataspecer/core/structure-model/transformation";
import { DefaultJsonConfiguration, JsonConfiguration, JsonConfigurator } from "../configuration.ts";
import { MAIN_JSON_PARTIAL } from "../documentation/configuration.ts";
import { createJsonSchemaViewModel } from "../documentation/view-adapter.ts";
import { structureModelAddJsonProperties } from "../json-structure-model/add-json-properties.ts";
import { structureModelAddIdAndTypeProperties } from "./json-id-transformations.ts";
import { structureModelToJsonSchema } from "./json-schema-model-adapter.ts";
import { JsonSchema } from "./json-schema-model.ts";
import { JSON_SCHEMA } from "./json-schema-vocabulary.ts";
import { writeJsonSchema } from "./json-schema-writer.ts";
import { shortenByIriPrefixes } from "./propagate-iri-regex.ts";

export function selectLanguage(input: LanguageString, languages: readonly string[]): string | undefined {
  for (const language of languages) {
    if (input[language]) {
      return input[language];
    }
  }

  // noinspection LoopStatementThatDoesntLoopJS
  for (const language in input) {
    return input[language];
  }

  return undefined;
}

export class JsonSchemaGenerator implements ArtefactGenerator {
  identifier(): string {
    return JSON_SCHEMA.Generator;
  }

  async generateToStream(context: ArtefactGeneratorContext, artefact: DataSpecificationArtefact, specification: DataSpecification, output: StreamDictionary) {
    const model = (await this.generateToObject(context, artefact, specification)).jsonSchema;
    const stream = output.writePath(artefact.outputPath);
    await writeJsonSchema(model, stream);
    await stream.close();
  }

  async generateToObject(
    context: ArtefactGeneratorContext,
    artefact: DataSpecificationArtefact,
    specification: DataSpecification,
    skipIdAndTypeProperties = false,
  ): Promise<{
    structureModel: StructureModel;
    jsonSchema: JsonSchema;
    mergedConceptualModel: ConceptualModel;
    configuration: JsonConfiguration;
    globalConfiguration: DataSpecificationConfiguration;
  }> {
    if (!DataSpecificationSchema.is(artefact)) {
      assertFailed("Invalid artefact type.");
    }
    const schemaArtefact = artefact as DataSpecificationSchema;
    const conceptualModel = context.conceptualModels[specification.pim];
    // Options for the JSON generator
    const configuration = JsonConfigurator.merge(DefaultJsonConfiguration, JsonConfigurator.getFromObject(schemaArtefact.configuration)) as JsonConfiguration;
    // Global options for the data specification
    const globalConfiguration = DataSpecificationConfigurator.merge(
      DefaultDataSpecificationConfiguration,
      DataSpecificationConfigurator.getFromObject(schemaArtefact.configuration),
    ) as DataSpecificationConfiguration;
    assertNot(conceptualModel === undefined, `Missing conceptual model ${specification.pim}.`);
    let structureModel = context.structureModels[schemaArtefact.psm];
    assertNot(structureModel === undefined, `Missing structure model ${schemaArtefact.psm}.`);
    structureModel = await structureModelAddJsonProperties(structureModel, context.reader);
    const mergedConceptualModel = { ...conceptualModel };
    mergedConceptualModel.classes = Object.fromEntries(
      Object.values(context.conceptualModels)
        .map((cm) => Object.entries(cm.classes))
        .flat(),
    );
    structureModel = transformStructureModel(mergedConceptualModel, structureModel, Object.values(context.specifications));
    structureModel = structureModelAddDefaultValues(structureModel, globalConfiguration);
    structureModel = shortenByIriPrefixes(mergedConceptualModel, structureModel);

    // Semantic model from aggregator
    // @ts-ignore
    const semanticModel = specification.semanticModel.getAggregatedEntities() as Record<string, LocalEntityWrapped>;

    if (!skipIdAndTypeProperties) {
      structureModel = structureModelAddIdAndTypeProperties(structureModel, configuration, semanticModel);
    }
    const jsonSchema = structureModelToJsonSchema(
      context.specifications,
      specification,
      structureModel,
      configuration,
      artefact,
      createStringSelector([configuration.jsonLabelLanguage]),
    );

    return { structureModel, jsonSchema, mergedConceptualModel, configuration, globalConfiguration };
  }

  async generateForDocumentation(
    context: ArtefactGeneratorContext,
    artefact: DataSpecificationArtefact,
    specification: DataSpecification,
    documentationIdentifier: string,
    callerContext: unknown,
  ): Promise<unknown | null> {
    if (documentationIdentifier === "https://schemas.dataspecer.com/generator/template-artifact") {
      const { partial } = callerContext as {
        partial: (template: string) => string;
      };

      const { structureModel, jsonSchema, mergedConceptualModel, configuration } = await this.generateToObject(context, artefact, specification, false);

      const viewModel = createJsonSchemaViewModel({
        structureModel,
        conceptualModel: mergedConceptualModel,
        jsonSchema,
        configuration,
        context,
        artefact,
        languages: ["en"],
      });

      // Inject function needed for Handlebars templates
      (viewModel as unknown as { useTemplate: string }).useTemplate = partial(`{{#> ${MAIN_JSON_PARTIAL}}}{{/${MAIN_JSON_PARTIAL}}}`);

      return viewModel;
    }
    return null;
  }
}
