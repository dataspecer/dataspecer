// @ts-ignore cyclic dependency
import type { PackageService } from "@dataspecer/core-v2/project";
import type { ModelIdentifier } from "../model/model.ts";
import { PACKAGE_MODEL, PROJECT_MODEL_MODEL_ENTITY, type PackageEntity, type ProjectModelEntity } from "./model.ts";

/**
 * Identifiers of projects reused by a package, as recorded in the package's
 * own model. Accepts the raw model serialization as well as the entity the
 * model is represented by, as both carry the same properties.
 */
export function getReusedProjectIds(packageModel: object | null | undefined): ModelIdentifier[] {
  return (packageModel as { dataStructuresImportPackages?: ModelIdentifier[] } | null | undefined)?.dataStructuresImportPackages ?? [];
}

/**
 * State shared by one traversal of a project structure.
 */
interface LoadContext {
  service: PackageService;

  entities: ProjectModelEntity[];

  /**
   * Packages that were already traversed. A reused project is thus part of the
   * structure only once, no matter how many packages reuse it, which also
   * keeps the structure free of cycles.
   */
  visited: Set<ModelIdentifier>;
}

/**
 * Traverses the package tree and returns entities representing the whole
 * project structure, including the structure of projects it reuses.
 */
export async function loadProjectStructure(service: PackageService, projectId: ModelIdentifier): Promise<ProjectModelEntity[]> {
  const context: LoadContext = { service, entities: [], visited: new Set() };
  await loadPackage(context, projectId, projectId);
  return context.entities;
}

/**
 * Loads only the main entity of each project, without traversing the package
 * tree.
 *
 * It wont set the subModels property of the returned entities.
 */
export async function loadProjectsMainEntities(service: PackageService): Promise<ProjectModelEntity[]> {
  const PACKAGE_ROOT = "http://dataspecer.com/packages/local-root";

  const allModels: ProjectModelEntity[] = [];
  let resource = await service.getPackage(PACKAGE_ROOT);

  for (const subResource of resource.subResources || []) {
    const isPackage = subResource.types.includes(PACKAGE_MODEL);

    if (isPackage) {
      allModels.push({
        id: subResource.iri,
        type: [PROJECT_MODEL_MODEL_ENTITY],
        label: subResource.userMetadata?.label || {},
        description: subResource.userMetadata?.description || {},
        modelType: PACKAGE_MODEL,
        subModels: [],
        projectId: subResource.iri,
        reusedProjects: [],
      } satisfies PackageEntity as PackageEntity);
    }
  }

  return allModels;
}

/**
 * Collects the package, its content and the projects it reuses. Returns
 * whether the package became part of the structure, i.e. false when it does
 * not exist or was already collected.
 *
 * @param projectId Project the package belongs to.
 */
async function loadPackage(context: LoadContext, packageId: ModelIdentifier, projectId: ModelIdentifier): Promise<boolean> {
  if (context.visited.has(packageId)) {
    return false;
  }
  context.visited.add(packageId);

  const resource = await context.service.getPackage(packageId);
  if (!resource) {
    // The package is referenced but does not exist (anymore), for example a
    // reused project that was deleted. It is simply left out of the structure.
    return false;
  }

  const subModels: ModelIdentifier[] = [];

  for (const subResource of resource.subResources ?? []) {
    if (subResource.types.includes(PACKAGE_MODEL)) {
      if (await loadPackage(context, subResource.iri, projectId)) {
        subModels.push(subResource.iri);
      }
      continue;
    }

    context.entities.push({
      id: subResource.iri,
      type: [PROJECT_MODEL_MODEL_ENTITY],
      label: subResource.userMetadata?.label || {},
      description: subResource.userMetadata?.description || {},
      modelType: subResource.types[0]!,
      projectId,
    } as ProjectModelEntity);
    subModels.push(subResource.iri);
  }

  // Reused projects are not part of the resource tree, they are referenced by
  // the package's own model. They are listed among the sub-packages so that
  // clients that do not know about reuse treat them as any other sub-package.
  const reusedProjects: ModelIdentifier[] = [];
  const rawPackageData = await context.service.getResourceJsonData(packageId);
  for (const reusedProjectId of getReusedProjectIds(rawPackageData as object | null)) {
    if (await loadPackage(context, reusedProjectId, reusedProjectId)) {
      subModels.push(reusedProjectId);
      reusedProjects.push(reusedProjectId);
    }
  }

  const packageEntity: PackageEntity = {
    id: resource.iri,
    type: [PROJECT_MODEL_MODEL_ENTITY],
    label: resource.userMetadata?.label || {},
    description: resource.userMetadata?.description || {},
    modelType: PACKAGE_MODEL,
    subModels,
    projectId,
    reusedProjects,
  };
  context.entities.push(packageEntity);

  return true;
}
