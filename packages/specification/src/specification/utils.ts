import type { EntityRecord } from "@dataspecer/core/entity-model";
import type { ModelIdentifier } from "@dataspecer/core/model";
import type { ModelEntity, PackageEntity } from "@dataspecer/project-model";
import { getDataSpecification } from "./adapter.ts";
import { DataSpecification } from "./model.ts";

const PROJECT_MODEL_ID: ModelIdentifier = "_project_model";

/**
 * Loads a data specification for structure modeling. This means loading all
 * semantic models and structure models, including configuration and all
 * imported data specifications.
 *
 * @todo Currently there are two ways how to "reference" specifications. One is
 * via explicit `importsDataSpecificationIds`, the other is via sub-packages.
 * This is due to historical reasons. The correct way is to use sub-packages.
 */
export function loadDataSpecifications(rootDataSpecificationId: ModelIdentifier, models: Record<ModelIdentifier, EntityRecord>): Record<string, DataSpecification> {
  const dataSpecifications: { [iri: string]: DataSpecification } = {};

  const projectModel = models[PROJECT_MODEL_ID] as EntityRecord<ModelEntity>;

  const specificationToLoad = [rootDataSpecificationId];

  for (let i = 0; i < specificationToLoad.length; i++) {
    const specificationId = specificationToLoad[i]!;
    if (dataSpecifications[specificationId]) {
      // This specification is already loaded, so we can skip it
      continue;
    }
    const specificationPackageEntity = projectModel[specificationId] as PackageEntity;

    const specification = getDataSpecification(specificationId, projectModel, models[specificationId] ?? (null as EntityRecord | null));

    if (specification?.dataStructures.length === 0 && specificationId !== rootDataSpecificationId) {
      // This specification is empty, so we can safely skip it
      continue;
    }

    if (specification) {
      dataSpecifications[specificationId] = specification;

      /**
       * @todo Individual packages should not be used to find imports. This should
       * be the correct way that one "package" is hidden under the other. Of
       * course, we can then employ something like symbolic links to point to
       * other specifications, but this would be considered as explicit hack.
       */
      specificationToLoad.push(...specification.importsDataSpecificationIds);
      specificationToLoad.push(...(specificationPackageEntity.subModels ?? []));
    }
  }

  return dataSpecifications;
}
