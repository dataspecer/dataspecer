import { LOCAL_PACKAGE, LOCAL_SEMANTIC_MODEL, VISUAL_MODEL, QUERYABLE_MODEL, V1, RDFS_MODEL } from "@dataspecer/core-v2/model/known-models";
import { isSemanticModelClass, isSemanticModelGeneralization, isSemanticModelRelationship, SemanticModelEntity } from "@dataspecer/core-v2/semantic-model/concepts";
import { withAbsoluteIri } from "@dataspecer/core-v2/semantic-model/utils";
import { LanguageString, type CoreResource } from "@dataspecer/core/core/core-resource";
import { DataSpecificationArtefact } from "@dataspecer/core/data-specification/model/data-specification-artefact";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import { HttpFetch } from "@dataspecer/core/io/fetch/fetch-api";
import { StreamDictionary } from "@dataspecer/core/io/stream/stream-dictionary";
import { generatorConfigurationToRdf } from "@dataspecer/data-specification-vocabulary/generator-configuration";
import {
  DSV_APPLICATION_PROFILE_TYPE,
  DSV_VOCABULARY_SPECIFICATION_DOCUMENT_TYPE,
  DSVMetadataToJsonLdString,
  dsvMetadataWellKnown,
  type ApplicationProfile,
  type ExternalSpecification,
  type ResourceDescriptor,
  type Specification,
  type VocabularySpecificationDocument,
} from "@dataspecer/data-specification-vocabulary/specification-description";
import { structureModelToRdf } from "@dataspecer/data-specification-vocabulary/structure-model";
import type { ProjectModelEntity, PackageEntity } from "@dataspecer/project-model";
import { canonicalizeIds, garbageCollect } from "@dataspecer/structure-model";
import { ModelDescription, type StructureModelDescription } from "./model.ts";
import { DefaultShaclConfiguration, DefaultShaclFileKey, ShaclV2Configurator } from "./shacl-v2.ts";
import {
  generateDsvApplicationProfile,
  generateHtmlDocumentation,
  generateLightweightOwl,
  generateShaclApplicationProfile,
  getIdToIriMapping,
  isModelProfile,
  isModelVocabulary,
} from "./utils.ts";
import { artefactToDsv } from "./v1/artefact-to-dsv.ts";

/**
 * Id under which the project model (the package hierarchy) is stored in the
 * models record. @see GenerateSpecificationContext.models
 */
const PROJECT_MODEL_ID = "_project_model";

/**
 * Returns the immediate child model entities of a package, resolved from the
 * project model.
 */
function getSubModelEntities(projectModel: Record<string, ProjectModelEntity>, packageId: string): ProjectModelEntity[] {
  const packageEntity = projectModel[packageId] as PackageEntity | undefined;
  const subModelIds = packageEntity?.subModels ?? [];
  return subModelIds.map((id) => projectModel[id]).filter((entity): entity is ProjectModelEntity => entity !== undefined);
}

/**
 * Returns the data of a named storage blob of a model. Defaults to the
 * "model" blob, which is its own top-level model keyed by the model's own
 * id. Other blobs (e.g. "svg") are their own top-level model as well, keyed
 * by `${id}#${blobName}`.
 */
function getModelBlobData(models: Record<string, EntityRecord>, id: string, blobName: string = "model"): any {
  const blobId = blobName === "model" ? id : `${id}#${blobName}`;
  return models[blobId]?.[blobId];
}

/**
 * Additional context needed for generating the specification.
 * Basically this interface contains all functional dependencies.
 * @todo Consider how this is related to {@link GenerateSpecificationOptions}.
 */
export interface GenerateSpecificationContext {
  /**
   * All models needed to build the specification, pre-serialized by the
   * caller. Keyed by model id, with one extra entry for the project model
   * (see {@link PROJECT_MODEL_ID}) that describes the package hierarchy.
   *
   * A model may consist of several storage blobs (e.g. a visual model also
   * has an "svg" blob). Blobs other than the default ("model") are stored
   * under their own top-level key `${modelId}#${blobName}`.
   */
  models: Record<string, EntityRecord>;
  output: StreamDictionary;

  fetch: HttpFetch;

  // todo Following properties are temporary to support the old API.

  v1Context?: any;
  v1Specification?: any;
  artifacts: DataSpecificationArtefact[];
}

/**
 * Additional configuration for generating the specification.
 */
export interface GenerateSpecificationOptions {
  /**
   * Generate only a single file specified by this local path.
   */
  singleFilePath?: string;

  /**
   * String that will be appended to the generated file paths.
   * @example ?specification=iri
   */
  queryParams?: string;

  /**
   * Whether to generate output to a subdirectory.
   * Must end with a slash.
   */
  subdirectory?: string;
}

/**
 * Generates the specification with all the artifacts into the output stream.
 *
 * @todo The interface of this function is still not final. We need to properly
 * consider how generators should work and how to migrate old generators to the
 * new API.
 *
 * @todo Only generates new artifacts
 *
 * ! This function is called from backend and DSE
 *
 *  await generateSpecification(packageIri, {
 *    models: await getModelsForPackage(packageIri, resourceModel),
 *    output: streamDictionary,
 *    fetch: httpFetch,
 *  }, {
 *    queryParams,
 *  });
 */
export async function generateSpecification(packageId: string, context: GenerateSpecificationContext, options: GenerateSpecificationOptions = {}): Promise<void> {
  const subdirectory = options.subdirectory ?? "";
  const queryParams = options.queryParams ?? "";

  const allModels = context.models;
  const projectModel = (allModels[PROJECT_MODEL_ID] ?? {}) as Record<string, ProjectModelEntity>;

  const rootPackageEntity = projectModel[packageId] as PackageEntity | undefined;
  if (!rootPackageEntity) {
    throw new Error("Package does not exist.");
  }
  const subResources = getSubModelEntities(projectModel, packageId);

  let hasVocabulary = false;
  let hasApplicationProfile = false;

  const prefixMap = {} as Record<string, string>;

  // Find all models recursively and store them with their metadata
  const modelDescriptions = [] as ModelDescription[];
  const primaryStructureModels = [] as StructureModelDescription[];
  async function fillModels(packageIri: string, isRoot: boolean = false) {
    const pckgEntity = projectModel[packageIri] as PackageEntity | undefined;
    if (!pckgEntity) {
      throw new Error("Package does not exist.");
    }
    const children = getSubModelEntities(projectModel, packageIri);
    const semanticModels = children.filter((r) => r.modelType === LOCAL_SEMANTIC_MODEL);
    for (const semanticModel of semanticModels) {
      const modelEntities = allModels[semanticModel.id] ?? {};
      const mainEntity = modelEntities[semanticModel.id] as any;
      const baseIri = mainEntity?.baseIri ?? null;
      const entities = Object.fromEntries(Object.entries(modelEntities).filter(([id]) => id !== semanticModel.id));

      const modelName = semanticModel.label?.en ?? semanticModel.label?.cs;
      if (modelName && modelName.length > 0 && modelName.match(/^[a-z]+$/)) {
        prefixMap[baseIri] = modelName;
      }

      modelDescriptions.push({
        entities: Object.fromEntries(Object.entries(entities).map(([id, entity]) => [id, withAbsoluteIri(entity as SemanticModelEntity, baseIri)])),
        isPrimary: isRoot,
        documentationUrl: (pckgEntity as any).documentBaseUrl ?? null,
        baseIri,
        title: semanticModel.label,
      });
    }
    const sgovModels = children.filter((r) => r.modelType === QUERYABLE_MODEL);
    for (const sgovModel of sgovModels) {
      const modelEntities = allModels[sgovModel.id] ?? {};
      const entities = Object.fromEntries(Object.entries(modelEntities).filter(([_, entity]) =>
        isSemanticModelClass(entity) ||
        isSemanticModelRelationship(entity) ||
        isSemanticModelGeneralization(entity)
      )) as Record<string, SemanticModelEntity>;
      modelDescriptions.push({
        entities: entities,
        isPrimary: false,
        documentationUrl: null,
        baseIri: null,
        title: null,
      });
    }
    const pimModels = children.filter((r) => r.modelType === RDFS_MODEL);
    for (const pimModel of pimModels) {
      const modelEntities = allModels[pimModel.id] ?? {};
      const entities = Object.fromEntries(Object.entries(modelEntities).filter(([id]) => id !== pimModel.id)) as Record<string, SemanticModelEntity>;
      modelDescriptions.push({
        entities,
        isPrimary: false,
        documentationUrl: null,
        baseIri: null,
        title: null,
      });
    }
    if (isRoot) {
      const structureModels = children.filter((r) => r.modelType === V1.PSM);
      for (const structureModel of structureModels) {
        // We need to process resources to have IDs and IRIs..
        primaryStructureModels.push({
          id: structureModel.id,
          entities: (allModels[structureModel.id] ?? {}) as unknown as Record<string, CoreResource>,
        });
      }
    }
    const packages = children.filter((r) => r.modelType === LOCAL_PACKAGE);
    for (const p of packages) {
      await fillModels(p.id);
    }
  }
  await fillModels(packageId, true);

  /**
   * Each specification has a **base URL** and a **base IRI**, both of which
   * should end with a slash. We require a base URL because we expect all files
   * to be served from a web server at that location. Similarly, a base IRI is
   * necessary because there will be many resources, and we need the flexibility
   * to generate path and hash sections.
   *
   * Individual artifacts may influence their own IRIs and URLs. They can do
   * this by either specifying a different relative path than the one preset by
   * Dataspecer or, in theory, by providing an entirely different absolute IRI
   * and URL.
   *
   * The base URL and base IRI do not need to be identical; in fact, the base
   * IRI does not even need to dereference to the base URL. For example, a user
   * might want to use `http://w3id.org/` IRIs where the base IRI represents the
   * vocabulary, while the base URL represents the documentation (which may have
   * its own distinct IRI).
   *
   * ---
   *
   * In theory, we can use a base URL without a slash for a main document where
   * everything else resides in a subdirectory. We could also use a base IRI
   * with a hash. In this case, every resource from every artifact would share
   * the same pathname but have a unique hash. This approach may be intended for
   * cases where all content is contained within a single file.
   *
   * ---
   *
   * In DSV metadata descriptions, the resource descriptors are not the
   * resources themselves. These descriptors have their own IRIs, preferably in
   * the format: `{metadata base iri}#{id of the descriptor}`.
   */

  /**
   * Currently, Dataspecer uses base URL from generator configuration. Some
   * artifacts may influence relative URLs. Base IRI is currently taken from the
   * primary semantic model.
   *
   * We use base URL as is. We transform base IRI to end with a slash for
   * everything else than the model.
   */

  /**
   * Global generator configuration for this specification.
   */
  let generatorConfiguration: Record<string, any> = {};

  const generatorConfigurationModel = subResources.find((r) => r.modelType === V1.GENERATOR_CONFIGURATION) ?? null;
  if (generatorConfigurationModel) {
    generatorConfiguration = (getModelBlobData(allModels, generatorConfigurationModel.id) ?? {}) as Record<string, unknown>;
  }

  /**
   * Base URL for all generated files for this specification. This is the root.
   *
   * Ends with a slash.
   *
   * @todo Since vocabularies and APs did not need this at all, we used "/".
   * @todo We need to normalize the path so that domains only do not end with slash.
   */
  let baseUrl = generatorConfiguration["data-specification"]?.["publicBaseUrl"] ?? "/";
  if (!baseUrl.endsWith("/")) {
    baseUrl += "/";
  }

  const mainModelBaseIri = modelDescriptions.find((m) => m.isPrimary)?.baseIri ?? "";
  let baseIri = mainModelBaseIri;
  if (baseIri.endsWith("#")) {
    baseIri = baseIri.substring(0, baseIri.length - 1);
  }
  if (!baseIri.endsWith("/")) {
    baseIri += "/";
  }
  if (baseIri.length === 0) {
    baseIri = baseUrl;
  }

  /**
   * Whether we are generating in the "production mode" or in the "preview
   * mode". In the production mode, we want to use relative IRIs in order to
   * make images and other resources work.
   */
  const isPreviewMode = queryParams && queryParams.length > 0;

  // Get used vocabularies

  const usedVocabularies: ExternalSpecification[] = [];

  for (const entity of subResources) {
    if (entity.modelType === RDFS_MODEL) {
      const data = (getModelBlobData(allModels, entity.id) ?? {}) as {
        urls?: string[];
        alias?: string;
      };

      for (const url of data.urls ?? []) {
        usedVocabularies.push({
          url: url,
          title: data.alias ? { en: data.alias } : (entity.label ?? undefined),
        } satisfies ExternalSpecification);
      }
    }
    if (entity.modelType === LOCAL_PACKAGE) {
      // We need to obtain IRI of the application profile/vocabulary which is the base IRI of the semantic model.

      const importedPackageChildren = getSubModelEntities(projectModel, entity.id);
      const semanticModel = importedPackageChildren.find((m) => m.modelType === LOCAL_SEMANTIC_MODEL);
      if (semanticModel) {
        const data = getModelBlobData(allModels, semanticModel.id) as any;
        const baseIri = data?.baseIri ?? "";
        usedVocabularies.push({
          iri: baseIri,
          url: (entity as any).importedFromUrl,
          title: {},
        });
      }
    }
  }

  // Primary semantic model
  const semanticModel = {};
  for (const model of modelDescriptions) {
    if (model.isPrimary) {
      Object.assign(semanticModel, model.entities);
    }
  }

  // External artifacts for the documentation
  const externalArtifacts: Record<
    string,
    {
      type: string;
      URL: string;
      label?: LanguageString;
    }[]
  > = {};

  const writeFile = async (path: string, data: string) => {
    const file = context.output.writePath(`${subdirectory}${path}`);
    await file.write(data);
    await file.close();
  };

  // Array of all models' resource descriptors' has resource
  const allModelsHasResource: ResourceDescriptor[][] = [];
  // HasResource for the application profile
  let APHasResource: ResourceDescriptor[] | null = null;

  // List of all specifications (according to DSV metadata definition) that this package contains
  const specifications: Specification[] = [];

  let idToIriMapping: Record<string, string> = {};

  // For each model we need to decide whether it is a standalone vocabulary of application profile
  for (const model of modelDescriptions.filter((m) => m.isPrimary)) {
    // Resource ID of the Model
    const modelIri = model.baseIri ?? (baseIri + isModelVocabulary(model.entities) ? "vocabulary" : "profile");
    const fileName = isModelVocabulary(model.entities) ? "model.owl.ttl" : "dsv.ttl";
    // This is the physical location of the model
    const modelUrl = baseUrl + fileName + queryParams;

    let modelDescription = rootPackageEntity.description as LanguageString | undefined;
    modelDescription = modelDescription ? Object.fromEntries(Object.entries(modelDescription).filter(([_, v]) => v)) : undefined;
    if (modelDescription && Object.keys(modelDescription).length === 0) {
      modelDescription = undefined;
    }

    // Process vocabulary models as standalone RDFS vocabularies
    if (isModelVocabulary(model.entities)) {
      hasVocabulary = true;

      const hasResource: ResourceDescriptor[] = [];
      allModelsHasResource.push(hasResource);

      // This describes the model as a resource, not the descriptor of the serialization
      const specification = {
        types: [DSV_VOCABULARY_SPECIFICATION_DOCUMENT_TYPE],

        iri: modelIri,

        title: rootPackageEntity.label ?? model.title ?? {},
        description: modelDescription ?? {},

        // token: undefined,
        resources: hasResource,
        isProfileOf: [...usedVocabularies],
      } satisfies VocabularySpecificationDocument;
      specifications.push(specification);

      // Serialize the model in OWL

      const owl = await generateLightweightOwl(model.entities, model.baseIri ?? "", modelIri);
      await writeFile(fileName, owl);
      // Add entry for the documentation
      externalArtifacts["owl-vocabulary"] = [{ type: fileName, URL: modelUrl }];

      // Create the descriptor of the OWL serialization

      const descriptor = {
        iri: null, // blank node
        url: modelUrl,
        role: dsvMetadataWellKnown.role.vocabulary,
        formatMime: dsvMetadataWellKnown.formatMime.turtle,
        conformsTo: [dsvMetadataWellKnown.conformsTo.rdfs, dsvMetadataWellKnown.conformsTo.owl],
        additionalRdfTypes: [],
      } satisfies ResourceDescriptor;
      hasResource.push(descriptor);
    }

    // Process application profile model as a standalone application profile - we do not need to see additional vocabularies for it.
    if (isModelProfile(model.entities)) {
      hasApplicationProfile = true;

      const hasResource: ResourceDescriptor[] = [];
      allModelsHasResource.push(hasResource);
      APHasResource = hasResource;

      // This describes the model as a resource, not the descriptor of the serialization
      const dsvEntry = {
        iri: modelIri,
        types: [DSV_APPLICATION_PROFILE_TYPE],
        title: rootPackageEntity.label ?? model.title ?? {},
        description: modelDescription ?? {},
        //token: "xxx",
        isProfileOf: [...usedVocabularies],
        resources: hasResource,
      } satisfies ApplicationProfile;
      specifications.push(dsvEntry);

      // Serialize the model in DSV

      const dsv = await generateDsvApplicationProfile([model], modelDescriptions, modelIri);
      idToIriMapping = {
        ...idToIriMapping,
        ...(await getIdToIriMapping([model])),
      };
      await writeFile(fileName, dsv);
      externalArtifacts["dsv-profile"] = [{ type: fileName, URL: modelUrl }];

      // Create the descriptor of the DSV serialization

      const descriptor = {
        iri: null,
        url: modelUrl,

        additionalRdfTypes: [],

        role: dsvMetadataWellKnown.role.constraints,
        conformsTo: [dsvMetadataWellKnown.conformsTo.profProfile, dsvMetadataWellKnown.conformsTo.dsvApplicationProfile],
        formatMime: dsvMetadataWellKnown.formatMime.turtle,
      } satisfies ResourceDescriptor;
      hasResource.push(descriptor);

      // Create shacl shape(s) — one per entry in the ShaclConfiguration
      {
        const shaclConfig = ShaclV2Configurator.merge(
          DefaultShaclConfiguration,
          ShaclV2Configurator.getFromObject(generatorConfiguration),
        );
        const shaclProfileExternalArtifacts: typeof externalArtifacts[keyof typeof externalArtifacts] = [];
        externalArtifacts["shacl-profile"] = shaclProfileExternalArtifacts;
        for (const [fileKey, fileConf] of Object.entries(shaclConfig.files)) {
          const shaclFileName = fileKey === DefaultShaclFileKey ? "shacl.ttl" : `shacl-${fileKey}.ttl`;
          const shaclUrl = baseUrl + shaclFileName + queryParams;
          const shacl = await generateShaclApplicationProfile(model, modelDescriptions, modelIri, fileConf);
          await writeFile(shaclFileName, shacl);
          shaclProfileExternalArtifacts.push({ type: shaclFileName, URL: shaclUrl });
          const shaclDescriptor = {
            iri: null,
            url: shaclUrl,
            role: dsvMetadataWellKnown.role.constraints,
            formatMime: dsvMetadataWellKnown.formatMime.turtle,
            additionalRdfTypes: [],
            conformsTo: [dsvMetadataWellKnown.conformsTo.shacl],
          } satisfies ResourceDescriptor;
          hasResource.push(shaclDescriptor);
        }
      }
    }
  }

  /**
   * This part iterates over all structure models, garbage collects them, fixes
   * their IDs and exports them as individual Turtle files.
   */

  let structureModels = primaryStructureModels.map((sm) => Object.values(sm.entities as unknown as Record<string, CoreResource>));
  structureModels = structureModels.map((sm) => garbageCollect(sm));
  const processedStructureModels = canonicalizeIds(structureModels, idToIriMapping, baseIri);

  if (processedStructureModels.length > 0) {
    externalArtifacts["structure-model"] = [];
  }
  for (const structureModel of processedStructureModels) {
    const path = structureModel.fileNamePart + "/structure.ttl";
    const url = baseUrl + path + queryParams;

    const sm = await structureModelToRdf(structureModel.model, {});
    await writeFile(path, sm);

    const resourceDescriptor = {
      iri: null,
      url,

      role: dsvMetadataWellKnown.role.schema,
      formatMime: dsvMetadataWellKnown.formatMime.turtle,
      additionalRdfTypes: [],

      conformsTo: [dsvMetadataWellKnown.conformsTo.dsvStructure],
    } satisfies ResourceDescriptor;
    APHasResource?.push(resourceDescriptor);

    externalArtifacts["structure-model"]?.push({
      type: "structure-model",
      URL: url,
    });
  }

  // Process generator configuration
  if (Object.values(generatorConfiguration).some(v => Object.keys(v).length > 0)) {
    // We have useful configuration that we want to share.

    const iri = baseIri + "generator-configuration#";
    const fileName = "generator-configuration.ttl";
    const url = baseUrl + fileName + queryParams;

    const data = await generatorConfigurationToRdf(iri, generatorConfiguration);
    await writeFile(fileName, data);
    const descriptor = {
      iri: null,
      url,

      role: dsvMetadataWellKnown.role.schema,
      formatMime: dsvMetadataWellKnown.formatMime.turtle,
      additionalRdfTypes: [],

      conformsTo: [dsvMetadataWellKnown.conformsTo.dsvStructureConfiguration],
    } satisfies ResourceDescriptor;
    APHasResource?.push(descriptor);

    externalArtifacts["generator-configuration"] = [
      ...(externalArtifacts["generator-configuration"] ?? []),
      {
        type: fileName,
        URL: url,
      },
    ];
  }

  // Process all SVGs. Because we do not know which svg belongs to which model,
  // we assign all of them to all models.
  // Also, currently SVGs are not language dependent, so we generate them to the root of the directory.
  const visualModels = subResources.filter((r) => r.modelType === VISUAL_MODEL);
  for (const visualModel of visualModels) {
    const svgData = getModelBlobData(allModels, visualModel.id, "svg") as { svg: string } | undefined;
    const svg = svgData ? svgData.svg : null;

    if (svg) {
      const resourceFileName = visualModel.id + ".svg";
      const resourceUrl = baseUrl + resourceFileName + queryParams;

      await writeFile(resourceFileName, svg);
      externalArtifacts["svg"] = [
        ...(externalArtifacts["svg"] ?? []),
        {
          type: "svg",
          URL: resourceUrl,
          label: visualModel.label,
        },
      ];

      const descriptor = {
        iri: null,
        url: resourceUrl,

        role: dsvMetadataWellKnown.role.guidance,
        formatMime: dsvMetadataWellKnown.formatMime.svg,
        conformsTo: [dsvMetadataWellKnown.conformsTo.svg],
        additionalRdfTypes: [],
      } satisfies ResourceDescriptor;
      allModelsHasResource.forEach((hasResource) => hasResource.push(descriptor));
    }
  }

  // Generate HTML document

  const additionalRdfTypes: string[] = [];
  if (hasVocabulary) {
    additionalRdfTypes.push(dsvMetadataWellKnown.additionalRdfTypes.VocabularySpecificationDocument);
  }
  if (hasApplicationProfile) {
    additionalRdfTypes.push(dsvMetadataWellKnown.additionalRdfTypes.ApplicationProfileSpecificationDocument);
  }

  const htmlDescriptor = {
    iri: baseIri,
    url: "THIS STRING WILL BE REPLACED LATER",

    role: dsvMetadataWellKnown.role.specification,
    formatMime: dsvMetadataWellKnown.formatMime.html,
    additionalRdfTypes,

    conformsTo: [],
  } satisfies ResourceDescriptor;

  // This html is a descriptor for all specifications
  allModelsHasResource.forEach((hasResource) => hasResource.push(htmlDescriptor));

  // Inject other artifacts
  if (APHasResource) {
    for (const artifact of context.artifacts) {
      const descriptor = artefactToDsv(artifact, `/${subdirectory}en/index.html`);
      if (descriptor) {
        APHasResource.push(descriptor);
      }
    }
  }

  /**
   * Because we generate documentation in multiple languages, we replace public
   * URLs with the current language in order to have correct links.
   */
  function createLangReplacer(artefacts: DataSpecificationArtefact[]) {
    const replacers: ((lang: string) => void)[] = [];

    for (const artefact of artefacts) {
      if (artefact.generator === "https://schemas.dataspecer.com/generator/template-artifact") {
        const originalUrl = artefact.publicUrl!;
        replacers.push((lang: string) => {
          artefact.publicUrl = originalUrl.replace("/en/", "/" + lang + "/");
        });
      }
    }

    return (lang: string) => {
      for (const replacer of replacers) {
        replacer(lang);
      }
    }
  }

  const langReplacer = createLangReplacer(context.v1Specification.artefacts);

  for (const lang of ["cs", "en"]) {
    // Generate the DSV Metadata serialization in JSON-LD string
    // Set correct URL for the documentation
    htmlDescriptor.url = baseUrl + lang + "/" + queryParams;
    const dsv = await DSVMetadataToJsonLdString(specifications, {
      rootHtmlDocumentIri: htmlDescriptor.iri,
      space: 2,
      useAbsoluteUrls: false, // !isPreviewMode,
    });

    langReplacer(lang);

    const documentation = context.output.writePath(`${subdirectory}${lang}/index.html`);
    await documentation.write(
      await generateHtmlDocumentation(
        { data: getModelBlobData(allModels, packageId), label: rootPackageEntity.label },
        modelDescriptions,
        { externalArtifacts, dsv, language: lang, prefixMap },
        context,
      ),
    );
    await documentation.close();
  }
}
