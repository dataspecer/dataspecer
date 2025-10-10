import { LOCAL_PACKAGE, V1 } from "@dataspecer/core-v2/model/known-models";
import { LanguageString } from "@dataspecer/core-v2/semantic-model/concepts";
import { PrismaClient, Resource as PrismaResource } from "@prisma/client";
import { v4 as uuidv4 } from 'uuid';
import { storeModel } from './../main.ts';
import { LocalStoreModel, ModelStore } from "./local-store-model.ts";
import { DataPsmSchema } from "@dataspecer/core/data-psm/model/data-psm-schema";
import { CoreResource } from "@dataspecer/core/core/core-resource";
import { CommitReferenceType, createDatastoreWithReplacedIris, defaultEmptyGitUrlForDatabase } from "@dataspecer/git";
import { ResourceChangeListener, ResourceChangeObserverBase, ResourceChangeType } from "./resource-change-observer.ts";

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

    linkedGitRepositoryURL: string;
    projectIri: string;
    branch: string;
    representsBranchHead: boolean;
    lastCommitHash: string;
    isSynchronizedWithRemote: boolean;

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
    readonly storeModel: LocalStoreModel;
    private readonly prismaClient: PrismaClient;
    private resourceChangeObserver: ResourceChangeObserverBase;

    constructor(storeModel: LocalStoreModel, prismaClient: PrismaClient) {
        this.storeModel = storeModel;
        this.prismaClient = prismaClient;
        this.resourceChangeObserver = new ResourceChangeObserverBase();
    }

    addResourceChangeListener(listener: ResourceChangeListener) {
        this.resourceChangeObserver.addListener(listener);
    }
    removeResourceChangeListener(listener: ResourceChangeListener) {
        this.resourceChangeObserver.removeListener(listener);
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
     * Returns a single resource or null if the resource does not exist.
     */
    async getResourceForId(id: number): Promise<BaseResource | null> {
        const prismaResource = await this.prismaClient.resource.findFirst({where: {id}});
        if (prismaResource === null) {
            return null;
        }

        return await this.prismaResourceToResource(prismaResource);
    }

    /**
     * Returns a root resource for the given {@link iri}, note that this is not the absolute root,
     *  meaning the root which we get by running getRoots
     */
    async getRootResourceForIri(iri: string): Promise<BaseResource | null> {
        const prismaResource = await this.prismaClient.resource.findFirst({where: {iri}});
        if (prismaResource === null) {
            return null;
        }

        const absoluteRoots = await this.prismaClient.resource.findMany({where: {parentResourceId: null}});
        const absoluteRootsIds = absoluteRoots.map(root => root.id);

        let parentId: number = prismaResource.id;
        let currentPrismaResource = prismaResource;
        while (!(currentPrismaResource.parentResourceId === null || absoluteRootsIds.includes(currentPrismaResource.parentResourceId))) {
            parentId = currentPrismaResource.parentResourceId;
            const parentResource = await this.prismaClient.resource.findFirst({where: {id: parentId}});
            if (parentResource === null) {
                break;
            }
            currentPrismaResource = parentResource;
        }

        return await this.prismaResourceToResource(currentPrismaResource);
    }

    /**
     * @returns Returns resources with the given {@link projectIri}.
     */
    async getProjectResources(projectIri: string): Promise<BaseResource[]> {
        const prismaResources = await this.prismaClient.resource.findMany({where: { projectIri: projectIri }});
        const result = prismaResources.map(prismaResource => this.prismaResourceToResource(prismaResource));
        return await Promise.all(result);
    }


    /**
     * Removes given {@link gitURL} from each resource, which has it.
     *  This method should be called, when the remote repository was removed.
     * @returns The affected iris, that is iris of resources, which had linkedGitRepositoryURL === {@link gitURL}
     */
    async removeGitLinkFromResourceModel(gitURL: string) {
        const affectedResources = await this.getResourcesForGitUrl(gitURL);

        const result = await this.prismaClient.resource.updateMany({
            where: {
                linkedGitRepositoryURL: gitURL
            },
            data: {
                linkedGitRepositoryURL: defaultEmptyGitUrlForDatabase
            },
        });

        if (result.count !== affectedResources.length) {
            throw new Error("For some reason the amount of removed git links is not equal to the amount of resources, which had the git link");
        }

        for (const affectedResource of affectedResources) {
            // TODO RadStr: Commented code - at first we were resetting all the projectIris and branches, but because of possible moving to different repository we don't do anything.
            // TODO RadStr Don't know by myself, but probably shouldnt reset the project iris and branch: Well should we really?
            //  I don't know on one side - yeah we removed the repo so the packages are no longer connected. On other side what if we somehow want to move them to different repository?
            // ... Yeah I will not remove it then because of the moving to different repository !!!
            // They are no longer part of the same project.
            // await this.updateResourceProjectIriAndBranch(affectedResource, affectedResource, defaultBranchForPackageInDatabase);
            await this.updateModificationTime(affectedResource, "meta", ResourceChangeType.Modified);
        }

        return affectedResources;
    }

    /**
     * @returns The first resource, which is linked to given {@link gitRepositoryUrl}.
     *  If {@link forbiddenIri} is provided, then the returned resource can not have the same iri as {@link forbiddenIri}.
     */
    async getResourceForGitUrl(gitRepositoryUrl: string, forbiddenIri?: string): Promise<{ resource: BaseResource, resourceId: number } | null> {
        let prismaResource;
        if (forbiddenIri === undefined) {
            prismaResource = await this.prismaClient.resource.findFirst({where: { linkedGitRepositoryURL: gitRepositoryUrl }});
        }
        else {
            prismaResource = await this.prismaClient.resource.findFirst({where: {
                linkedGitRepositoryURL: gitRepositoryUrl,
                NOT: {
                    iri: forbiddenIri
                }
            }});
        }
        if (prismaResource === null) {
            return null;
        }

        const resourceToReturn = await this.prismaResourceToResource(prismaResource);
        return {
            resource: resourceToReturn,
            resourceId: prismaResource.id,
        };
    }

    async getResourcesForGitUrl(gitRepositoryUrl: string): Promise<string[]> {
        const prismaResources = await this.prismaClient.resource.findMany({
            where: {
                linkedGitRepositoryURL: gitRepositoryUrl,
            }
        });

        return await Promise.all(prismaResources.map(resource => resource.iri));
    }

    /**
     * @returns The first resource, which is linked to given {@link gitRepositoryUrl} and has the given {@link branch}.
     */
    async getResourceForGitUrlAndBranch(gitRepositoryUrl: string, branch: string): Promise<BaseResource | null> {
        const prismaResource = await this.prismaClient.resource.findFirst({where: {
            linkedGitRepositoryURL: gitRepositoryUrl,
            branch: branch,
         }});
        if (prismaResource === null) {
            return null;
        }

        return await this.prismaResourceToResource(prismaResource);
    }

    /**
     * Updates user metadata of the resource.
     */
    async updateResourceMetadata(iri: string, userMetadata: {}) {
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
        await this.updateModificationTime(iri, "meta", ResourceChangeType.Modified);
    }

    /**
     * Updates the last commit hash of package
     */
    async updateLastCommitHash(iri: string, lastCommitHash: string) {
        if (!(lastCommitHash.length === 40 || lastCommitHash.length === 0)) {
            throw new Error("Updating lastCommitHash to invalid hash, is not of length 40 or 0");        // TODO RadStr: maybe better error handling
        }

        await this.prismaClient.resource.update({
            where: {iri},
            data: {
                lastCommitHash: lastCommitHash,
            }
        });
        await this.updateModificationTime(iri, "meta", ResourceChangeType.Modified);
    }

    /**
     * Updates user metadata of the resource with given {@link linkedGit}.
     *  It is important to note that setting {@link shouldSetProjectIris} does not behave as you probably think it does.
     * If it is true, we always set the projectIri either to the projectIri of existing resource or to the iri of the resource we are updating.
     * But for the children? We can not map between resources, we don't have data by which we could link the resources together - we have just iris and project iris.
     * Well and iris are different between the different packages representing the same git url and projectIris either don't match or they should match.
     * So if it is true we just set the projectIri to the iri of the resource itself. But note that this should be already the case after creating the resource.
     * @param shouldSetProjectIris Should be probably always false - TODO RadStr: because it is unnecessary I think - so we could just remove it together with the code in if
     */
    async updateResourceGitLink(iri: string, linkedGit: string, shouldSetProjectIris: boolean) {
        if (linkedGit.endsWith("/")) {
            linkedGit = linkedGit.substring(0, linkedGit.length - 1);
        }

        const resourceToUpdate = await this.prismaClient.resource.findFirst({where: {iri}});
        if (resourceToUpdate === null) {
            throw new Error(`The resource with iri (${iri}) is missing. Can't set linked git url: ${linkedGit}`);
        }

        if (shouldSetProjectIris) {
            // We have to set Project iri. If not present, just use the iri of this resource.
            const sourceForProjectResource = await this.getResourceForGitUrl(linkedGit, iri);
            const projectIri = sourceForProjectResource?.resource.projectIri ?? iri;

            await this.prismaClient.resource.update({
                where: {iri},
                data: {
                    linkedGitRepositoryURL: linkedGit,
                    projectIri: projectIri
                }
            });
            await this.updateModificationTime(iri, "meta", ResourceChangeType.Modified);

            if (sourceForProjectResource !== null) {
                // This needs explanation.
                // Since it is not obvious why we don't set the projectIri of children to the found project.
                // For this we have to think, when we actually update to projectIri.
                // 1) We created new repo from DS - Then sourceForProjectResource === null, so we perform the recursive copy in the "else"
                // 2) We imported git repo. Well we store projectIri in the export, therefore the projectIri should be already set
                // 3) We created branch in DS, well since creation of a branch is only a copy, we also copied to projectIris
                // 4) We linked to existing repo - well here I don't know, but I feel like the linking to existing has only one use-case:
                //     - That is the REST API to create repo did not work. Therefore we just created empty repo and linked it manually
                //      - So I would say that we are basically in case 1)
                // This is all. There are no other ways to set git link.
                return;
            }
            await this.copyIriToProjectIriForChildrenRecursively(resourceToUpdate.id);

        }
        else {
            await this.prismaClient.resource.update({
                where: {iri},
                data: {
                    linkedGitRepositoryURL: linkedGit,
                }
            });
        }
    }

    private async copyIriToProjectIriForChildrenRecursively(parentResourceId: number) {
        const resourcesToUpdate = await this.prismaClient.resource.findMany({where: {parentResourceId}});
        for (const resourceToUpdate of resourcesToUpdate) {
            this.prismaClient.resource.update({
                where: {iri: resourceToUpdate.iri},
                data: {
                    projectIri: resourceToUpdate.projectIri ?? resourceToUpdate.iri,
                }
            });
            await this.updateModificationTime(resourceToUpdate.iri, "meta", ResourceChangeType.Modified);
            await this.copyIriToProjectIriForChildrenRecursively(resourceToUpdate.id);
        }
    }

    /**
     * Updates {@link projectIri} and {@link branch} if given for resource identified by {@link iri}. If not given the previous value is kept.
     */
    async updateResourceProjectIriAndBranch(iri: string, projectIri?: string, branch?: string) {
        await this.prismaClient.resource.update({
            where: {iri},
            data: {
                // undefined values won't update the resource, the previous value will be kept.
                branch,
                projectIri
            }
        });
        await this.updateModificationTime(iri, "meta", ResourceChangeType.Modified);
    }

    async updateRepresentsBranchHead(iri: string, commitReferenceType: CommitReferenceType) {
        await this.prismaClient.resource.update({
            where: {iri},
            data: {
                representsBranchHead: commitReferenceType === "branch",
            }
        });
        await this.updateModificationTime(iri, "meta", ResourceChangeType.Modified);
    }

    async updateIsSynchronizedWithRemote(iri: string, isSynchronizedWithRemote: boolean) {
        await this.prismaClient.resource.update({
            where: {iri},
            data: {
                isSynchronizedWithRemote: isSynchronizedWithRemote
            }
        });
        await this.updateModificationTime(iri, "meta", ResourceChangeType.Modified);
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

        // TODO RadStr: ? Again don't know what iri to provide
        await this.updateModificationTime(iri, "resource", ResourceChangeType.Removed);
        await this.prismaClient.resource.delete({where: {id: prismaResource.id}});

        for (const storeId of Object.values(JSON.parse(prismaResource.dataStoreId))) {
            await this.storeModel.remove(this.storeModel.getById(storeId as string));
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
                    const modelStore = this.storeModel.getModelStore(dataStores.model);
                    // console.log(modelStore);
                    const model = await modelStore.getJson();


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
            linkedGitRepositoryURL: prismaResource.linkedGitRepositoryURL,
            projectIri: prismaResource.projectIri,
            branch: prismaResource.branch,
            representsBranchHead: prismaResource.representsBranchHead,
            lastCommitHash: prismaResource.lastCommitHash,
            isSynchronizedWithRemote: prismaResource.isSynchronizedWithRemote,
        }
    }

    /**
     * Returns data about the package and its sub-resources.
     */
    async getPackage(iri: string, deep: boolean = false) {
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
    createPackage(parentIri: string | null, iri: string, userMetadata: {}, projectIri?: string) {
        return this.createResource(parentIri, iri, LOCAL_PACKAGE, userMetadata, projectIri);
    }

    /**
     * Copies package or resource by IRI to another package identified by parentIri.
     * @returns The iri of new root
     */
    async copyRecursively(iri: string, parentIri: string, userMetadata: {}) {
        const prismaParentResource = await this.prismaClient.resource.findFirst({where: {iri: parentIri}});
        if (prismaParentResource === null) {
            throw new Error("Parent resource not found.");
        }

        const copyResource = async (sourceIri: string, parentIri: string, newIri: string) => {
            const existingIriToCreatedIriForResourceMap: Record<string, string> = {};
            // First create only the resourced and collect the iri mapping from existing to created copy
            await copyOnlyResourcesInternal(sourceIri, parentIri, newIri, existingIriToCreatedIriForResourceMap);
            // Now replace every every copied iri (which is not project iri) in the existing metas + create datastores and replace
            await copyResourcedWithDatastoresAndReplace(existingIriToCreatedIriForResourceMap);
        }

        const copyOnlyResourcesInternal = async (sourceIri: string, parentIri: string, newIri: string, existingIriToCreatedIriForResourceMap: Record<string, string>) => {
            const prismaResource = await this.prismaClient.resource.findFirst({where: {iri: sourceIri}});
            if (prismaResource === null) {
                throw new Error("Resource to copy not found.");
            }
            await this.createResource(parentIri, newIri, prismaResource.representationType, JSON.parse(prismaResource.userMetadata), prismaResource.projectIri);
            existingIriToCreatedIriForResourceMap[sourceIri] = newIri;

            // Copy children
            if (prismaResource.representationType === LOCAL_PACKAGE) {
                const subResources = await this.prismaClient.resource.findMany({where: {parentResourceId: prismaResource.id}});
                for (const subResource of subResources) {
                    // TODO RadStr: Old code - Why the "/", the iris are new?
                    await copyOnlyResourcesInternal(subResource.iri, newIri, newIri + "/" + uuidv4(), existingIriToCreatedIriForResourceMap);
                }
            }
        }

        const copyResourcedWithDatastoresAndReplace = async (existingIriToCreatedIriForResourceMap: Record<string, string>) => {
            for (const [oldIri, newIri] of Object.entries(existingIriToCreatedIriForResourceMap)) {
                const oldPrismaResource = await this.prismaClient.resource.findFirst({where: {iri: oldIri}});
                if (oldPrismaResource === null) {
                    throw new Error("Resource to copy not found.");
                }

                const newDataStoreId = {} as Record<string, string>;
                for (const [key, store] of Object.entries(JSON.parse(oldPrismaResource.dataStoreId))) {
                    const newStore = await this.storeModel.create();
                    newDataStoreId[key] = newStore.uuid;

                    const datastoreContentAsJson = await storeModel.getModelStore(store as string).getJson();
                    const { datastoreWithReplacedIris } = createDatastoreWithReplacedIris(datastoreContentAsJson, existingIriToCreatedIriForResourceMap);
                    await this.storeModel.getModelStore(newStore.uuid).setJson(datastoreWithReplacedIris);
                }
                await this.prismaClient.resource.update({
                    where: {iri: newIri},
                    data: {
                        dataStoreId: JSON.stringify(newDataStoreId)
                    }
                });
            }
        }

        // Copy the root
        const newRootIri = uuidv4();
        await copyResource(iri, parentIri, newRootIri);

        const sourcePrismaResource = await this.prismaClient.resource.findFirst({where: { iri }});
        const sourceGitLink = sourcePrismaResource?.linkedGitRepositoryURL;
        if (sourceGitLink !== undefined) {
            await this.updateResourceGitLink(newRootIri, sourceGitLink, false);
        }
        await this.updateLastCommitHash(newRootIri, sourcePrismaResource?.lastCommitHash ?? "");

        await this.updateModificationTimeById(prismaParentResource.id);
        return newRootIri;
    }

    /**
     * Low level function to create a resource.
     * If parent IRI is null, the resource is created as root resource.
     */
    async createResource(parentIri: string | null, iri: string, type: string, userMetadata: {}, projectIri?: string) {
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
                projectIri: projectIri ?? iri,
                parentResourceId: parentResourceId,
                representationType: type,
                userMetadata: JSON.stringify(userMetadata),
            }
        });

        if (parentResourceId !== null) {
            // TODO RadStr: ? Again don't know what iri to provide
            await this.updateModificationTime(parentIri ?? iri, "resource", ResourceChangeType.Created);
            await this.updateModificationTimeById(parentResourceId);
        }
    }

    async getResourceModelStore(iri: string, storeName: string = "model"): Promise<ModelStore | null> {
        const prismaResource = await this.prismaClient.resource.findFirst({where: {iri: iri}});
        if (prismaResource === null) {
            throw new Error("Resource not found.");
        }

        const onUpdate = () => this.updateModificationTime(iri, storeName, ResourceChangeType.Modified);

        const dataStoreId = JSON.parse(prismaResource.dataStoreId);

        if (dataStoreId[storeName]) {
            return this.storeModel.getModelStore(dataStoreId[storeName], [onUpdate]);
        } else {
            return null;
        }
    }

    async getOrCreateResourceModelStore(iri: string, storeName: string = "model"): Promise<ModelStore> {
        const prismaResource = await this.prismaClient.resource.findFirst({where: {iri: iri}});
        if (prismaResource === null) {
            throw new Error("Resource not found.");
        }

        const onUpdate = () => this.updateModificationTime(iri, storeName, ResourceChangeType.Modified);

        const dataStoreId = JSON.parse(prismaResource.dataStoreId);

        if (dataStoreId[storeName]) {
            return this.storeModel.getModelStore(dataStoreId[storeName], [onUpdate]);
        } else {
            const store = await this.storeModel.create();
            dataStoreId[storeName] = store.uuid;
            await this.prismaClient.resource.update({
                where: {id: prismaResource.id},
                data: {
                    dataStoreId: JSON.stringify(dataStoreId)
                }
            });
            await this.updateModificationTime(iri, storeName, ResourceChangeType.Created);
            return this.storeModel.getModelStore(store.uuid, [onUpdate]);
        }
    }

    async deleteModelStore(iri: string, storeName: string = "model") {
        const prismaResource = await this.prismaClient.resource.findFirst({where: {iri: iri}});
        if (prismaResource === null) {
            throw new Error("Resource not found.");
        }

        const dataStoreId = JSON.parse(prismaResource.dataStoreId);

        if (!dataStoreId[storeName]) {
            throw new Error("Store not found.");
        }

        await this.storeModel.remove(this.storeModel.getById(dataStoreId[storeName]));

        delete dataStoreId[storeName];

        await this.prismaClient.resource.update({
            where: {id: prismaResource.id},
            data: {
                dataStoreId: JSON.stringify(dataStoreId)
            }
        });

        await this.updateModificationTime(iri, storeName, ResourceChangeType.Removed);
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

        // TODO RadStr: Or modified? does it even matter?
        await this.updateModificationTime(iri, storeName, ResourceChangeType.Created);
    }

    /**
     * Updates modification time of the resource and all its parent packages.
     * @param iri
     */
    async updateModificationTime(iri: string, updatedModel: string | null, updateReason: ResourceChangeType) {
        const prismaResource = await this.prismaClient.resource.findFirst({where: {iri: iri}});
        if (prismaResource === null) {
            throw new Error("Cannot update modification time. Resource does not exists.");
        }

        let id: number | null = prismaResource.id;
        await this.resourceChangeObserver.notifyListeners(iri, updatedModel, updateReason);
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
