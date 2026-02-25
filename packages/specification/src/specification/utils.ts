import { LOCAL_PACKAGE } from "@dataspecer/core-v2/model/known-models";
import { ModelRepository } from "../model-repository/model-repository.ts";
import { getDataSpecification } from "./adapter.ts";
import { DataSpecification } from "./model.ts";

/**
 * Loads a data specification for structure modeling. This means loading all
 * semantic models and structure models, including configuration and all
 * imported data specifications.
 *
 * @todo Currently there are two ways how to "reference" specifications. One is
 * via explicit `importsDataSpecificationIds`, the other is via sub-packages.
 * This is due to historical reasons. The correct way is to use sub-packages.
 */
export async function loadDataSpecifications(dataSpecificationIri: string, modelRepository: ModelRepository): Promise<Record<string, DataSpecification>> {
  const dataSpecificationIrisToLoad = [dataSpecificationIri];
  const dataSpecifications: { [iri: string]: DataSpecification } = {};

  for (let i = 0; i < dataSpecificationIrisToLoad.length; i++) {
    const dsIriToProcess = dataSpecificationIrisToLoad[i]!;

    const model = await modelRepository.getModelById(dsIriToProcess);
    const packageModel = await model?.asPackageModel();
    const dataSpecification = packageModel ? await getDataSpecification(packageModel) : undefined;

    if (dataSpecification?.dataStructures.length === 0 && dsIriToProcess !== dataSpecificationIri) {
      // This specification is empty, so we can safely skip it
      continue;
    }

    if (dataSpecification) {
      dataSpecifications[dsIriToProcess] = dataSpecification;
      dataSpecification.importsDataSpecificationIds.forEach((importIri) => {
        if (!dataSpecificationIrisToLoad.includes(importIri)) {
          dataSpecificationIrisToLoad.push(importIri);
        }
      });
    }

    /**
     * @todo Individual packages should not be used to find imports. This should
     * be the correct way that one "package" is hidden under the other. Of
     * course, we can then employ something like symbolic links to point to
     * other specifications, but this would be considered as explicit hack.
     */
    if (packageModel) {
      const subResources = await packageModel.getSubResources();
      for (const subResource of subResources) {
        if (subResource.types.includes(LOCAL_PACKAGE)) {
          // This is a sub-specification
          dataSpecificationIrisToLoad.push(subResource.id);
        }
      }
    }
  }

  return dataSpecifications;
}