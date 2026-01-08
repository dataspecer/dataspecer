import type { Entity } from "@dataspecer/core-v2";
import { createDefaultConfigurationModelFromJsonObject } from "@dataspecer/core-v2/configuration-model";
import { isSemanticModelClass, isSemanticModelRelationship, SemanticModelEntity } from "@dataspecer/core-v2/semantic-model/concepts";
import { isSemanticModelClassProfile, isSemanticModelRelationshipProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import * as DataSpecificationVocabulary from "@dataspecer/data-specification-vocabulary";
import { getMustacheView } from "@dataspecer/documentation";
import { createPartialDocumentationConfiguration, DOCUMENTATION_MAIN_TEMPLATE_PARTIAL } from "@dataspecer/documentation/configuration";
import { generateDocumentation } from "@dataspecer/documentation/documentation-generator";
import { generateLightweightOwl as generateLightweightOwlInternal } from "@dataspecer/lightweight-owl";
import { mergeDocumentationConfigurations } from "./documentation/documentation.ts";
import { BlobModel } from "./model-repository/blob-model.ts";
import { ModelDescription } from "./model.ts";
import { GenerateSpecificationContext } from "./specification.ts";
import { createSemicShaclStylePolicy, createShaclForProfile, shaclToRdf } from "@dataspecer/shacl-v2";

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
export async function generateDsvApplicationProfile(forExportModels: ModelDescription[], forContextModels: ModelDescription[], iri: string, prefixMap?: Record<string, string>) {
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

  // Prepare configuration with custom prefixes merged with defaults
  // If prefixMap is provided and not empty, merge it with the default prefixes
  // Otherwise, don't pass the prefixes property to use defaults
  const config: any = {
    prettyPrint: true,
  };
  if (prefixMap && Object.keys(prefixMap).length > 0) {
    // Convert prefixMap from { baseIri: prefixName } to { prefixName: baseIri } format
    const invertedPrefixMap = Object.fromEntries(
      Object.entries(prefixMap).map(([baseIri, prefixName]) => [prefixName, baseIri])
    );
    // Merge custom prefixes with defaults
    config.prefixes = {
      "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
      "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
      "dct": "http://purl.org/dc/terms/",
      "dsv": "https://w3id.org/dsv#",
      "owl": "http://www.w3.org/2002/07/owl#",
      "skos": "http://www.w3.org/2004/02/skos/core#",
      "vann": "http://purl.org/vocab/vann/",
      "cardinality": "https://w3id.org/dsv/cardinality#",
      "requirement": "https://w3id.org/dsv/requirement-level#",
      "role": "https://w3id.org/dsv/class-role#",
      "prof": "http://www.w3.org/ns/dx/prof/",
      ...invertedPrefixMap,
    };
  }

  const dsvString = await DataSpecificationVocabulary.conceptualModelToRdf(applicationProfile, config);

  return dsvString;
}

export async function generateShaclApplicationProfile(forExportModel: ModelDescription, forContextModels: ModelDescription[], iri: string) {
  const mapModel = (model: ModelDescription) => ({
    getId: () => model.baseIri!,
    getBaseIri: () => model.baseIri ?? null,
    getEntities: () => model.entities,
  });

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

  const policy = createSemicShaclStylePolicy(iri, {
    defaultPrefixes: prefixesForIriConstruction,
  });

  const shacl = createShaclForProfile(
    forContextModels.filter((model) => isModelVocabulary(model.entities)).map(mapModel),
    forContextModels.filter((model) => !model.isPrimary && isModelProfile(model.entities)).map(mapModel),
    mapModel(forExportModel),
    policy,
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
  thisPackageModel: BlobModel,
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

  const packageData = await thisPackageModel.getJsonBlob();
  const configuration = createDefaultConfigurationModelFromJsonObject(packageData as object);
  const documentationConfiguration = createPartialDocumentationConfiguration(configuration);
  const fullConfiguration = mergeDocumentationConfigurations([documentationConfiguration]);

  const context = {
    label: thisPackageModel.getUserMetadata().label ?? {},
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
