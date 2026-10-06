import { EntityModel } from "../../entity-model/index.ts";
import { VisualModel } from "@dataspecer/visual-model";

import { PackageService } from "@dataspecer/core/project-model/legacy";

export type { ResourceService, PackageService } from "@dataspecer/core/project-model/legacy";

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
