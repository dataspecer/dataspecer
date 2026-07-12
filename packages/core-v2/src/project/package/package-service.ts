import { EntityModel } from "../../entity-model/index.ts";
import { VisualModel } from "@dataspecer/visual-model";
import type { Transaction } from "@dataspecer/core/operation";
import { Package, ResourceEditable, type BaseResource } from "../resource/resource.ts";

/**
 * Provides basic operations with resources.
 */
export interface ResourceService {
    getResource(resourceId: string): Promise<BaseResource>;
    getResourceJsonData(resourceId: string, name?: string): Promise<unknown>;
    setResourceJsonData(resourceId: string, data: unknown, name?: string): Promise<void>;
}

/**
 * Provides basic operations with packages.
 */
export interface PackageService extends ResourceService {
    /**
     * Returns package with all sub-packages.
     */
    getPackage(packageId: string): Promise<Package>;

    /**
     * Create a new empty package that can be used to store other packages or models.
     */
    createPackage(parentPackageId: string, data: ResourceEditable): Promise<Package>;

    /**
     * Updates editable package metadata.
     */
    updatePackage(packageId: string, data: Partial<ResourceEditable>): Promise<Package>;

    /**
     * Removes the package with all models and sub-packages.
     */
    deletePackage(packageId: string): Promise<void>;

    /**
     * Creates a new resource (a model, not a package) of the given type under
     * the parent package, with the given id.
     */
    createResource(parentPackageId: string, data: ResourceEditable & { type: string }): Promise<BaseResource>;

    /**
     * Removes the resource identified by its id. If it is a package, all of
     * its sub-resources are removed as well.
     */
    deleteResource(iri: string): Promise<void>;

    /**
     * Uploads transactions (in order) to the backend, which records them in the
     * operation history and applies their operations to the stored models. This
     * is the actual write of the models and thus throws when the backend
     * rejects it.
     */
    applyTransactions(projectId: string, transactions: Transaction[]): Promise<void>;
}

export interface SemanticModelPackageService extends PackageService {
    /**
     * Constructs all models from a package with semantic model.
     */
    constructSemanticModelPackageModels(packageId: string): Promise<readonly [EntityModel[], VisualModel[]]>;

    /**
     * Sets semantic models that should be stored in the given package.
     * If the set of models is changed (new model is added or existing is removed), this method should be called.
     * It will update the models that are stored in the package.
     */
    updateSemanticModelPackageModels(
        packageId: string,
        models: EntityModel[],
        visualModels: VisualModel[]
    ): Promise<boolean>;
}
