import type { ModelIdentifier } from "@dataspecer/core/model";
import type { Configuration, ConfigurationChain } from "@dataspecer/core/configuration";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import { PROJECT_MODEL_ID, type PackageEntity, type ProjectModelEntity } from "@dataspecer/core/project-model";
import { V1 } from "@dataspecer/core-v2/model/known-models";

/**
 * It returns the configuration chain that that is specific for the given
 * specification. This means that concatenating the instance-specific
 * configuration with this chain should produce the final configuration for
 * generating artifacts and interpreting the specification.
 *
 * @todo Currently we do not support multiple different configurations per
 *  specification, meaning that you can choose how the specification is
 *  generated.
 */
export function getSpecificationConfigurationChain(
  packageId: string,
  models: Record<ModelIdentifier, EntityRecord>,
): ConfigurationChain {
  const projectModel = models[PROJECT_MODEL_ID] as EntityRecord<ProjectModelEntity> | undefined;
  const packageEntity = projectModel?.[packageId] as PackageEntity | undefined;
  const generatorId = packageEntity?.subModels.find(id => projectModel?.[id]?.modelType === V1.GENERATOR_CONFIGURATION);
  const generatorEntity = generatorId ? models[generatorId]?.[generatorId] : undefined;
  const { id: _id, type: _type, ...generatorConfiguration } = generatorEntity ?? {};
  const packageData = models[packageId]?.[packageId] as any; // Todo missing type for package data.
  return [(packageData?.configuration ?? {}) as Configuration, generatorConfiguration];
}
