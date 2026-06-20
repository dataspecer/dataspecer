import { LOCAL_PACKAGE, LOCAL_SEMANTIC_MODEL, LOCAL_VISUAL_MODEL, V1 } from "@dataspecer/core-v2/model/known-models";
import type { PackageService } from "@dataspecer/core-v2/project";
import type { HttpFetch } from "@dataspecer/core/io/fetch/fetch-api";
import type { ModelIdentifier } from "@dataspecer/core/model";
import { createAsyncQueryableModel } from "./async-queryable-model.ts";
import { DefaultFrontendModelStore, VISUAL_MODEL_SVG_BLOB_TYPE } from "./implementation.ts";
import { createPimModel } from "./pim-model.ts";
import { createProjectModel } from "./project-model.ts";
import { createSemanticModel } from "./semantic-model.ts";
import { createVisualModelInModelStore } from "./visual-model.ts";
import { createBlobModel } from "./blob-model.ts";
import { createStructureModel } from "./structure-model.ts";

/**
 * Configures and creates a remote model store that is intended to be used by CME.
 * It skips all unsupported models and only subscribes to those that CME needs.
 */
export function createCMEModelStore(params: {
  projectId: ModelIdentifier;
  packageService: PackageService;
  httpFetch: HttpFetch;
}): DefaultFrontendModelStore {
  return new DefaultFrontendModelStore({
    projectId: params.projectId,
    projectModelBuilder: createProjectModel,
    modelBuilders: {
      [LOCAL_SEMANTIC_MODEL]: createSemanticModel,
      [LOCAL_VISUAL_MODEL]: createVisualModelInModelStore,
      ["https://dataspecer.com/core/model-descriptor/sgov"]: createAsyncQueryableModel,
      ["https://dataspecer.com/core/model-descriptor/pim-store-wrapper"]: createPimModel,
    },
    packageService: params.packageService,
    httpFetch: params.httpFetch,
  });
}

/**
 * Configures and creates a remote model store intended to be used by the
 * manager. It only subscribes to the project model itself, plus the package
 * and artifact configuration blobs that the manager reads/writes directly -
 * it does not need any of the heavier semantic/structure/visual models.
 */
export function createManagerModelStore(params: {
  projectId: ModelIdentifier;
  packageService: PackageService;
  httpFetch: HttpFetch;
}): DefaultFrontendModelStore {
  return new DefaultFrontendModelStore({
    projectId: params.projectId,
    projectModelBuilder: createProjectModel,
    modelBuilders: {
      [LOCAL_PACKAGE]: createBlobModel,
      [V1.GENERATOR_CONFIGURATION]: createBlobModel,
    },
    packageService: params.packageService,
    httpFetch: params.httpFetch,
  });
}

export function createDSEModelStore(params: {
  projectId: ModelIdentifier;
  packageService: PackageService;
  httpFetch: HttpFetch;
}): DefaultFrontendModelStore {
  return new DefaultFrontendModelStore({
    projectId: params.projectId,
    projectModelBuilder: createProjectModel,
    modelBuilders: {
      [LOCAL_SEMANTIC_MODEL]: createSemanticModel,
      [LOCAL_VISUAL_MODEL]: createVisualModelInModelStore,
      [VISUAL_MODEL_SVG_BLOB_TYPE]: createBlobModel,
      [LOCAL_PACKAGE]: createBlobModel,
      ["https://dataspecer.com/core/model-descriptor/sgov"]: createAsyncQueryableModel,
      ["https://dataspecer.com/core/model-descriptor/pim-store-wrapper"]: createPimModel,
      [V1.PSM]: createStructureModel,
      [V1.GENERATOR_CONFIGURATION]: createBlobModel,
    },
    packageService: params.packageService,
    httpFetch: params.httpFetch,
  });
}
