import { LOCAL_PACKAGE } from "@dataspecer/core-v2/model/known-models";
import type { PackageService } from "@dataspecer/core-v2/project";
import type { ModelIdentifier } from "@dataspecer/core/model";
import type { ModelEntity, PackageEntity } from "./model.ts";

/**
 * Traverses the package tree and returns entities representing the whole project structure.
 */
export async function loadProjectStructure(
  service: PackageService,
  projectId: ModelIdentifier,
): Promise<ModelEntity[]> {
  const [_, allModels] = await recursivelyLoadPackage(service, projectId);
  return allModels;
}

async function recursivelyLoadPackage(
  service: PackageService,
  packageId: ModelIdentifier,
): Promise<[PackageEntity, ModelEntity[]]> {
  const pckg = await service.getPackage(packageId);
  const subResources = pckg.subResources ?? [];

  const allModels: ModelEntity[] = [];
  const subModels: ModelEntity[] = [];

  for (const subResource of subResources) {
    if (!subResource.types.includes(LOCAL_PACKAGE)) {
      continue;
    }

    const [subPackage, nestedModels] = await recursivelyLoadPackage(service, subResource.iri);
    allModels.push(...nestedModels);
    subModels.push(subPackage);
  }

  const packageEntity: PackageEntity = {
    id: pckg.iri,
    type: [],
    label: pckg.userMetadata?.label || {},
    description: pckg.userMetadata?.description || {},
    modelType: LOCAL_PACKAGE,
    subModels: subModels.map(model => model.id),
  };
  allModels.push(packageEntity);
  return [packageEntity, allModels];
}
