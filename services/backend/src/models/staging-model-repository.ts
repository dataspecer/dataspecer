import { LOCAL_PACKAGE } from "@dataspecer/core-v2/model/known-models";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import { composeModelId, splitModelId } from "./model-id.ts";
import { type ModelRepository, type ModelRepositoryType } from "./model-repository.ts";
import { deserializeStoredModel } from "./model-types.ts";
import type { BaseResource, Package } from "./resource-model.ts";

/**
 * An in-memory overlay over {@link ModelRepository}: reads fall through to the
 * underlying repository, writes are only staged in memory and never reach the
 * storage. The reload flow imports into it to compute the state a package
 * would have after the reload, so the change can be recorded on the evolution
 * branch without modifying the stored package.
 *
 * Deleting a package only hides the package itself; its sub-resources remain
 * visible to direct getResource calls. That is enough for the reload flow,
 * which enumerates models by walking the sub-resource listings.
 */
export class StagingModelRepository implements ModelRepositoryType {
  private readonly base: ModelRepository;

  /** Current overlay state of resources created or modified here, by iri. */
  private readonly stagedResources = new Map<string, BaseResource>();
  /** Resources created here - they must not be read from the underlying repository. */
  private readonly createdIris = new Set<string>();
  /** Iris of resources created here, grouped by the iri of their parent package. */
  private readonly createdChildren = new Map<string, string[]>();
  private readonly deletedIris = new Set<string>();
  /** Staged store contents, keyed by the model id of the store. */
  private readonly stagedStores = new Map<string, unknown>();

  constructor(base: ModelRepository) {
    this.base = base;
  }

  async getResource(iri: string): Promise<BaseResource | null> {
    if (this.deletedIris.has(iri)) {
      return null;
    }
    return this.stagedResources.get(iri) ?? (await this.base.getResource(iri));
  }

  async getPackage(iri: string): Promise<Package | null> {
    if (this.deletedIris.has(iri)) {
      return null;
    }
    const staged = this.stagedResources.get(iri);
    if (staged && staged.types[0] !== LOCAL_PACKAGE) {
      return null;
    }
    const basePackage = this.createdIris.has(iri) ? null : await this.base.getPackage(iri);
    if (!staged && !basePackage) {
      return null;
    }

    const subResources: BaseResource[] = [];
    for (const child of basePackage?.subResources ?? []) {
      if (this.deletedIris.has(child.iri)) {
        continue;
      }
      subResources.push(this.stagedResources.get(child.iri) ?? child);
    }
    for (const childIri of this.createdChildren.get(iri) ?? []) {
      subResources.push(this.stagedResources.get(childIri)!);
    }

    return { ...(staged ?? basePackage!), subResources };
  }

  async createResource(parentIri: string | null, iri: string, type: string, userMetadata: object): Promise<void> {
    this.deletedIris.delete(iri);
    this.createdIris.add(iri);
    this.stagedResources.set(iri, {
      iri,
      types: [type],
      userMetadata: userMetadata as BaseResource["userMetadata"],
      metadata: {},
      dataStores: {},
    });
    if (parentIri !== null) {
      const children = this.createdChildren.get(parentIri) ?? [];
      children.push(iri);
      this.createdChildren.set(parentIri, children);
    }
  }

  createPackage(parentIri: string | null, iri: string, userMetadata: object): Promise<void> {
    return this.createResource(parentIri, iri, LOCAL_PACKAGE, userMetadata);
  }

  async updateResource(iri: string, userMetadata: object): Promise<void> {
    const resource = await this.getResource(iri);
    if (resource === null) {
      throw new Error("Resource not found.");
    }
    this.stagedResources.set(iri, { ...resource, userMetadata: { ...resource.userMetadata, ...userMetadata } });
  }

  async deleteResource(iri: string): Promise<void> {
    this.deletedIris.add(iri);
    this.stagedResources.delete(iri);
    this.createdIris.delete(iri);
    for (const children of this.createdChildren.values()) {
      const index = children.indexOf(iri);
      if (index !== -1) {
        children.splice(index, 1);
      }
    }
  }

  async setResourceStoreJson(iri: string, data: unknown, storeName: string = "model"): Promise<void> {
    this.stagedStores.set(composeModelId(iri, storeName), data);
  }

  /**
   * The staging overlay never has its own operation history - the reload flow
   * derives the whole reload's operations by diffing the base repository's
   * state against this overlay's once staging is complete (see
   * getModelsForPackage/diffModelStates in reloadResource) - so this is
   * equivalent to {@link setResourceStoreJson} here.
   */
  setModelJson(iri: string, data: unknown, storeName: string = "model"): Promise<void> {
    return this.setResourceStoreJson(iri, data, storeName);
  }

  async getModelEntities(modelId: string): Promise<EntityRecord | null> {
    const { iri, storeName } = splitModelId(modelId);

    const resource = await this.getResource(iri);
    if (resource === null) {
      return null;
    }

    const storeKey = composeModelId(iri, storeName);
    const data = this.stagedStores.has(storeKey) ? this.stagedStores.get(storeKey) : this.createdIris.has(iri) ? null : await this.base.getResourceStoreJson(iri, storeName);

    return deserializeStoredModel(modelId, resource.types[0] ?? "", data);
  }
}
