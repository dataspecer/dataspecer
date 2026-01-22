import { HttpFetch } from "@dataspecer/core/io/fetch/fetch-api";
import { EntityModel } from "../../entity-model/index.ts";
import { LOCAL_PACKAGE, LOCAL_SEMANTIC_MODEL, LOCAL_VISUAL_MODEL } from "../../model/known-models.ts";
import { createRdfsModel, createSgovModel } from "../../semantic-model/simplified/index.ts";
import { createInMemorySemanticModel } from "../../semantic-model/simplified/in-memory-semantic-model.ts";
import { createVisualModel } from "../../semantic-model/simplified/visual-model.ts";
import { PimStoreWrapper } from "../../semantic-model/v1-adapters/index.ts";
import { VisualModel, isLabeledModel } from "@dataspecer/visual-model";
import { BaseResource, Package, ResourceEditable } from "../resource/resource.ts";
import { PackageService, SemanticModelPackageService } from "./package-service.ts";

/**
 * Implementation of PackageService that communicates with backend and provides semantic models.
 */
export class BackendPackageService implements PackageService, SemanticModelPackageService {
    protected readonly backendUrl: string;
    protected readonly httpFetch: HttpFetch;

    constructor(backendUrl: string, httpFetch: HttpFetch) {
        this.backendUrl = backendUrl;
        this.httpFetch = httpFetch;
    }

    async getResource(resourceId: string): Promise<BaseResource> {
        const result = await this.httpFetch(this.getResourceUrl(resourceId));
        return (await result.json()) as BaseResource;
    }

    async getPackage(packageId: string): Promise<Package> {
        const result = await this.httpFetch(this.getPackageUrl(packageId));
        if (result.status === 404) {
            // @ts-ignore
            return null;
        }
        return (await result.json()) as Package;
    }

    async createResource(parentPackageId: string, data: Partial<ResourceEditable> & {type?: string}): Promise<BaseResource> {
        const result = await this.httpFetch(this.getResourceUrl(parentPackageId, true), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });
        return (await result.json()) as BaseResource;
    }

    async createPackage(parentPackageId: string, data: Partial<ResourceEditable>): Promise<Package> {
        const result = await this.httpFetch(this.getPackageUrl(parentPackageId, true), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });
        return (await result.json()) as Package;
    }

    async updatePackage(packageId: string, data: Partial<ResourceEditable>): Promise<Package> {
        const result = await this.httpFetch(this.getPackageUrl(packageId), {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });
        return (await result.json()) as Package;
    }

    async deletePackage(packageId: string): Promise<void> {
        await this.httpFetch(this.getPackageUrl(packageId), {
            method: "DELETE",
        });
    }

    async deleteResource(iri: string): Promise<void> {
        await this.httpFetch(this.getResourceUrl(iri), {
            method: "DELETE",
        });
    }

    async getResourceJsonData(id: string, blobId?: string): Promise<object | null> {
        const result = await this.httpFetch(this.getBlobUrl(id, blobId));
        return (result.status >= 200 && result.status < 300) ? (await result.json() as object) : null;
    }

    async setResourceJsonData(id: string, data: any, blobId?: string) {
        await this.httpFetch(this.getBlobUrl(id, blobId), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });
    }

    /**
     * This method is used by CME editor for transparently loading all models from a given package.
     * @todo It should not be a package, but a model itself with all its dependencies. Now it is a model.
     * @param packageId
     * @returns
     */
    async constructSemanticModelPackageModels(
        packageId: string
    ): Promise<readonly [EntityModel[], VisualModel[]]> {
        const entityModels: EntityModel[] = [];
        const visualModels: VisualModel[] = [];

        const recursivellyLoadPackage = async (packageId: string) => {
            const pckg = await this.getPackage(packageId);
            const [entity, visual] = await this.getModelsFromResources(pckg.subResources!);
            entityModels.push(...entity);
            visualModels.push(...visual);

            for (const resource of pckg.subResources!) {
                if (resource.types.includes(LOCAL_PACKAGE)) {
                    await recursivellyLoadPackage(resource.iri);
                }
            }
        }

        await recursivellyLoadPackage(packageId);

        return [entityModels, visualModels] as const;
    }

    /**
     * Simplified operation for updating a list of models on backend.
     *
     * If some models (semantic or visual) are ommited, they will be deleted.
     */
    async updateSemanticModelPackageModels(
        packageId: string,
        models: EntityModel[],
        visualModels: VisualModel[]
    ): Promise<boolean> {
        const responseStatuses = new Set<number>();
        for (const visualModel of [...models, ...visualModels]) {
            // @ts-ignore
            const modelSerialization = visualModel.serializeModel();
            const iri = visualModel.getId();
            const name = modelSerialization.modelAlias ?? modelSerialization.alias;

            // Use the label from getLabel() if the model is a LabeledModel (e.g., VisualModel)
            const label = isLabeledModel(visualModel) ? visualModel.getLabel() : null;
            const userMetadata = label ? { label } : (name ? { label: { en: name } } : {});

            const response = await this.httpFetch(this.getResourceUrl(iri));
            if (response.status !== 200) {
                const createdResponse = await this.httpFetch(this.getResourceUrl(packageId, true), {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        iri: iri,
                        type: modelSerialization.type,
                        userMetadata: userMetadata
                    }),
                });
                responseStatuses.add(createdResponse.status);
            } else {
                const updatedResponse = await this.httpFetch(this.getResourceUrl(iri), {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        userMetadata: userMetadata
                    }),
                });
                responseStatuses.add(updatedResponse.status);
            }

            const updatedResponse = await this.httpFetch(this.getBlobUrl(iri), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(modelSerialization),
            });
            responseStatuses.add(updatedResponse.status);
        }

        // Remove other models
        const modelIds = [...models, ...visualModels].map(model => model.getId());
        const pckg = await this.getPackage(packageId);
        for (const model of pckg.subResources!) {
            if (model.types.some(t => [
                LOCAL_VISUAL_MODEL,
                "https://dataspecer.com/core/model-descriptor/sgov",
                LOCAL_SEMANTIC_MODEL,
                "https://dataspecer.com/core/model-descriptor/pim-store-wrapper"
            ].includes(t))) {
                if (!modelIds.includes(model.iri)) {
                    // Remove model
                    await this.deleteResource(model.iri);
                }
            }
        }

        const anyErrors = [...responseStatuses.values()].filter((n) => n > 399).length;
        if (anyErrors > 0) {
            return false;
        }
        return true;
        // return null as any as Package; // todo
    }

    /**
     * Performs only update of a single model. It will not delete any other models.
     */
    async updateSingleModel(model: EntityModel): Promise<void> {
        // @ts-ignore
        const modelSerialization = model.serializeModel();
        const iri = model.getId();

        await this.httpFetch(this.getBlobUrl(iri), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(modelSerialization),
        });
    }

    private getPackageUrl(packageId: string, asParent: boolean = false): string {
        let url = this.backendUrl + "/resources/packages";
        url += "?" + (asParent ? "parentIri" : "iri") + "=" + encodeURIComponent(packageId);
        return url;
    }

    private getResourceUrl(iri: string, asParent: boolean = false): string {
        let url = this.backendUrl + "/resources";
        url += "?" + (asParent ? "parentIri" : "iri") + "=" + encodeURIComponent(iri);
        return url;
    }

    private getBlobUrl(iri: string, name?: string): string {
        let url = this.backendUrl + "/resources/blob";
        url += "?" + "iri" + "=" + encodeURIComponent(iri);
        if (name) {
            url += "&name=" + encodeURIComponent(name);
        }
        return url;
    }

    private async getFullJsonModel(resource: BaseResource): Promise<object> {
        const modelData = (await (await this.httpFetch(this.getBlobUrl(resource.iri).toString())).json()) as any;
        return { resource, ...modelData };
    }

    async getModelsFromResources(resources: BaseResource[]): Promise<readonly [EntityModel[], VisualModel[]]> {
        const entityModels = [];
        const visualModels = [];

        for (const resource of resources) {
            const name = resource.userMetadata.label?.en ?? resource.userMetadata.label?.cs;

            // Visual model
            if (resource.types.includes(LOCAL_VISUAL_MODEL)) {
                const modelData = (await (
                    await this.httpFetch(this.getBlobUrl(resource.iri).toString())
                ).json()) as any;
                modelData.modelAlias = name;
                const model = createVisualModel(resource.iri).deserializeModel(modelData); // ok
                visualModels.push(model);
            }

            // SGOV model
            if (resource.types.includes("https://dataspecer.com/core/model-descriptor/sgov")) {
                const model = createSgovModel("https://slovník.gov.cz/sparql", this.httpFetch, resource.iri);
                const modelData = (await (
                    await this.httpFetch(this.getBlobUrl(resource.iri).toString())
                ).json()) as any;
                modelData.modelAlias = name;
                await model.unserializeModel(modelData);
                entityModels.push(model);
            }

            // Semantic model
            if (resource.types.includes(LOCAL_SEMANTIC_MODEL)) {
                const modelData = (await (
                    await this.httpFetch(this.getBlobUrl(resource.iri).toString())
                ).json()) as any;
                modelData.modelAlias = name;
                const model = createInMemorySemanticModel().deserializeModel(modelData);
                entityModels.push(model);
            }

            // Pim store wrapper
            if (resource.types.includes("https://dataspecer.com/core/model-descriptor/pim-store-wrapper")) {
                const modelData = (await (
                    await this.httpFetch(this.getBlobUrl(resource.iri).toString())
                ).json()) as any;
                const model = new PimStoreWrapper(modelData.pimStore, modelData.id, name, modelData.urls);
                model.fetchFromPimStore();
                entityModels.push(model);
            }
        }

        return [entityModels, visualModels] as const;
    }

    /**
     * @deprecated Used only for importing models in cme
     */
    async getModelsFromModelDescriptors(modelDescriptors: any[]) {
        const constructedEntityModels: EntityModel[] = [];
        const constructedVisualModels: VisualModel[] = [];
        // todo: use more robust approach
        for (const modelDescriptor of modelDescriptors) {
            if (modelDescriptor.type === "https://dataspecer.com/core/model-descriptor/sgov") {
                const model = createSgovModel("https://slovník.gov.cz/sparql", this.httpFetch);
                await model.unserializeModel(modelDescriptor);
                constructedEntityModels.push(model);
            } else if (modelDescriptor.type === "https://dataspecer.com/core/model-descriptor/rdfs") {
                const model = await createRdfsModel(modelDescriptor.urls, this.httpFetch);
                constructedEntityModels.push(model);
            } else if (
                modelDescriptor.type === "https://dataspecer.com/core/model-descriptor/visual-model" ||
                modelDescriptor.type === LOCAL_VISUAL_MODEL
            ) {
                const model = createVisualModel(modelDescriptor.modelId).deserializeModel(modelDescriptor);
                constructedVisualModels.push(model);
            } else if (
                modelDescriptor.type === "https://dataspecer.com/core/model-descriptor/in-memory-semantic-model" ||
                modelDescriptor.type === LOCAL_SEMANTIC_MODEL
            ) {
                const model = createInMemorySemanticModel().deserializeModel(modelDescriptor);
                constructedEntityModels.push(model);
            } else if (modelDescriptor.type === "https://dataspecer.com/core/model-descriptor/pim-store-wrapper") {
                const model = new PimStoreWrapper(modelDescriptor.pimStore, modelDescriptor.id, modelDescriptor.alias);
                model.fetchFromPimStore();
                constructedEntityModels.push(model);
            } else {
                throw new Error(`Unknown model descriptor type: ${modelDescriptor.type}. Can not create such model.`);
            }
        }

        return [constructedEntityModels, constructedVisualModels] as const;
    }

    async copyRecursively(resourceToCopy: string, newParentResource: string, userMetadata: BaseResource["userMetadata"] = {}) {
        let url = this.backendUrl + "/repository/copy-recursively";
        url += "?" + "iri" + "=" + encodeURIComponent(resourceToCopy);
        url += "&" + "parentIri" + "=" + encodeURIComponent(newParentResource);

        const result = await this.httpFetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(userMetadata),
        });
        const data = await result.json();
    }

    async getResourceDataStores(iri: string): Promise<Record<string, string> | null> {
        const url = this.getResourceUrl(iri);
        const result = await this.httpFetch(url);
        if (result.status === 404) {
            return null;
        }
        const data = await result.json() as any;
        return data.dataStores ?? null;
    }
}
