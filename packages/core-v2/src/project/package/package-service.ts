import { EntityModel } from "../../entity-model/index.ts";
import { VisualModel } from "@dataspecer/visual-model";
import { Package, ResourceEditable } from "../resource/resource.ts";

/**
 * Provides basic operations with packages.
 */
export interface PackageService {
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
