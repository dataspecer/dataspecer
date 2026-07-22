import { LOCAL_PACKAGE, V1 } from "@dataspecer/core-v2/model/known-models";
import { LanguageString } from "@dataspecer/core-v2/semantic-model/concepts";
import { CoreResource } from "@dataspecer/core/core/core-resource";
import { DataPsmSchema } from "@dataspecer/core/data-psm/model/data-psm-schema";
import { PrismaClient, Resource as PrismaResource } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { LocalStoreModel } from "./local-store-model.ts";

/**
 * Base information every resource has or should have.
 */
export interface BaseResource {
  /**
   * Unique identifier of the resource.
   */
  iri: string;

  /**
   * All available types of the resource.
   * This means how the given resource can be interpreted.
   */
  types: string[];

  /**
   * User-friendly metadata that each resource may have.
   */
  userMetadata: {
    label?: LanguageString;
    description?: LanguageString;
    tags?: string[];
  };

  metadata: {
    modificationDate?: Date;
    creationDate?: Date;
  };

  dataStores: Record<string, string>;

  /**
   * Whether the resource has pending evolution updates recorded on an
   * evolution branch, awaiting review and merge. Only set by
   * {@link ModelRepository.getPackage}.
   */
  hasPendingEvolution?: boolean;
}

export interface Package extends BaseResource {
  /**
   * List of sub-resources that are contained in this package.
   * If the value is undefined, the package was not-yet loaded.
   */
  subResources?: BaseResource[];
}

/**
 * Manages the tree of resources and their data stores: the current-state
 * snapshots of models. The resource metadata live in the database managed by
 * Prisma, the store contents in the {@link LocalStoreModel}.
 */
export class ResourceModel {
  private readonly storeModel: LocalStoreModel;
  private readonly prismaClient: PrismaClient;

  constructor(storeModel: LocalStoreModel, prismaClient: PrismaClient) {
    this.storeModel = storeModel;
    this.prismaClient = prismaClient;
  }

  private async requireResource(iri: string): Promise<PrismaResource> {
    const resource = await this.prismaClient.resource.findUnique({ where: { iri } });
    if (resource === null) {
      throw new Error(`Resource "${iri}" not found.`);
    }
    return resource;
  }

  /**
   * Parses the mapping of store names to store ids of a resource.
   */
  private parseDataStores(resource: PrismaResource): Record<string, string> {
    return JSON.parse(resource.dataStoreId);
  }

  private async writeDataStores(resourceId: number, dataStores: Record<string, string>): Promise<void> {
    await this.prismaClient.resource.update({
      where: { id: resourceId },
      data: { dataStoreId: JSON.stringify(dataStores) },
    });
  }

  async getRootResources(): Promise<BaseResource[]> {
    const resources = await this.prismaClient.resource.findMany({ where: { parentResourceId: null } });
    return await Promise.all(resources.map((resource) => this.prismaResourceToResource(resource)));
  }

  /**
   * Returns a single resource or null if the resource does not exist.
   */
  async getResource(iri: string): Promise<BaseResource | null> {
    const prismaResource = await this.prismaClient.resource.findUnique({ where: { iri } });
    if (prismaResource === null) {
      return null;
    }
    return await this.prismaResourceToResource(prismaResource);
  }

  /**
   * Updates user metadata of the resource by merging in the given properties.
   */
  async updateResource(iri: string, userMetadata: object): Promise<void> {
    const resource = await this.requireResource(iri);
    const merged = {
      ...(JSON.parse(resource.userMetadata) as object),
      ...userMetadata,
    };
    await this.prismaClient.resource.update({
      where: { id: resource.id },
      data: { userMetadata: JSON.stringify(merged) },
    });
    await this.updateModificationTime(resource.id);
  }

  /**
   * Deletes the resource and if the resource is a package, all sub-resources.
   */
  async deleteResource(iri: string): Promise<void> {
    const deleteRecursively = async (resource: PrismaResource) => {
      const subResources = await this.prismaClient.resource.findMany({ where: { parentResourceId: resource.id } });
      for (const subResource of subResources) {
        await deleteRecursively(subResource);
      }

      await this.prismaClient.resource.delete({ where: { id: resource.id } });
      for (const storeId of Object.values(this.parseDataStores(resource))) {
        await this.storeModel.remove(storeId);
      }
    };

    const prismaResource = await this.requireResource(iri);
    await deleteRecursively(prismaResource);
    if (prismaResource.parentResourceId !== null) {
      await this.updateModificationTime(prismaResource.parentResourceId);
    }
  }

  private async prismaResourceToResource(prismaResource: PrismaResource): Promise<BaseResource> {
    const userMetadata = JSON.parse(prismaResource.userMetadata);
    const dataStores = this.parseDataStores(prismaResource);

    /**
     * @todo There is this a long-term problem that the title is stored inside the model and also in the user metadata.
     * This should be unified. For now, there is a workaround for PSM model that uses label from PSM.
     */
    try {
      if (prismaResource.representationType === V1.PSM && dataStores.model) {
        // We must be careful here as the model may not be loaded yet.
        const model = await this.getStoreJson(dataStores.model);
        if (model) {
          const schema = Object.values(model.resources as Record<string, CoreResource>).find(DataPsmSchema.is) as DataPsmSchema;
          if (schema) {
            userMetadata.label = schema.dataPsmHumanLabel;
            userMetadata.description = schema.dataPsmHumanDescription;
          }
        }
      }
    } catch (e) {
      console.error("Soft error when parsing PSM model to obtain user metadata.");
      console.error(e);
    }

    return {
      iri: prismaResource.iri,
      types: [prismaResource.representationType],
      userMetadata,
      metadata: {
        creationDate: prismaResource.createdAt,
        modificationDate: prismaResource.modifiedAt,
      },
      dataStores,
    };
  }

  /**
   * Returns the IRI of the project the resource belongs to, or null if the
   * resource does not exist. The project is the ancestor that is a direct
   * child of a root resource, or the resource itself if it is a root
   * resource or a direct child of one.
   */
  async getProjectIri(iri: string): Promise<string | null> {
    type ResourceRow = { iri: string; parentResourceId: number | null };
    let current: ResourceRow | null = await this.prismaClient.resource.findUnique({ select: { iri: true, parentResourceId: true }, where: { iri } });
    if (current === null) {
      return null;
    }

    while (current.parentResourceId !== null) {
      const parent: ResourceRow | null = await this.prismaClient.resource.findUnique({
        select: { iri: true, parentResourceId: true },
        where: { id: current.parentResourceId },
      });
      if (parent === null || parent.parentResourceId === null) {
        return current.iri;
      }
      current = parent;
    }

    return current.iri;
  }

  /**
   * Returns data about the package and its sub-resources. The sub-resources
   * are always loaded.
   */
  async getPackage(iri: string) {
    const prismaResource = await this.prismaClient.resource.findFirst({ where: { iri, representationType: LOCAL_PACKAGE } });
    if (prismaResource === null) {
      return null;
    }
    const subResources = await this.prismaClient.resource.findMany({ where: { parentResourceId: prismaResource.id } });

    return {
      ...(await this.prismaResourceToResource(prismaResource)),
      subResources: await Promise.all(subResources.map((resource) => this.prismaResourceToResource(resource))),
    };
  }

  /**
   * Creates resource of type LOCAL_PACKAGE.
   */
  createPackage(parentIri: string | null, iri: string, userMetadata: object): Promise<void> {
    return this.createResource(parentIri, iri, LOCAL_PACKAGE, userMetadata);
  }

  /**
   * Low level function to create a resource.
   * If parent IRI is null, the resource is created as root resource.
   */
  async createResource(parentIri: string | null, iri: string, type: string, userMetadata: object): Promise<void> {
    let parentResourceId: number | null = null;

    if (parentIri !== null) {
      const parentRow = await this.prismaClient.resource.findFirst({ select: { id: true }, where: { iri: parentIri, representationType: LOCAL_PACKAGE } });
      if (parentRow === null) {
        throw new Error("Cannot create resource because the parent package was not found or is not a package.");
      }

      parentResourceId = parentRow.id;
    }

    const existingResource = await this.prismaClient.resource.findUnique({ select: { id: true }, where: { iri } });
    if (existingResource !== null) {
      throw new Error("Cannot create resource because it already exists.");
    }

    await this.prismaClient.resource.create({
      data: {
        iri,
        parentResourceId,
        representationType: type,
        userMetadata: JSON.stringify(userMetadata),
      },
    });

    if (parentResourceId !== null) {
      await this.updateModificationTime(parentResourceId);
    }
  }

  /**
   * Returns the parsed JSON contents of the named store attached to the resource,
   * or null if the resource has no such store or the store has no content yet.
   */
  async getResourceStoreJson(iri: string, storeName: string = "model"): Promise<any | null> {
    const resource = await this.requireResource(iri);
    const storeId = this.parseDataStores(resource)[storeName];
    return storeId === undefined ? null : await this.getStoreJson(storeId);
  }

  /**
   * Overwrites the named store attached to the resource with the given JSON data,
   * creating the store first if it does not exist yet.
   */
  async setResourceStoreJson(iri: string, data: any, storeName: string = "model"): Promise<void> {
    const resource = await this.requireResource(iri);

    const dataStores = this.parseDataStores(resource);
    let storeId = dataStores[storeName];
    if (storeId === undefined) {
      storeId = uuidv4();
      dataStores[storeName] = storeId;
      await this.writeDataStores(resource.id, dataStores);
    }

    await this.storeModel.set(storeId, JSON.stringify(data));
    await this.updateModificationTime(resource.id);
  }

  /**
   * Returns the raw buffer contents of the named store attached to the resource,
   * or null if the resource has no such store.
   */
  async getResourceStoreBuffer(iri: string, storeName: string = "model"): Promise<Buffer | null> {
    const resource = await this.requireResource(iri);
    const storeId = this.parseDataStores(resource)[storeName];
    return storeId === undefined ? null : await this.storeModel.get(storeId);
  }

  /**
   * Deletes the named store attached to the resource, including its content.
   */
  async deleteResourceStore(iri: string, storeName: string = "model"): Promise<void> {
    const resource = await this.requireResource(iri);

    const dataStores = this.parseDataStores(resource);
    const storeId = dataStores[storeName];
    if (storeId === undefined) {
      throw new Error("Store not found.");
    }

    await this.storeModel.remove(storeId);
    delete dataStores[storeName];
    await this.writeDataStores(resource.id, dataStores);
    await this.updateModificationTime(resource.id);
  }

  private async getStoreJson(storeId: string): Promise<any | null> {
    const buffer = await this.storeModel.get(storeId);
    return buffer === null ? null : JSON.parse(buffer.toString());
  }

  /**
   * Updates modification time of the resource and all its parent packages.
   */
  private async updateModificationTime(id: number): Promise<void> {
    let currentId: number | null = id;
    while (currentId !== null) {
      const updated: { parentResourceId: number | null } = await this.prismaClient.resource.update({
        select: { parentResourceId: true },
        where: { id: currentId },
        data: { modifiedAt: new Date() },
      });
      currentId = updated.parentResourceId;
    }
  }
}
