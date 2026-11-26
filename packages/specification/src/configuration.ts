import { V1 } from "@dataspecer/core-v2/model/known-models";
import type { ConfigurationChain } from "@dataspecer/core/configuration";
import type { Entity, EntityRecord } from "@dataspecer/core/entity-model";
import type { ModelIdentifier } from "@dataspecer/core/model";
import { PROJECT_MODEL_ID, type PackageEntity, type ProjectModelEntity } from "@dataspecer/core/project-model";
import type { AllConfiguration } from "./all-configuration.ts";
import { expandSpecificationConfiguration } from "./expand-specification-configuration.ts";

/**
 * For given specification, it returns the full, expanded configuration chain.
 * It does not include the instance-specific configuration, which is stored in
 * the specification itself.
 *
 * @todo Currently we do not support multiple different configurations per
 *  specification, meaning that you can choose how the specification is
 *  generated.
 */
export function getSpecificationConfigurationChain(packageId: string, models: Record<ModelIdentifier, EntityRecord>): ConfigurationChain<AllConfiguration> {
  const projectModel = models[PROJECT_MODEL_ID] as EntityRecord<ProjectModelEntity> | undefined;
  const packageEntity = projectModel?.[packageId] as PackageEntity | undefined;
  const generatorId = packageEntity?.subModels.find((id) => projectModel?.[id]?.modelType === V1.GENERATOR_CONFIGURATION);
  const generatorEntity = generatorId ? models[generatorId]?.[generatorId] : undefined;
  const { id: _id, type: _type, ...generatorConfiguration } = generatorEntity ?? {};
  const packageData = models[packageId]?.[packageId] as (Entity & { configuration?: AllConfiguration }) | undefined;
  return expandSpecificationConfiguration([packageData?.configuration ?? {}, generatorConfiguration]);
}
