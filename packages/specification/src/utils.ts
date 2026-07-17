import type { Entity } from "@dataspecer/core-v2";
import { createDefaultConfigurationModelFromJsonObject } from "@dataspecer/core-v2/configuration-model";
import { isSemanticModelClass, isSemanticModelRelationship, SemanticModelEntity } from "@dataspecer/core-v2/semantic-model/concepts";
import { isSemanticModelClassProfile, isSemanticModelRelationshipProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import type { LanguageString } from "@dataspecer/core/core/core-resource";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import { createSetEntityOperation, generateOperationId, type Transaction } from "@dataspecer/core/operation";
import { ldesToRdf, profileTransactionsToLdes, vocabularyTransactionsToLdes } from "@dataspecer/data-specification-vocabulary/ldes";
import * as DataSpecificationVocabulary from "@dataspecer/data-specification-vocabulary/semantic-model";
import { getMustacheView } from "@dataspecer/documentation";
import { createPartialDocumentationConfiguration, DOCUMENTATION_MAIN_TEMPLATE_PARTIAL } from "@dataspecer/documentation/configuration";
import { generateDocumentation } from "@dataspecer/documentation/documentation-generator";
import { generateLightweightOwl as generateLightweightOwlInternal } from "@dataspecer/lightweight-owl";
import { mergeDocumentationConfigurations } from "./documentation/documentation.ts";
import { ModelDescription } from "./model.ts";
import { GenerateSpecificationContext } from "./specification.ts";
import { semanticModelsToShacl, shaclToRdf, type SemanticModelsToShaclConfiguration } from "@dataspecer/shacl-v2";

/**
 * Helper function that check whether the model is a vocabulary. If not, it is probably an application profile.
 */
export function isModelVocabulary(model: Record<string, SemanticModelEntity>): boolean {
  return Object.values(model).some((entity) => isSemanticModelClass(entity) || isSemanticModelRelationship(entity));
}
/**
 * Helper function that check whether the model is an application profile. If not, it is probably a vocabulary.
 */
export function isModelProfile(model: Record<string, SemanticModelEntity>): boolean {
  return Object.values(model).some((entity) => isSemanticModelClassProfile(entity) || isSemanticModelRelationshipProfile(entity));
}

export async function generateLightweightOwl(entities: Record<string, SemanticModelEntity>, baseIri: string, iri: string): Promise<string> {
  // @ts-ignore
  return await generateLightweightOwlInternal(Object.values(entities), { baseIri, iri });
}

/**
 * Generates Application Profile DSV representation.
 */
export async function generateDsvApplicationProfile(forExportModels: ModelDescription[], forContextModels: ModelDescription[], iri: string) {
  // Step 1: Prepare models in the required format.

  const modelMapping = (model: ModelDescription) => ({
    getBaseIri: () => model.baseIri ?? "",
    getEntities: () => model.entities,
  });

  const profiles = forExportModels.map(modelMapping);

  const semanticsDependencies = forContextModels.filter((model) => isModelVocabulary(model.entities)).map(modelMapping);
  const profilesDependencies = forContextModels.filter((model) => isModelProfile(model.entities)).map(modelMapping);

  // Step 2: Generate DSV.

  const applicationProfile = DataSpecificationVocabulary.createDataSpecificationVocabulary(
    {
      semantics: semanticsDependencies,
      profiles: profilesDependencies,
    },
    profiles,
    {
      iri,
    },
  );

  const dsvString = await DataSpecificationVocabulary.conceptualModelToRdf(applicationProfile, {
    prettyPrint: true,
    prefixes: undefined, // todo
  });

  return dsvString;
}

/**
 * Publishes the operations of the model as an LDES stream, see
 * `@dataspecer/data-specification-vocabulary/ldes`. Members are version
 * objects of the published representation of the model: DSV term profiles
 * for an application profile, OWL classes and properties for a vocabulary.
 *
 * When no transaction history is available, the current state of the model
 * is published as a single initial transaction.
 */
export async function generateLdesOperationStream(
  forExportModel: ModelDescription,
  forContextModels: ModelDescription[],
  iri: string,
  streamIri: string,
  history: { models: Record<string, EntityRecord>; transactions: Transaction[] } | undefined,
): Promise<string> {
  const publishedModelId = forExportModel.id ?? "model";

  const baseIris: Record<string, string | null> = {};
  for (const model of forContextModels) {
    if (model.id !== null) {
      baseIris[model.id] = model.baseIri;
    }
  }
  baseIris[publishedModelId] = forExportModel.baseIri;

  let models: Record<string, EntityRecord>;
  let transactions: Transaction[];
  if (history) {
    models = history.models;
    transactions = history.transactions;
  } else {
    models = {};
    for (const model of forContextModels) {
      if (model.id !== null) {
        models[model.id] = model.entities;
      }
    }
    models[publishedModelId] = {};
    transactions = [{
      id: generateOperationId(),
      operations: Object.values(forExportModel.entities)
        .map((entity) => ({ modelId: publishedModelId, operation: createSetEntityOperation(entity) })),
    }];
  }

  const input = {
    streamIri,
    publishedModelIri: iri,
    models,
    baseIris,
    publishedModelId,
    transactions,
  };
  const stream = isModelVocabulary(forExportModel.entities)
    ? vocabularyTransactionsToLdes(input)
    : profileTransactionsToLdes(input);

  return await ldesToRdf(stream, { prettyPrint: true });
}

export async function generateShaclApplicationProfile(forExportModel: ModelDescription, forContextModels: ModelDescription[], iri: string, configuration: SemanticModelsToShaclConfiguration) {
  // We want to do memoization here because the called function is depending on the same models
  const mapModelMemoization = new WeakMap<ModelDescription, ReturnType<typeof mapModel>>();
  const mapModel = (model: ModelDescription): {
  getId: () => string;
  getBaseIri: () => string | null;
  getEntities: () => Record<string, SemanticModelEntity>;
  } => {
    if (mapModelMemoization.has(model)) {
      return mapModelMemoization.get(model)!;
    }

    const result = {
      getId: () => model.baseIri!,
      getBaseIri: () => model.baseIri ?? null,
      getEntities: () => model.entities,
    };

    mapModelMemoization.set(model, result);

    return result;
  };

  /**
   * IRI to key mapping.
   *
   * It is necessary to know prefixes of all vocabularies used in the
   * application profile in oder to create proper SHACL shape IRIs.
   */
  const prefixesForIriConstruction: Record<string, string> = {};

  for (const model of forContextModels) {
    if (model.isPrimary && isModelProfile(model.entities)) {
      continue;
    }
    const baseIri = model.baseIri ?? null;

    if (baseIri) {
      let candidate = /([^\/]+)[\/#]$/.exec(baseIri)?.[1] ?? null;
      candidate ??= "v";
      prefixesForIriConstruction[baseIri] = candidate;
    }
  }

  const shacl = semanticModelsToShacl(
    forContextModels.filter((model) => isModelVocabulary(model.entities)).map(mapModel),
    forContextModels.filter((model) => isModelProfile(model.entities)).map(mapModel),
    mapModel(forExportModel),
    configuration, { baseIri: iri, defaultPrefixes: prefixesForIriConstruction },
  );

  const rdf = await shaclToRdf(shacl, {});

  return rdf;
}

/**
 * Returns mapping from entity ID to their public IRI (IRI is ID under which the entity is published).
 * @todo Move this function to somewhere else.
 */
export async function getIdToIriMapping(models: ModelDescription[]): Promise<Record<string, string>> {
  const entityToIri = (entity: Entity, baseIri: string): string => {
    // Relations store IRI in the range.
    let iri: string | null = null;
    if (isSemanticModelRelationship(entity) || isSemanticModelRelationshipProfile(entity)) {
      const [_, range] = entity.ends;
      iri = range?.iri ?? iri;
    } else {
      // This can by anything, we just try to graph the IRI.
      iri = (entity as any).iri;
    }
    // We use the identifier as the default fallback.
    iri = iri ?? entity.id;
    // Now deal with absolute and relative.
    if (iri.includes("://")) {
      // Absolute IRI.
      return iri;
    } else {
      // Relative IRI.
      return baseIri + iri;
    }
  };

  const mapping: Record<string, string> = {};
  for (const model of models) {
    for (const [entityId, entity] of Object.entries(model.entities)) {
      const iri = entityToIri(entity, model.baseIri ?? "");
      mapping[entityId] = iri;
    }
  }

  return mapping;
}

/**
 * Returns HTML documentation for the given package.
 */
export async function generateHtmlDocumentation(
  rootPackage: { data: unknown; label: LanguageString },
  models: ModelDescription[],
  options: {
    externalArtifacts?: Record<
      string,
      {
        type: string;
        URL: string;
      }[]
    >;
    dsv?: any;
    language?: string;
    prefixMap?: Record<string, string>;
  } = {},
  generatorContext: GenerateSpecificationContext,
): Promise<string> {
  const externalArtifacts = options.externalArtifacts ?? {};

  const configuration = createDefaultConfigurationModelFromJsonObject(rootPackage.data as object);
  const documentationConfiguration = createPartialDocumentationConfiguration(configuration);
  const fullConfiguration = mergeDocumentationConfigurations([documentationConfiguration]);

  const context = {
    label: rootPackage.label ?? {},
    models,
    externalArtifacts,
    dsv: options.dsv ? JSON.parse(options.dsv) : {},
    prefixMap: options.prefixMap ?? {},
  };

  return await generateDocumentation(
    context,
    {
      template: fullConfiguration.partials[DOCUMENTATION_MAIN_TEMPLATE_PARTIAL]!,
      language: options.language ?? "en",
      partials: fullConfiguration.partials,
    },
    generatorContext.v1Context
      ? (adapter) =>
        getMustacheView(
          {
            context: generatorContext.v1Context,
            specification: generatorContext.v1Specification,
            artefact: generatorContext.v1Specification.artefacts.find((a: any) => a.generator === "https://schemas.dataspecer.com/generator/template-artifact"),
          },
          adapter,
        )
      : undefined,
  );
}
