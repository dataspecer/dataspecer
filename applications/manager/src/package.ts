import { BackendPackageService, Package } from "@dataspecer/core-v2/project";
import { LanguageString } from "@dataspecer/core/core/core-resource";
import { createContext, useRef, useState } from "react";
import { StructureEditorBackendService } from "@dataspecer/backend-utils/connectors/specification";
import { LOCAL_SEMANTIC_MODEL, V1 } from "@dataspecer/core-v2/model/known-models";
import { createModelInstructions } from "./known-models";

const backendUrl = import.meta.env.VITE_BACKEND;

export type ResourceWithIris = Package & { subResourcesIri: string[] };

export const ResourcesContext = createContext<Record<string, ResourceWithIris>>({});

export const packageService = new BackendPackageService(backendUrl, (...p) => fetch(...p));

export const getSpecificationService = (parentPackage: string) => new StructureEditorBackendService(backendUrl, (...p) => fetch(...p), parentPackage);

const resourcesBeingFetched = new Set<string>();

let resourcesMemory:  React.MutableRefObject<Record<string, ResourceWithIris>>;

let setResourcesReact: (resources: Record<string, ResourceWithIris>) => void;

export async function requestLoadPackage(iri: string, forceUpdate = false) {
    if (resourcesBeingFetched.has(iri) || ((resourcesMemory.current[iri] as ResourceWithIris)?.subResourcesIri && !forceUpdate)) {
        return;
    }
    resourcesBeingFetched.add(iri);

    const pckg = await packageService.getPackage(iri) as ResourceWithIris;
    resourcesBeingFetched.delete(iri);

    const copiedResourcesMemory = {...resourcesMemory.current};

    if (pckg) {
        pckg.subResourcesIri = pckg.subResources!.map((resource) => resource.iri);

        for (const resource of pckg.subResources!) {
            if (copiedResourcesMemory[resource.iri]) {
                continue;
            }
            copiedResourcesMemory[resource.iri] = resource as ResourceWithIris;
        }
        delete pckg.subResources;
    }

    copiedResourcesMemory[iri] = pckg;
    setResourcesReact(copiedResourcesMemory);
    resourcesMemory.current = copiedResourcesMemory;
}

export async function modifyPackageRepresentsBranchHead(iri: string, representsBranchHead: boolean) {
    const pckg = await packageService.updatePackageRepresentsBranchHead(iri, {representsBranchHead});
    const copiedResourcesMemory = {...resourcesMemory.current};
    if (copiedResourcesMemory[iri]) {
        copiedResourcesMemory[iri] = { ...copiedResourcesMemory[iri], representsBranchHead: pckg.representsBranchHead };
    }
    setResourcesReact(copiedResourcesMemory);
}

export async function modifyPackageProjectData(iri: string, projectIri: string, branch: string) {
    const pckg = await packageService.updatePackageProjectIriAndBranch(iri, { projectIri, branch });
    const copiedResourcesMemory = {...resourcesMemory.current};
    if (copiedResourcesMemory[iri]) {
        copiedResourcesMemory[iri] = { ...copiedResourcesMemory[iri], branch: pckg.branch, projectIri: pckg.projectIri };
    }
    setResourcesReact(copiedResourcesMemory);
}

export async function modifyUserMetadata(iri: string, metadata: {label?: LanguageString, description?: LanguageString}) {
    const pckg = await packageService.updatePackage(iri, { userMetadata: metadata });
    const copiedResourcesMemory = {...resourcesMemory.current};
    if (copiedResourcesMemory[iri]) {
        copiedResourcesMemory[iri] = {...copiedResourcesMemory[iri], userMetadata: pckg.userMetadata, metadata: pckg.metadata};
    }
    setResourcesReact(copiedResourcesMemory);
}

export async function deleteResource(iri: string) {
    await packageService.deletePackage(iri);
    const copiedResourcesMemory = {...resourcesMemory.current};
    delete copiedResourcesMemory[iri];
    for (const resource of Object.values(copiedResourcesMemory)) {
        if (!resource) {
            continue;
        }
        if (resource.subResourcesIri?.includes(iri)) {
            copiedResourcesMemory[resource.iri] = {...resource, subResourcesIri: resource.subResourcesIri.filter((subIri) => subIri !== iri)};
        }
    }
    setResourcesReact(copiedResourcesMemory);
}

export const useResourcesContext = () => {
    resourcesMemory = useRef<Record<string, ResourceWithIris>>({});

    const [resources, setResources] = useState<Record<string, ResourceWithIris>>({});
    setResourcesReact = setResources;
    resourcesMemory.current = resources;

    return {
        resources,
    };
}

/**
 * This function adds missing models necessary for DSE.
 */
export async function ensurePackageWorksForDSE(packageIri: string) {
    let pckg: Package;
    if (resourcesMemory.current[packageIri] && resourcesMemory.current[packageIri].subResources) {
        pckg = resourcesMemory.current[packageIri];
    } else {
        pckg = await packageService.getPackage(packageIri);
    }

    // Configuration
    if (!pckg.subResources!.find(resource => resource.types.includes(V1.GENERATOR_CONFIGURATION))) {
        await createModelInstructions[V1.GENERATOR_CONFIGURATION].createHook({ parentIri: packageIri });
    }

    const semanticModels = pckg.subResources!.filter(resource => resource.types.includes(LOCAL_SEMANTIC_MODEL));
    if (semanticModels.length === 1) {
        // Exactly one semantic model to choose from

        // Profile config
        const data: any = await packageService.getResourceJsonData(packageIri) ?? {};

        if (!data["modelCompositionConfiguration"]) {
            // We need to create new one
            data["modelCompositionConfiguration"] = {
                "modelType": "application-profile",
                "model": semanticModels[0].iri,
                "canAddEntities": false,
                "canModify": true,
                "profiles": {
                    "modelType": "merge",
                    "models": null
                }
            };
            await packageService.setResourceJsonData(packageIri, data);
        }
    }
}