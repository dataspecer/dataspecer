import { LanguageString } from "@dataspecer/core/core/core-resource";
import { BaseModel } from "./base-model.ts";
import { BlobModel, WritableBlobModel } from "./blob-model.ts";
import { ModelRepository } from "./model-repository.ts";
import { PackageModel } from "./package-model.ts";

/**
 * Shared cache used by all cached model wrappers.
 */
interface SharedCache {
  modelById: Map<string, Promise<BaseModel | null>>;
  blobModel: Map<string, Promise<BlobModel>>;
  packageModel: Map<string, Promise<PackageModel>>;
  jsonBlob: Map<string, Promise<unknown>>;
  subResources: Map<string, Promise<BaseModel[]>>;
}

/**
 * Wrapper for BaseModel that caches asBlobModel() and asPackageModel() calls.
 */
class CachedBaseModel implements BaseModel {
  constructor(
    private readonly model: BaseModel,
    private readonly cache: SharedCache,
    private readonly cacheKeyFactory: (modelId: string, name?: string) => string
  ) {}

  get id(): string {
    return this.model.id;
  }

  get types(): string[] {
    return this.model.types;
  }

  getUserMetadata(): { label: LanguageString } {
    return this.model.getUserMetadata();
  }

  async asBlobModel(): Promise<BlobModel> {
    const modelId = this.model.id;
    if (!this.cache.blobModel.has(modelId)) {
      const promise = this.model.asBlobModel().then((blobModel) => {
        return new CachedBlobModel(blobModel, this.cache, this.cacheKeyFactory);
      });
      this.cache.blobModel.set(modelId, promise);
    }
    return this.cache.blobModel.get(modelId)!;
  }

  async asPackageModel(): Promise<PackageModel> {
    const modelId = this.model.id;
    if (!this.cache.packageModel.has(modelId)) {
      const promise = this.model.asPackageModel().then((packageModel) => {
        return new CachedPackageModel(packageModel, this.cache, this.cacheKeyFactory);
      });
      this.cache.packageModel.set(modelId, promise);
    }
    return this.cache.packageModel.get(modelId)!;
  }
}

/**
 * Wrapper for BlobModel that caches getJsonBlob() calls.
 */
class CachedBlobModel implements BlobModel {
  constructor(
    private readonly model: BlobModel,
    private readonly cache: SharedCache,
    private readonly cacheKeyFactory: (modelId: string, name?: string) => string
  ) {}

  get id(): string {
    return this.model.id;
  }

  get types(): string[] {
    return this.model.types;
  }

  getUserMetadata(): { label: LanguageString } {
    return this.model.getUserMetadata();
  }

  async getJsonBlob(name?: string): Promise<unknown> {
    const cacheKey = this.cacheKeyFactory(this.model.id, name);
    if (!this.cache.jsonBlob.has(cacheKey)) {
      const promise = this.model.getJsonBlob(name);
      this.cache.jsonBlob.set(cacheKey, promise);
    }
    return this.cache.jsonBlob.get(cacheKey)!;
  }

  async setJsonBlob(data: unknown, name?: string): Promise<void> {
    // Cast to WritableBlobModel if available, otherwise this will fail at runtime
    const writableModel = this.model as WritableBlobModel;
    await writableModel.setJsonBlob(data, name);

    // Invalidate the cache for this blob since it has been updated
    const cacheKey = this.cacheKeyFactory(this.model.id, name);
    this.cache.jsonBlob.delete(cacheKey);
  }
}

/**
 * Wrapper for PackageModel that caches getJsonBlob() and getSubResources() calls.
 */
class CachedPackageModel implements PackageModel {
  constructor(
    private readonly model: PackageModel,
    private readonly cache: SharedCache,
    private readonly cacheKeyFactory: (modelId: string, name?: string) => string
  ) {}

  get id(): string {
    return this.model.id;
  }

  get types(): string[] {
    return this.model.types;
  }

  getUserMetadata(): { label: LanguageString } {
    return this.model.getUserMetadata();
  }

  async getJsonBlob(name?: string): Promise<unknown> {
    const cacheKey = this.cacheKeyFactory(this.model.id, name);
    if (!this.cache.jsonBlob.has(cacheKey)) {
      const promise = this.model.getJsonBlob(name);
      this.cache.jsonBlob.set(cacheKey, promise);
    }
    return this.cache.jsonBlob.get(cacheKey)!;
  }

  async setJsonBlob(data: unknown, name?: string): Promise<void> {
    // Cast to WritableBlobModel if available, otherwise this will fail at runtime
    const writableModel = this.model as unknown as WritableBlobModel;
    await writableModel.setJsonBlob(data, name);

    // Invalidate the cache for this blob since it has been updated
    const cacheKey = this.cacheKeyFactory(this.model.id, name);
    this.cache.jsonBlob.delete(cacheKey);
  }

  async getSubResources(): Promise<BaseModel[]> {
    const modelId = this.model.id;
    if (!this.cache.subResources.has(modelId)) {
      const promise = this.model.getSubResources().then((models) => {
        return models.map((subModel) => new CachedBaseModel(subModel, this.cache, this.cacheKeyFactory));
      });
      this.cache.subResources.set(modelId, promise);
    }
    return this.cache.subResources.get(modelId)!;
  }
}

/**
 * A caching wrapper around ModelRepository that caches all async method results.
 * Models are cached by their ID, and conversions (asBlobModel, asPackageModel) are also cached.
 */
export class CachedModelRepository implements ModelRepository {
  private readonly repository: ModelRepository;
  private readonly cache: SharedCache;

  constructor(repository: ModelRepository) {
    this.repository = repository;
    this.cache = {
      modelById: new Map(),
      blobModel: new Map(),
      packageModel: new Map(),
      jsonBlob: new Map(),
      subResources: new Map(),
    };
  }

  async getModelById(modelId: string): Promise<BaseModel | null> {
    if (!this.cache.modelById.has(modelId)) {
      const promise = this.repository.getModelById(modelId).then((model) => {
        if (model) {
          return new CachedBaseModel(model, this.cache, this.getJsonBlobCacheKey.bind(this));
        }
        return null;
      });
      this.cache.modelById.set(modelId, promise);
    }
    return this.cache.modelById.get(modelId)!;
  }

  /**
   * Generates a cache key for getJsonBlob calls, combining model ID and optional name.
   */
  private getJsonBlobCacheKey(modelId: string, name?: string): string {
    return name ? `${modelId}:${name}` : modelId;
  }

  /**
   * Clears all cached data.
   */
  clearCache(): void {
    this.cache.modelById.clear();
    this.cache.blobModel.clear();
    this.cache.packageModel.clear();
    this.cache.jsonBlob.clear();
    this.cache.subResources.clear();
  }

  /**
   * Clears cached data for a specific model ID.
   */
  clearModelCache(modelId: string): void {
    this.cache.modelById.delete(modelId);
    this.cache.blobModel.delete(modelId);
    this.cache.packageModel.delete(modelId);
    this.cache.subResources.delete(modelId);

    // Clear all jsonBlob entries for this model
    for (const key of this.cache.jsonBlob.keys()) {
      if (key === modelId || key.startsWith(`${modelId}:`)) {
        this.cache.jsonBlob.delete(key);
      }
    }
  }
}
