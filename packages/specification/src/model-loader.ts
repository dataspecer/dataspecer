/**
 * This is temporary implementation of so called "model loader" that is responsible for loading models from the repository.
 */

import { EntityModel } from "@dataspecer/core-v2";
import { LOCAL_SEMANTIC_MODEL, LOCAL_VISUAL_MODEL, V1 } from "@dataspecer/core-v2/model/known-models";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { createSgovModel, createVisualModel } from "@dataspecer/core-v2/semantic-model/simplified";
import { PimStoreWrapper } from "@dataspecer/core-v2/semantic-model/v1-adapters";
import { VisualModel } from "@dataspecer/visual-model";
import { HttpFetch } from "@dataspecer/core/io/fetch/fetch-api";
import { blobModelAsConnector, MemoryStoreFromBlob } from "./memory-store.ts";
import { BaseModel } from "./model-repository/base-model.ts";
import { WritableBlobModel } from "./model-repository/blob-model.ts";

/**
 * Loads given model as a semantic model or returns false if the model is not a semantic model.
 */
export async function loadAsSemanticModel(baseModel: BaseModel, httpFetch: HttpFetch): Promise<EntityModel | false> {
  const userMetadata = baseModel.getUserMetadata();
  const name = userMetadata.label?.en ?? userMetadata.label?.cs;

  // SGOV model
  if (baseModel.types.includes("https://dataspecer.com/core/model-descriptor/sgov")) {
    const model = createSgovModel("https://slovník.gov.cz/sparql", httpFetch, baseModel.id);
    const modelData = await (await baseModel.asBlobModel()).getJsonBlob() as any;
    modelData.modelAlias = name;
    await model.unserializeModel(modelData);
    return model;
  }

  // Semantic model
  if (baseModel.types.includes(LOCAL_SEMANTIC_MODEL)) {
    const modelData = await (await baseModel.asBlobModel()).getJsonBlob() as any;
    modelData.modelAlias = name;
    const model = new InMemorySemanticModel().deserializeModel(modelData);
    return model;
  }

  // Pim store wrapper
  if (baseModel.types.includes("https://dataspecer.com/core/model-descriptor/pim-store-wrapper")) {
    const modelData = await (await baseModel.asBlobModel()).getJsonBlob() as any;
    const model = new PimStoreWrapper(modelData.pimStore, modelData.id, name, modelData.urls);
    model.fetchFromPimStore();
    return model;
  }

  // Unknown model, this is not error, just not a semantic model
  return false;
}

export async function loadAsVisualModel(baseModel: BaseModel, httpFetch: HttpFetch): Promise<VisualModel | false> {
  const userMetadata = baseModel.getUserMetadata();
  const name = userMetadata.label?.en ?? userMetadata.label?.cs;

  if (baseModel.types.includes(LOCAL_VISUAL_MODEL)) {
    const modelData = await (await baseModel.asBlobModel()).getJsonBlob() as any;
    modelData.modelAlias = name;
    const model = createVisualModel(baseModel.id).deserializeModel(modelData);
    return model;
  }

  return false;
}

export async function loadAsStructureModel(baseModel: BaseModel): Promise<MemoryStoreFromBlob | false> {
  if (baseModel.types.includes(V1.PSM)) {
    const blobModel = await baseModel.asBlobModel();
    const store = MemoryStoreFromBlob.createFromConnector(blobModelAsConnector(blobModel as WritableBlobModel));
    await store.load();
    return store;
  }
  return false;
}
