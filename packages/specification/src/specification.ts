import { LOCAL_PACKAGE, LOCAL_SEMANTIC_MODEL, LOCAL_VISUAL_MODEL } from "@dataspecer/core-v2/model/known-models";
import { SemanticModelEntity } from "@dataspecer/core-v2/semantic-model/concepts";
import { createSgovModel } from "@dataspecer/core-v2/semantic-model/simplified";
import { withAbsoluteIri } from "@dataspecer/core-v2/semantic-model/utils";
import { PimStoreWrapper } from "@dataspecer/core-v2/semantic-model/v1-adapters";
import { LanguageString } from "@dataspecer/core/core/core-resource";
import { HttpFetch } from "@dataspecer/core/io/fetch/fetch-api";
import { StreamDictionary } from "@dataspecer/core/io/stream/stream-dictionary";
import { dsvModelToJsonLdSerialization } from "./dsv/adapter.ts";
import { resourceDescriptor, semanticDataSpecification } from "./dsv/model.ts";
import { isModelProfile, isModelVocabulary } from "./dsv/utils.ts";
import { DSV, DSV_CONFORMS_TO, DSV_KNOWN_FORMATS, OWL, OWL_BASE, PROF, RDFS_BASE } from "./dsv/well-known.ts";
import { ModelRepository } from "./model-repository/index.ts";
import { ModelDescription } from "./model.ts";
import { generateDsv, generateHtmlDocumentation, generateLightweightOwl } from "./utils.ts";
import { DataSpecificationArtefact } from "@dataspecer/core/data-specification/model/data-specification-artefact";
import { artefactToDsv } from "./v1/artefact-to-dsv.ts";

const PIM_STORE_WRAPPER = "https://dataspecer.com/core/model-descriptor/pim-store-wrapper";
const SGOV = "https://dataspecer.com/core/model-descriptor/sgov";

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

  const usedVocabularies: {
    iri: null | string;
    urls: string[];
    title: LanguageString;
  }[] = [];

  for (const model of subResources) {
    if (model.types[0] === PIM_STORE_WRAPPER) {
      const blobModel = await model.asBlobModel();
      const data = (await blobModel.getJsonBlob()) as any;
      usedVocabularies.push({
        iri: null,
        urls: data.urls ?? [],
        title: { en: data.alias },
      });
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
          urls: [(model.getUserMetadata() as any)["importedFromUrl"]], // todo
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
  const allModelsHasResource: object[][] = [];
  // HasResource for the application profile
  let APHasResource: object[] | null = null;
  const allModelsDsvEntries: object[] = [];
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

      const hasResource: object[] = [];
      allModelsHasResource.push(hasResource);

      // This describes the model as a resource, not the descriptor of the serialization
      const dsvEntry = semanticDataSpecification({
        id: modelIri,
        types: [OWL.Ontology],
        title: resource.getUserMetadata().label ?? model.title ?? {},
        description: modelDescription,
        //token: "xxx",
        profileOf: [...usedVocabularies],
        hasResource,
      });
      allModelsDsvEntries.push(dsvEntry);

      // Serialize the model in OWL

      const owl = await generateLightweightOwl(model.entities, model.baseIri ?? "", modelIri);
      await writeFile(fileName, owl);
      // Add entry for the documentation
      externalArtifacts["owl-vocabulary"] = [{ type: fileName, URL: modelUrl }];

      // Create the descriptor of the OWL serialization

      const descriptor = resourceDescriptor({
        id: metaDataBaseIri + "spec", // We use URL as IRI of the descriptor resource as it describes itself
        artifactFullUrl: modelUrl,
        roles: PROF.ROLE.Vocabulary,
        conformsTo: [RDFS_BASE, OWL_BASE],
        format: DSV_KNOWN_FORMATS.rdf,
      });
      hasResource.push(descriptor);
    }

    // Process application profile model as a standalone application profile - we do not need to see additional vocabularies for it.
    if (isModelProfile(model.entities)) {
      hasApplicationProfile = true;

      const hasResource: object[] = [];
      allModelsHasResource.push(hasResource);
      APHasResource = hasResource;

      // This describes the model as a resource, not the descriptor of the serialization
      const dsvEntry = semanticDataSpecification({
        id: modelIri,
        types: [DSV.ApplicationProfile],
        title: resource.getUserMetadata().label ?? model.title ?? {},
        description: modelDescription,
        //token: "xxx",
        profileOf: [...usedVocabularies],
        hasResource,
      });
      allModelsDsvEntries.push(dsvEntry);

      // Serialize the model in DSV

      const dsv = await generateDsv([model], models, modelIri);
      await writeFile(fileName, dsv);
      externalArtifacts["dsv-profile"] = [{ type: fileName, URL: modelUrl }];

      // Create the descriptor of the DSV serialization

      const descriptor = resourceDescriptor({
        id: metaDataBaseIri + "dsv",
        artifactFullUrl: modelUrl,
        roles: PROF.ROLE.Specification,
        conformsTo: [DSV.ApplicationProfileSpecificationDocument, PROF.Profile],
        format: DSV_KNOWN_FORMATS.rdf,
      });
      hasResource.push(descriptor);
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

      const descriptor = resourceDescriptor({
        id: resourceIri,
        artifactFullUrl: resourceUrl,
        roles: PROF.ROLE.Guidance,
        format: DSV_KNOWN_FORMATS.svg,
        conformsTo: DSV_CONFORMS_TO.svg,
      });
      allModelsHasResource.forEach((hasResource) => hasResource.push(descriptor));
    }
  }

  // Generate HTML

  const types: string[] = [];
  if (hasVocabulary) {
    types.push(DSV.VocabularySpecificationDocument);
  }
  if (hasApplicationProfile) {
    types.push(DSV.ApplicationProfileSpecificationDocument);
  }
  const htmlDescriptor = resourceDescriptor({
    id: metaDataDocumentationIri,
    artifactFullUrl: mainUrl + queryParams,
    roles: PROF.ROLE.Guidance,
    format: DSV_KNOWN_FORMATS.html,
    types,
  });
  allModelsHasResource.forEach((hasResource) => hasResource.push(structuredClone(htmlDescriptor)));
  const dsvJsonRoot = { ...htmlDescriptor };
  // @reverse http://www.w3.org/ns/dx/prof/hasResource
  dsvJsonRoot["inSpecificationOf"] = allModelsDsvEntries;

  // Inject other artifacts
  if (APHasResource) {
    for (const artifact of context.artifacts) {
      const descriptor = artefactToDsv(artifact, `/${subdirectory}en/index.html`);
      if (descriptor) {
        APHasResource.push(descriptor);
      }
    }
  }

  // Generate the DSV serialization in JSON
  const dsv = dsvModelToJsonLdSerialization(dsvJsonRoot);

  for (const lang of langs) {
    const documentation = context.output.writePath(`${subdirectory}${lang}/index.html`);
    await documentation.write(await generateHtmlDocumentation(resource, models, { externalArtifacts, dsv, language: lang, prefixMap }, context));
    await documentation.close();
  }
}
