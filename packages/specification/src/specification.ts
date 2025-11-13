import { LOCAL_PACKAGE, LOCAL_SEMANTIC_MODEL, LOCAL_VISUAL_MODEL, V1 } from "@dataspecer/core-v2/model/known-models";
import { SemanticModelEntity } from "@dataspecer/core-v2/semantic-model/concepts";
import { createSgovModel } from "@dataspecer/core-v2/semantic-model/simplified";
import { withAbsoluteIri } from "@dataspecer/core-v2/semantic-model/utils";
import { PimStoreWrapper } from "@dataspecer/core-v2/semantic-model/v1-adapters";
import { LanguageString, type CoreResource } from "@dataspecer/core/core/core-resource";
import { HttpFetch } from "@dataspecer/core/io/fetch/fetch-api";
import { StreamDictionary } from "@dataspecer/core/io/stream/stream-dictionary";
import { ModelRepository } from "./model-repository/index.ts";
import { ModelDescription, type StructureModelDescription } from "./model.ts";
import { generateDsvApplicationProfile, generateHtmlDocumentation, generateLightweightOwl, getIdToIriMapping, isModelProfile, isModelVocabulary } from "./utils.ts";
import { DataSpecificationArtefact } from "@dataspecer/core/data-specification/model/data-specification-artefact";
import { artefactToDsv } from "./v1/artefact-to-dsv.ts";
import { DSV_APPLICATION_PROFILE_TYPE, DSV_VOCABULARY_SPECIFICATION_DOCUMENT_TYPE, DSVMetadataToJsonLdString, dsvMetadataWellKnown, type ApplicationProfile, type ExternalSpecification, type ResourceDescriptor, type Specification, type VocabularySpecificationDocument } from "@dataspecer/data-specification-vocabulary/specification-description";
import { processStructureModelIrisBeforeExport, structureModelToRdf } from "@dataspecer/data-specification-vocabulary/structure-model";

const PIM_STORE_WRAPPER = "https://dataspecer.com/core/model-descriptor/pim-store-wrapper";
const SGOV = "https://dataspecer.com/core/model-descriptor/sgov";

interface StructureModel {
  resources: { [iri: string]: CoreResource };
}

/**
 * Additional context needed for generating the specification.
 * Basically this interface contains all functional dependencies.
 * @todo Consider how this is related to {@link GenerateSpecificationOptions}.
 */
export interface GenerateSpecificationContext {
  modelRepository: ModelRepository;
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
 *    modelRepository: new BackendModelRepository(resourceModel),
 *    output: streamDictionary,
 *    fetch: httpFetch,
 *  }, {
 *    queryParams,
 *  });
 */
export async function generateSpecification(packageId: string, context: GenerateSpecificationContext, options: GenerateSpecificationOptions = {}): Promise<void> {
  const subdirectory = options.subdirectory ?? "";
  const queryParams = options.queryParams ?? "";

  const model = (await context.modelRepository.getModelById(packageId))!;
  const resource = await model.asPackageModel();
  const subResources = await resource.getSubResources();

  let hasVocabulary = false;
  let hasApplicationProfile = false;

  //const pckg = await model.asPackageModel();
  //const baseUrl = (pckg.getUserMetadata() as any)?.documentBaseUrl ?? "";

  const prefixMap = {} as Record<string, string>;

  // Find all models recursively and store them with their metadata
  const models = [] as ModelDescription[];
  const primaryStructureModels = [] as StructureModelDescription[];
  async function fillModels(packageIri: string, isRoot: boolean = false) {
    const model = (await context.modelRepository.getModelById(packageIri))!;
    const pckg = await model.asPackageModel();
    if (!pckg) {
      throw new Error("Package does not exist.");
    }
    const subResources = await pckg.getSubResources();
    const semanticModels = subResources.filter((r) => r.types[0] === LOCAL_SEMANTIC_MODEL);
    for (const model of semanticModels) {
      const data = (await (await model.asBlobModel()).getJsonBlob()) as any;

      const modelName = model.getUserMetadata()?.label?.en ?? model.getUserMetadata()?.label?.cs;
      if (modelName && modelName.length > 0 && modelName.match(/^[a-z]+$/)) {
        prefixMap[data.baseIri] = modelName;
      }

      models.push({
        entities: Object.fromEntries(Object.entries(data.entities).map(([id, entity]) => [id, withAbsoluteIri(entity as SemanticModelEntity, data.baseIri)])),
        isPrimary: isRoot,
        documentationUrl: (pckg.getUserMetadata() as any)?.documentBaseUrl, //data.baseIri + "applicationProfileConceptualModel", //pckg.userMetadata?.documentBaseUrl,// ?? (isRoot ? "." : null),
        baseIri: data.baseIri,
        title: model.getUserMetadata()?.label,
      });
    }
    const sgovModels = subResources.filter((r) => r.types[0] === SGOV);
    for (const sgovModel of sgovModels) {
      const model = createSgovModel("https://slovník.gov.cz/sparql", context.fetch, sgovModel.id);
      const blobModel = await sgovModel.asBlobModel();
      const data = (await blobModel.getJsonBlob()) as any;
      await model.unserializeModel(data);
      models.push({
        entities: model.getEntities() as Record<string, SemanticModelEntity>,
        isPrimary: false,
        documentationUrl: null,
        baseIri: null,
        title: null,
      });
    }
    const pimModels = subResources.filter((r) => r.types[0] === PIM_STORE_WRAPPER);
    for (const model of pimModels) {
      const blobModel = await model.asBlobModel();
      const data = (await blobModel.getJsonBlob()) as any;
      const constructedModel = new PimStoreWrapper(data.pimStore, data.id, data.alias);
      constructedModel.fetchFromPimStore();
      const entities = constructedModel.getEntities() as Record<string, SemanticModelEntity>;
      models.push({
        entities,
        isPrimary: false,
        // @ts-ignore
        documentationUrl: model.userMetadata?.documentBaseUrl ?? null,
        baseIri: null,
        title: null,
      });
    }
    if (isRoot) {
      const structureModels = subResources.filter((r) => r.types[0] === V1.PSM);
      for (const model of structureModels) {
        const blobModel = await model.asBlobModel();
        const structureModel = (await blobModel.getJsonBlob()) as StructureModel;

        // We need to process resources to have IDs and IRIs..
        primaryStructureModels.push({
          id: model.id,
          entities: structureModel.resources,
        });
      }
    }
    const packages = subResources.filter((r) => r.types[0] === LOCAL_PACKAGE);
    for (const p of packages) {
      await fillModels(p.id);
    }
  }
  await fillModels(packageId, true);

  /**
   * Each model has formally its own IRI and a base IRI of its own entities.
   * Usually these two IRIs are the same. For example we may have a model with
   * IRI <http://w3id.org/dsv-dap#> and a resource with IRI
   * <http://w3id.org/dsv-dap#Resource>. Please not that the IRI of the model
   * ends with a #. In theory, we can have different IRIs for the model and its
   * entities.
   *
   * We then need URL for the physical distribution of the model. The URL may
   * not match the IRI of the model but is expected that you will be redirected
   * to the URL.
   *
   * We also need IRIs for helper concepts outside of the model. These concepts
   * describe the distribution of the model for example. For these concepts we
   * will use IRI of the package.
   */

  const userInputIri = models.find((m) => m.isPrimary)?.baseIri ?? "";

  /**
   * Base IRI for helper concepts that belongs to the package and not to the
   * model.
   *
   * Should be dereferenceable and point to some file that describes them.
   * Therefore should end with a hash.
   *
   * @todo So far user provide only base IRI for the model. We will use it as a base
   * IRI for metadata.
   */
  let metaDataBaseIri = userInputIri;
  // This could be considered as a hotfix to generate IRIs for metadata resources
  if (userInputIri.endsWith("#")) {
    const withoutHash = userInputIri.substring(0, userInputIri.length - 1);
    if (withoutHash.endsWith("/")) {
      metaDataBaseIri = withoutHash.substring(0, withoutHash.length - 1) + "#";
    } else {
      metaDataBaseIri = withoutHash + "/#";
    }
  }

  /**
   * Edge case, this is the IRI of the resource descriptor for HTML as it must not collide with package IRI.
   */
  const metaDataDocumentationIri = metaDataBaseIri.endsWith("#") ? metaDataBaseIri.substring(0, metaDataBaseIri.length - 1) : metaDataBaseIri;

  /**
   * Main URL for the physical distribution of the specification. It points to
   * the main page of the specification.
   */
  const mainUrl = "."; //metaDataDocumentationIri;

  /**
   * Base URL for the physical distribution of the specification. It ends with a
   * slash.
   */
  const baseUrl = mainUrl.endsWith("/") ? mainUrl : mainUrl + "/";

  // Get used vocabularies

  const usedVocabularies: ExternalSpecification[] = [];

  for (const model of subResources) {
    if (model.types[0] === PIM_STORE_WRAPPER) {
      const blobModel = await model.asBlobModel();
      const data = (await blobModel.getJsonBlob()) as {
        urls?: string[];
        alias?: string;
      };

      for (const url of data.urls ?? []) {
        usedVocabularies.push({
          url: url,
          title: data.alias ? { en: data.alias } : undefined,
        } satisfies ExternalSpecification);
      }
    }
    if (model.types[0] === LOCAL_PACKAGE) {
      // We need to obtain IRI of the application profile/vocabulary which is the base IRI of the semantic model.

      const importedPackage = await model.asPackageModel();
      const models = await importedPackage.getSubResources();
      const semanticModel = models.find((m) => m.types[0] === LOCAL_SEMANTIC_MODEL);
      if (semanticModel) {
        const semanticModelBlob = await semanticModel.asBlobModel();
        const data = (await semanticModelBlob.getJsonBlob()) as any;
        const baseIri = data.baseIri ?? "";
        usedVocabularies.push({
          iri: baseIri,
          url: (model.getUserMetadata() as any)["importedFromUrl"],
          title: {},
        });
      }
    }
  }

  // Primary semantic model
  const semanticModel = {};
  for (const model of models) {
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

  const langs = ["cs", "en"];
  const writeFile = async (path: string, data: string) => {
    for (const lang of langs) {
      const file = context.output.writePath(`${subdirectory}${lang}/${path}`);
      await file.write(data);
      await file.close();
    }
  };

  // Array of all models' resource descriptors' has resource
  const allModelsHasResource: ResourceDescriptor[][] = [];
  // HasResource for the application profile
  let APHasResource: ResourceDescriptor[] | null = null;

  // List of all specifications (according to DSV metadata definition) that this package contains
  const specifications: Specification[] = [];

  // Id to iri mapping
  let idToIriMapping: Record<string, string> = {};

  // For each model we need to decide whether it is a standalone vocabulary of application profile
  for (const model of models.filter((m) => m.isPrimary)) {
    // Resource ID of the Model
    const modelIri = model.baseIri ?? "";
    const fileName = isModelVocabulary(model.entities) ? "model.owl.ttl" : "dsv.ttl";
    // This is the physical location of the model
    const modelUrl = baseUrl + fileName + queryParams;

    // @ts-ignore
    let modelDescription = resource.getUserMetadata().description as LanguageString | undefined;
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

        title: resource.getUserMetadata().label ?? model.title ?? {},
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
        iri: metaDataBaseIri + "spec", // We use URL as IRI of the descriptor resource as it describes itself
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
        title: resource.getUserMetadata().label ?? model.title ?? {},
        description: modelDescription ?? {},
        //token: "xxx",
        isProfileOf: [...usedVocabularies],
        resources: hasResource,
      } satisfies ApplicationProfile;
      specifications.push(dsvEntry);

      // Serialize the model in DSV

      const dsv = await generateDsvApplicationProfile([model], models, modelIri);
      idToIriMapping = {
        ...idToIriMapping,
        ...(await getIdToIriMapping([model])),
      };
      await writeFile(fileName, dsv);
      externalArtifacts["dsv-profile"] = [{ type: fileName, URL: modelUrl }];

      // Create the descriptor of the DSV serialization

      const descriptor = {
        iri: metaDataBaseIri + "dsv",
        url: modelUrl,

        additionalRdfTypes: [],

        role: dsvMetadataWellKnown.role.constraints,
        conformsTo: [dsvMetadataWellKnown.conformsTo.profProfile, dsvMetadataWellKnown.conformsTo.dsvApplicationProfile],
        formatMime: dsvMetadataWellKnown.formatMime.turtle,
      } satisfies ResourceDescriptor;
      hasResource.push(descriptor);
    }
  }

  // Iterate over all structure models and
  //  - create DSV entries
  //  - create their serializations

  // First we need to process structure models to use proper IRIs
  if (false) { // Disable for now


  const processedStructureModels = processStructureModelIrisBeforeExport(
    primaryStructureModels.map(sm => Object.values(sm.entities as unknown as Record<string, CoreResource>)),
    idToIriMapping,
    "https://example.com/structure-models/"
  );

  for (const structureModel of processedStructureModels) {
    const fileName = structureModel.fileNamePart + ".ttl";
    const url = baseUrl + fileName + queryParams;
    const iri = structureModel.iri;

    const sm = await structureModelToRdf(structureModel.model, {});
    await writeFile(fileName, sm);

    const resourceDescriptor = {
      iri,
      url,

      role: dsvMetadataWellKnown.role.schema,
      formatMime: dsvMetadataWellKnown.formatMime.turtle,
      additionalRdfTypes: [],

      conformsTo: [
        dsvMetadataWellKnown.conformsTo.dsvStructure,
      ],
    } satisfies ResourceDescriptor;
    APHasResource?.push(resourceDescriptor);
  }

  }

  // Process all SVGs. Because we do not know which svg belongs to which model,
  // we assign all of them to all models.
  const visualModels = subResources.filter((r) => r.types[0] === LOCAL_VISUAL_MODEL);
  for (const visualModel of visualModels) {
    const model = await visualModel.asBlobModel();
    const svgModel = await model.getJsonBlob("svg");
    const svg = svgModel ? (svgModel as { svg: string }).svg : null;

    if (svg) {
      const resourceIri = metaDataBaseIri + visualModel.id; // We do not support custom IRIs right now
      const resourceFileName = visualModel.id + ".svg";
      const resourceUrl = baseUrl + resourceFileName + queryParams;

      await writeFile(resourceFileName, svg);
      externalArtifacts["svg"] = [
        ...(externalArtifacts["svg"] ?? []),
        {
          type: "svg",
          URL: "./" + resourceFileName + queryParams,
          label: visualModel.getUserMetadata()?.label,
        },
      ];

      const descriptor = {
        iri: resourceIri,
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
    iri: metaDataDocumentationIri,
    url: mainUrl + queryParams,

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

  // Generate the DSV Metadata serialization in JSON-LD string
  const dsv = await DSVMetadataToJsonLdString(specifications, {
    rootHtmlDocumentIri: htmlDescriptor.iri,
    space: 2,
  });

  for (const lang of langs) {
    const documentation = context.output.writePath(`${subdirectory}${lang}/index.html`);
    await documentation.write(await generateHtmlDocumentation(resource, models, { externalArtifacts, dsv, language: lang, prefixMap }, context));
    await documentation.close();
  }
}
