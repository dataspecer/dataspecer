import { LOCAL_PACKAGE, RDFS_MODEL, V1 } from "@dataspecer/core-v2/model/known-models";
import { LanguageString } from "@dataspecer/core-v2/semantic-model/concepts";
import { CoreResource } from "@dataspecer/core/core/core-resource";
import { DataPsmSchema } from "@dataspecer/core/data-psm/model/data-psm-schema";
import { parseDatabaseTimestamp, type Database, type ResourceRow } from "../database/schema.ts";
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
 * snapshots of models. Resource metadata live in SQLite and store contents
 * in the {@link LocalStoreModel}.
 */
export class ResourceModel {
  private readonly storeModel: LocalStoreModel;
  private readonly database: Database;

  constructor(storeModel: LocalStoreModel, database: Database) {
    this.storeModel = storeModel;
    this.database = database;
  }

  private async requireResource(iri: string): Promise<ResourceRow> {
    const resource = await this.database.selectFrom("Resource").selectAll().where("iri", "=", iri).executeTakeFirst();
    if (resource === undefined) {
      throw new Error(`Resource "${iri}" not found.`);
    }
    return resource;
  }

  /**
   * Parses the mapping of store names to store ids of a resource.
   */
  private parseDataStores(resource: ResourceRow): Record<string, string> {
    return JSON.parse(resource.dataStoreId);
  }

  private async writeDataStores(resourceId: number, dataStores: Record<string, string>): Promise<void> {
    const now = Date.now();
    await this.database.updateTable("Resource")
      .set({ dataStoreId: JSON.stringify(dataStores), modifiedAt: now, subtreeModifiedAt: now })
      .where("id", "=", resourceId).returning("id").executeTakeFirstOrThrow();
  }

  async getRootResources(): Promise<BaseResource[]> {
    const resources = await this.database.selectFrom("Resource").selectAll().where("parentResourceId", "is", null).execute();
    return await Promise.all(resources.map((resource) => this.rowToResource(resource)));
  }

  /**
   * Returns a single resource or null if the resource does not exist.
   */
  async getResource(iri: string): Promise<BaseResource | null> {
    const row = await this.database.selectFrom("Resource").selectAll().where("iri", "=", iri).executeTakeFirst();
    if (row === undefined) {
      return null;
    }
    return await this.rowToResource(row);
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
    const now = Date.now();
    await this.database.updateTable("Resource")
      .set({ userMetadata: JSON.stringify(merged), modifiedAt: now, subtreeModifiedAt: now })
      .where("id", "=", resource.id).returning("id").executeTakeFirstOrThrow();
    await this.updateModificationTime(resource.id);
  }

  /**
   * Deletes the resource and if the resource is a package, all sub-resources.
   */
  async deleteResource(iri: string): Promise<void> {
    const deleteRecursively = async (resource: ResourceRow) => {
      const subResources = await this.database.selectFrom("Resource").selectAll().where("parentResourceId", "=", resource.id).execute();
      for (const subResource of subResources) {
        await deleteRecursively(subResource);
      }

      await this.database.deleteFrom("Resource").where("id", "=", resource.id).returning("id").executeTakeFirstOrThrow();
      for (const storeId of Object.values(this.parseDataStores(resource))) {
        await this.storeModel.remove(storeId);
      }
    };

    const row = await this.requireResource(iri);
    await deleteRecursively(row);
    if (row.parentResourceId !== null) {
      await this.updateModificationTime(row.parentResourceId);
    }
  }

  private async rowToResource(row: ResourceRow): Promise<BaseResource> {
    const userMetadata = JSON.parse(row.userMetadata);
    const dataStores = this.parseDataStores(row);

    /**
     * @todo There is this a long-term problem that the title is stored inside the model and also in the user metadata.
     * This should be unified. For now, there is a workaround for PSM model that uses label from PSM, and RDFS
     * models that use the label from their main entity (see {@link ModelRepository.updateResource}).
     */
    try {
      if (row.representationType === V1.PSM && dataStores.model) {
        // We must be careful here as the model may not be loaded yet.
        const model = await this.getStoreJson(dataStores.model);
        if (model) {
          const schema = Object.values(model.resources as Record<string, CoreResource>).find(DataPsmSchema.is) as DataPsmSchema;
          if (schema) {
            userMetadata.label = schema.dataPsmHumanLabel;
            userMetadata.description = schema.dataPsmHumanDescription;
          }
        }
      } else if (row.representationType === RDFS_MODEL && dataStores.model) {
        // We must be careful here as the model may not be loaded yet.
        const model = await this.getStoreJson(dataStores.model);
        if (model?.label) {
          userMetadata.label = model.label as LanguageString;
        }
      }
    } catch (e) {
      console.error("Soft error when parsing model to obtain user metadata.");
      console.error(e);
    }

    return {
      iri: row.iri,
      types: [row.representationType],
      userMetadata,
      metadata: {
        creationDate: parseDatabaseTimestamp(row.createdAt),
        modificationDate: parseDatabaseTimestamp(row.modifiedAt),
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
    let current = await this.database.selectFrom("Resource").select(["iri", "parentResourceId"]).where("iri", "=", iri).executeTakeFirst();
    if (current === undefined) {
      return null;
    }

    while (current.parentResourceId !== null) {
      const parent: Pick<ResourceRow, "iri" | "parentResourceId"> | undefined = await this.database
        .selectFrom("Resource").select(["iri", "parentResourceId"])
        .where("id", "=", current.parentResourceId).executeTakeFirst();
      if (parent === undefined || parent.parentResourceId === null) {
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
    const row = await this.database.selectFrom("Resource").selectAll()
      .where("iri", "=", iri).where("representationType", "=", LOCAL_PACKAGE).executeTakeFirst();
    if (row === undefined) {
      return null;
    }
    const subResources = await this.database.selectFrom("Resource").selectAll().where("parentResourceId", "=", row.id).execute();

    return {
      ...(await this.rowToResource(row)),
      subResources: await Promise.all(subResources.map((resource) => this.rowToResource(resource))),
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
      const parentRow = await this.database.selectFrom("Resource").select("id")
        .where("iri", "=", parentIri).where("representationType", "=", LOCAL_PACKAGE).executeTakeFirst();
      if (parentRow === undefined) {
        throw new Error("Cannot create resource because the parent package was not found or is not a package.");
      }

      parentResourceId = parentRow.id;
    }

    const existingResource = await this.database.selectFrom("Resource").select("id").where("iri", "=", iri).executeTakeFirst();
    if (existingResource !== undefined) {
      throw new Error("Cannot create resource because it already exists.");
    }

    const now = Date.now();
    await this.database.insertInto("Resource").values({
      iri,
      parentResourceId,
      representationType: type,
      userMetadata: JSON.stringify(userMetadata),
      createdAt: now,
      modifiedAt: now,
      subtreeModifiedAt: now,
    }).execute();

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
      const now = Date.now();
      const updated: { parentResourceId: number | null } = await this.database.updateTable("Resource")
        .set({ modifiedAt: now, subtreeModifiedAt: now })
        .where("id", "=", currentId).returning("parentResourceId").executeTakeFirstOrThrow();
      currentId = updated.parentResourceId;
    }
  }
}
