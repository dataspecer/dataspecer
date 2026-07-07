import { LOCAL_PACKAGE } from "@dataspecer/core-v2/model/known-models";
import type { PackageService } from "@dataspecer/core-v2/project";
import type { ModelIdentifier } from "@dataspecer/core/model";
import { PROJECT_MODEL_MODEL_ENTITY, type ProjectModelEntity, type PackageEntity } from "./model.ts";

/**
 * Traverses the package tree and returns entities representing the whole project structure.
 */
export async function loadProjectStructure(
  service: PackageService,
  projectId: ModelIdentifier,
): Promise<ProjectModelEntity[]> {
  const allModels: ProjectModelEntity[] = [];
  await recursivelyLoadResource(service, projectId, allModels);
  return allModels;
}

async function recursivelyLoadResource(
  service: PackageService,
  resourceId: ModelIdentifier,
  modelsToCollect: ProjectModelEntity[],
): Promise<void> {
  let resource = await service.getPackage(resourceId);

  for (const subResource of resource.subResources || []) {
    const isPackage = subResource.types.includes(LOCAL_PACKAGE);

    if (isPackage) {
      await recursivelyLoadResource(service, subResource.iri, modelsToCollect);
    } else {
      modelsToCollect.push({
        id: subResource.iri,
        type: [PROJECT_MODEL_MODEL_ENTITY],
        label: subResource.userMetadata?.label || {},
        description: subResource.userMetadata?.description || {},
        modelType: subResource.types[0]!,
      } as ProjectModelEntity);
    }
  }

  const packageEntity: PackageEntity = {
    id: resource.iri,
    type: [PROJECT_MODEL_MODEL_ENTITY],
    label: resource.userMetadata?.label || {},
    description: resource.userMetadata?.description || {},
    modelType: LOCAL_PACKAGE,
    subModels: resource.subResources?.map(model => model.iri) ?? [],
  };
  modelsToCollect.push(packageEntity);
}
