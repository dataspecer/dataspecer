import { LOCAL_PACKAGE } from "@dataspecer/core-v2/model/known-models";
import type { PackageService } from "@dataspecer/core-v2/project";
import type { ModelIdentifier } from "@dataspecer/core/model";
import { PROJECT_MODEL_MODEL_ENTITY, type PackageEntity, type ProjectModelEntity } from "./model.ts";

/**
 * Traverses the package tree and returns entities representing the whole project structure.
 */
export async function loadProjectStructure(
  service: PackageService,
  projectId: ModelIdentifier,
): Promise<ProjectModelEntity[]> {
  const allModels: ProjectModelEntity[] = [];
  await loadResource(service, projectId, allModels, new Set());
  return allModels;
}

/**
 * Loads only the main entity of each project, without traversing the package
 * tree.
 *
 * It wont set the subModels property of the returned entities.
 */
export async function loadProjectsMainEntities(
  service: PackageService,
): Promise<ProjectModelEntity[]> {
  const PACKAGE_ROOT = "http://dataspecer.com/packages/local-root";

  const allModels: ProjectModelEntity[] = [];
  let resource = await service.getPackage(PACKAGE_ROOT);

  for (const subResource of resource.subResources || []) {
    const isPackage = subResource.types.includes(LOCAL_PACKAGE);

    if (isPackage) {
      allModels.push({
        id: subResource.iri,
        type: [PROJECT_MODEL_MODEL_ENTITY],
        label: subResource.userMetadata?.label || {},
        description: subResource.userMetadata?.description || {},
        modelType: LOCAL_PACKAGE,
        subModels: [],
      } satisfies PackageEntity as PackageEntity);
    }
  }

  return allModels;
}

async function loadResource(
  service: PackageService,
  resourceId: ModelIdentifier,
  modelsToCollect: ProjectModelEntity[],
  visited: Set<ModelIdentifier>,
): Promise<void> {
  if (visited.has(resourceId)) {
    return;
  }
  visited.add(resourceId);

  let resource = await service.getPackage(resourceId);

  for (const subResource of resource.subResources || []) {
    const isPackage = subResource.types.includes(LOCAL_PACKAGE);

    if (isPackage) {
      await loadResource(service, subResource.iri, modelsToCollect, visited);
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

  // The package's own model may reference other, unrelated packages via
  // `dataStructuresImportPackages` (used for data structure reuse across
  // specifications). These are not part of the sub-resource hierarchy, so
  // they must be loaded explicitly as well.
  const rawPackageData = await service.getResourceJsonData(resourceId) as { dataStructuresImportPackages?: string[] } | undefined;
  for (const importedPackageId of rawPackageData?.dataStructuresImportPackages ?? []) {
    await loadResource(service, importedPackageId, modelsToCollect, visited);
  }
}
