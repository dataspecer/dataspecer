import { type EntityModel } from "@dataspecer/core-v2/entity-model";
import { BackendPackageService, type ResourceEditable } from "@dataspecer/core-v2/project";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-browser";
import { useMemo } from "react";
import type { VisualEntityModel } from "@dataspecer/core-v2/visual-model";

export const useBackendConnection = () => {
    // should fail already when spinning up the next app
    // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
    const service = useMemo(() => new BackendPackageService(process.env.NEXT_PUBLIC_APP_BACKEND!, httpFetch), []);

    const getPackageFromBackend = async (packageId: string) => {
        const pkg = await service.getPackage(packageId);
        return pkg;
    };

    const getModelsFromBackend = async (packageId: string) => {
        const models = await service.constructSemanticModelPackageModels(packageId);
        console.log(models);
        return models;
    };

    const updateSemanticModelPackageModels = async (
        packageId: string,
        models: EntityModel[],
        visualModels: VisualEntityModel[]
    ) => {
        const status = await service.updateSemanticModelPackageModels(packageId, models, visualModels);
        console.log(`updated models for package ${packageId}`, models, visualModels, status);
        return status;
    };

    const createPackage = async (packageId: string, packageNameCs: string) => {
        const pkg = await service.createPackage("http://dataspecer.com/packages/local-root", {
            iri: packageId,
            userMetadata: {
                name: { cs: packageNameCs },
                tags: [],
            },
        } as ResourceEditable);
        console.log(pkg);
        alert(`package ${pkg.iri}-${packageNameCs} logged to console`);
        return pkg;
    };

    return {
        service,
        getPackageFromBackend,
        updateSemanticModelPackageModels,
        getModelsFromBackend,
        createPackage,
    };
};
