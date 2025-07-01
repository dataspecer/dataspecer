import { SemanticModelEntity } from "@dataspecer/core-v2/semantic-model/concepts";
import * as DataSpecificationVocabulary from "@dataspecer/data-specification-vocabulary";
import { generateLightweightOwl as generateLightweightOwlInternal } from "@dataspecer/lightweight-owl";
import { GenerateSpecificationContext } from "./specification.ts";
import { ModelDescription } from "./model.ts";
import { createDefaultConfigurationModelFromJsonObject } from "@dataspecer/core-v2/configuration-model";
import { getMustacheView } from "@dataspecer/documentation";
import { createPartialDocumentationConfiguration, DOCUMENTATION_MAIN_TEMPLATE_PARTIAL } from "@dataspecer/documentation/configuration";
import { generateDocumentation } from "@dataspecer/documentation/documentation-generator";
import { mergeDocumentationConfigurations } from "./documentation/documentation.ts";
import { BlobModel } from "./model-repository/blob-model.ts";

export async function generateLightweightOwl(entities: Record<string, SemanticModelEntity>, baseIri: string, iri: string): Promise<string> {
  // @ts-ignore
  return await generateLightweightOwlInternal(Object.values(entities), { baseIri, iri });
}

export async function generateDsv(forExportModels: ModelDescription[], forContextModels: ModelDescription[], iri: string): Promise<string> {
  // We collect all models as context and all entities for export.
  const contextModels: DataSpecificationVocabulary.EntityListContainer[] = [];
  const modelForExport: DataSpecificationVocabulary.EntityListContainer = {
    baseIri: iri,
    entities: [],
  };
  for (const model of forContextModels.values()) {
    contextModels.push({
      baseIri: model.baseIri ?? "",
      entities: Object.values(model.entities),
    });
  }
  for (const model of forExportModels) {
    modelForExport.baseIri = model.baseIri ?? "";
    Object.values(model.entities).forEach((entity) => modelForExport.entities.push(entity));
  }
  // Create context.
  const context = DataSpecificationVocabulary.createContext(contextModels);
  //
  const conceptualModel = DataSpecificationVocabulary.entityListContainerToConceptualModel(iri, modelForExport, context);
  return await DataSpecificationVocabulary.conceptualModelToRdf(conceptualModel, { prettyPrint: true });
}
/**
 * Returns HTML documentation for the given package.
 */
export async function generateHtmlDocumentation(
  thisPackageModel: BlobModel,
  models: ModelDescription[],
  options: {
    externalArtifacts?: Record<
      string, {
        type: string;
        URL: string;
      }[]
    >;
    dsv?: any;
    language?: string;
    prefixMap?: Record<string, string>;
  } = {},
  generatorContext: GenerateSpecificationContext): Promise<string> {
  const externalArtifacts = options.externalArtifacts ?? {};

  const packageData = await thisPackageModel.getJsonBlob();
  const configuration = createDefaultConfigurationModelFromJsonObject(packageData as object);
  const documentationConfiguration = createPartialDocumentationConfiguration(configuration);
  const fullConfiguration = mergeDocumentationConfigurations([documentationConfiguration]);

  const context = {
    label: thisPackageModel.getUserMetadata().label ?? {},
    models,
    externalArtifacts,
    dsv: options.dsv,
    prefixMap: options.prefixMap ?? {},
  };

  return await generateDocumentation(context, {
    template: fullConfiguration.partials[DOCUMENTATION_MAIN_TEMPLATE_PARTIAL]!,
    language: options.language ?? "en",
    partials: fullConfiguration.partials,
  }, generatorContext.v1Context ? adapter => getMustacheView(
    {
      context: generatorContext.v1Context,
      specification: generatorContext.v1Specification,
      artefact: generatorContext.v1Specification.artefacts.find((a: any) => a.generator === "https://schemas.dataspecer.com/generator/template-artifact"),
    },
    adapter
  ) : undefined);
}

