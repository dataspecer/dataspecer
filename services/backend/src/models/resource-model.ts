import { LOCAL_PACKAGE, V1 } from "@dataspecer/core-v2/model/known-models";
import { LanguageString } from "@dataspecer/core-v2/semantic-model/concepts";
import { PrismaClient, Resource as PrismaResource } from "@prisma/client";
import { LocalStoreModel } from "./local-store-model.ts";
import { DataPsmSchema } from "@dataspecer/core/data-psm/model/data-psm-schema";
import { CoreResource } from "@dataspecer/core/core/core-resource";
import { v4 as uuidv4 } from "uuid";

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
}

export interface Package extends BaseResource {
    /**
     * List of sub-resources that are contained in this package.
     * If the value is undefined, the package was not-yet loaded.
     */
    subResources?: BaseResource[];
}

/**
 * Resource model manages resource in local database that is managed by Prisma.
 */
export class ResourceModel {
    private readonly storeModel: LocalStoreModel;
    private readonly prismaClient: PrismaClient;

    constructor(storeModel: LocalStoreModel, prismaClient: PrismaClient) {
        this.storeModel = storeModel;
        this.prismaClient = prismaClient;
    }

    async getRootResources(): Promise<BaseResource[]> {
        const resources = await this.prismaClient.resource.findMany({where: {parentResourceId: null}});
        const result = resources.map(resource => this.prismaResourceToResource(resource));
        return await Promise.all(result);
    }

    /**
     * Returns a single resource or null if the resource does not exist.
     */
    async getResource(iri: string): Promise<BaseResource | null> {
        const prismaResource = await this.prismaClient.resource.findFirst({where: {iri}});
        if (prismaResource === null) {
            return null;
        }
        return await this.prismaResourceToResource(prismaResource);
    }

    /**
     * Updates user metadata of the resource.
     */
    async updateResource(iri: string, userMetadata: {}) {
        const resource = await this.prismaClient.resource.findFirst({where: {iri}});
        let metadata = resource?.userMetadata ? JSON.parse(resource?.userMetadata!) as object : {};
        metadata = {
            ...metadata,
            ...userMetadata
        }
        await this.prismaClient.resource.update({
            where: {iri},
            data: {
                userMetadata: JSON.stringify(metadata),
            }
        });
        await this.updateModificationTime(iri);
    }

    /**
     * Deletes the resource and if the resource is a package, all sub-resources.
     */
    async deleteResource(iri: string) {
        const recursivelyDeleteResourceByPrismaResource = async (resource: PrismaResource) => {
            if (resource.representationType === LOCAL_PACKAGE) {
                const subResources = await this.prismaClient.resource.findMany({where: {parentResourceId: resource.id}});
                for (const subResource of subResources) {
                    await recursivelyDeleteResourceByPrismaResource(subResource);
                }
            }
            await this.deleteSingleResource(resource.iri);
        }

        const prismaResource = await this.prismaClient.resource.findFirst({where: {iri: iri}});
        if (prismaResource === null) {
           throw new Error("Resource not found.");
        }

        await recursivelyDeleteResourceByPrismaResource(prismaResource);
        if (prismaResource.parentResourceId !== null) {
            await this.updateModificationTimeById(prismaResource.parentResourceId);
        }
    }

    /**
     * Removes a single resource in database and all stores attached to it.
     * If the resource is a package, all sub-resources must be deleted manuyally first.
     */
    private async deleteSingleResource(iri: string) {
        const prismaResource = await this.prismaClient.resource.findFirst({where: {iri: iri}});
        if (prismaResource === null) {
            throw new Error("Resource not found.");
        }

        await this.prismaClient.resource.delete({where: {id: prismaResource.id}});

        for (const storeId of Object.values(JSON.parse(prismaResource.dataStoreId))) {
            await this.storeModel.remove(storeId as string);
        }
    }

    private async prismaResourceToResource(prismaResource: PrismaResource): Promise<BaseResource> {
        const userMetadata = JSON.parse(prismaResource.userMetadata);
        const dataStores = JSON.parse(prismaResource.dataStoreId);

        /**
         * @todo There is this a long-term problem that the title is stored inside the model and also in the user metadata.
         * This should be unified. For now, there is a workaround for PSM model that uses label from PSM.
         */
        try {
            if (prismaResource.representationType === V1.PSM) {
                // We must be careful here as the model may not be loaded yet.
                if (dataStores.model) {
                    const model = await this.getJsonByStoreId(dataStores.model);

                    const schema = Object.values(model.resources as Record<string, CoreResource>).find(DataPsmSchema.is) as DataPsmSchema;
                    if (schema) {
                        userMetadata.label = schema.dataPsmHumanLabel;
                        userMetadata.description = schema.dataPsmHumanDescription;
                    }
                }
            }
        } catch(e) {
            console.error("Soft error when parsing PSM model to obtain user metadata.");
            console.error(e);
        };

        return {
            iri: prismaResource.iri,
            types: [prismaResource.representationType],
            userMetadata,
            metadata: {
                creationDate: prismaResource.createdAt,
                modificationDate: prismaResource.modifiedAt
            },
            dataStores,
        }
    }

    /**
     * Returns data about the package and its sub-resources.
     */
    async getPackage(iri: string) {
        const prismaResource = await this.prismaClient.resource.findFirst({where: {iri: iri, representationType: LOCAL_PACKAGE}});
        if (prismaResource === null) {
            return null;
        }
        const packageResources = await this.prismaClient.resource.findMany({where: {parentResourceId: prismaResource!.id}});

        return {
            ...await this.prismaResourceToResource(prismaResource!),
            subResources: await Promise.all(packageResources.map(resource => this.prismaResourceToResource(resource))),
        }
    }

    /**
     * Creates resource of type LOCAL_PACKAGE.
     */
    createPackage(parentIri: string | null, iri: string, userMetadata: {}) {
        return this.createResource(parentIri, iri, LOCAL_PACKAGE, userMetadata);
    }

    /**
     * Low level function to create a resource.
     * If parent IRI is null, the resource is created as root resource.
     */
    async createResource(parentIri: string | null, iri: string, type: string, userMetadata: {}) {
        let parentResourceId: number | null = null;

        if (parentIri !== null) {
            const parentRow = await this.prismaClient.resource.findFirst({select: {id: true}, where: {iri: parentIri, representationType: LOCAL_PACKAGE}});
            if (parentRow === null) {
                throw new Error("Cannot create resource because the parent package not found or is not a package.");
            }

            parentResourceId = parentRow.id;
        }

        // Test if the resource already exists
        const existingResource = await this.prismaClient.resource.findFirst({where: {iri: iri}});
        if (existingResource !== null) {
            throw new Error("Cannot create resource because it already exists.");
        }

        await this.prismaClient.resource.create({
            data: {
                iri: iri,
                parentResourceId: parentResourceId,
                representationType: type,
                userMetadata: JSON.stringify(userMetadata)
            }
        });

        if (parentResourceId !== null) {
            await this.updateModificationTimeById(parentResourceId);
        }
    }

    /**
     * Returns the parsed JSON contents of the named store attached to the resource,
     * or null if the resource has no such store.
     *
     * @todo return null or {} for non-existing stores?
     */
    async getResourceStoreJson(iri: string, storeName: string = "model"): Promise<any | null> {
        const storeId = await this.getStoreId(iri, storeName);
        return storeId === null ? null : await this.getJsonByStoreId(storeId);
    }

    /**
     * Overwrites the named store attached to the resource with the given JSON data,
     * creating the store first if it does not exist yet.
     */
    async setResourceStoreJson(iri: string, data: any, storeName: string = "model"): Promise<void> {
        const storeId = await this.getOrCreateStoreId(iri, storeName);
        await this.storeModel.set(storeId, JSON.stringify(data));
        await this.updateModificationTime(iri);
    }

    /**
     * Returns the raw buffer contents of the named store attached to the resource,
     * or null if the resource has no such store.
     */
    async getResourceStoreBuffer(iri: string, storeName: string = "model"): Promise<Buffer | null> {
        const storeId = await this.getStoreId(iri, storeName);
        return storeId === null ? null : await this.storeModel.get(storeId);
    }

    private async getStoreId(iri: string, storeName: string): Promise<string | null> {
        const prismaResource = await this.prismaClient.resource.findFirst({where: {iri: iri}});
        if (prismaResource === null) {
            throw new Error("Resource not found.");
        }

        const dataStoreId = JSON.parse(prismaResource.dataStoreId);
        return dataStoreId[storeName] ?? null;
    }

    private async getJsonByStoreId(storeId: string): Promise<any> {
        const buffer = await this.storeModel.get(storeId);
        return JSON.parse(buffer?.toString() as string);
    }

    private async getOrCreateStoreId(iri: string, storeName: string): Promise<string> {
        const prismaResource = await this.prismaClient.resource.findFirst({where: {iri: iri}});
        if (prismaResource === null) {
            throw new Error("Resource not found.");
        }

        const dataStoreId = JSON.parse(prismaResource.dataStoreId);

        if (dataStoreId[storeName]) {
            return dataStoreId[storeName];
        } else {
            const storeId = uuidv4();
            dataStoreId[storeName] = storeId;
            await this.prismaClient.resource.update({
                where: {id: prismaResource.id},
                data: {
                    dataStoreId: JSON.stringify(dataStoreId)
                }
            });
            return storeId;
        }
    }

    async deleteResourceStore(iri: string, storeName: string = "model") {
        const prismaResource = await this.prismaClient.resource.findFirst({where: {iri: iri}});
        if (prismaResource === null) {
            throw new Error("Resource not found.");
        }

        const dataStoreId = JSON.parse(prismaResource.dataStoreId);

        if (!dataStoreId[storeName]) {
            throw new Error("Store not found.");
        }

        await this.storeModel.remove(dataStoreId[storeName]);

        delete dataStoreId[storeName];

        await this.prismaClient.resource.update({
            where: {id: prismaResource.id},
            data: {
                dataStoreId: JSON.stringify(dataStoreId)
            }
        });

        await this.updateModificationTime(iri);
    }

    /**
     * @internal for importing resources
     */
    async assignExistingStoreToResource(iri: string, storeId: string, storeName: string = "model") {
        const prismaResource = await this.prismaClient.resource.findFirst({where: {iri: iri}});
        if (prismaResource === null) {
            throw new Error("Resource not found.");
        }

        const dataStoreId = JSON.parse(prismaResource.dataStoreId);
        dataStoreId[storeName] = storeId;
        await this.prismaClient.resource.update({
            where: {id: prismaResource.id},
            data: {
                dataStoreId: JSON.stringify(dataStoreId)
            }
        });

        await this.updateModificationTime(iri);
    }

    /**
     * Updates modification time of the resource and all its parent packages.
     * @param iri
     */
    private async updateModificationTime(iri: string) {
        const prismaResource = await this.prismaClient.resource.findFirst({where: {iri: iri}});
        if (prismaResource === null) {
            throw new Error("Cannot update modification time. Resource does not exists.");
        }

        let id: number | null = prismaResource.id;
        await this.updateModificationTimeById(id);
    }

    private async updateModificationTimeById(id: number) {
        while (id !== null) {
            await this.prismaClient.resource.update({
                where: {id},
                data: {
                    modifiedAt: new Date(),
                }
            });

            const parent = await this.prismaClient.resource.findFirst({select: {parentResourceId: true}, where: {id}}) as any; // It was causing TS7022 error
            id = parent?.parentResourceId ?? null;
        }
    }
}
