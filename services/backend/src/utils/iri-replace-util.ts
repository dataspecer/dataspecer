import { createDatastoreWithReplacedIris } from "@dataspecer/git";
import { prismaClient, storeModel } from "../main.ts";

/**
 * Takes the values from the {@link resourceReplacementIrisMap} map. And for each resource it replaces all the keys it found from the map by the corresponding value.
 *  So what this does: It changes userMetadata if it contained the iri and the datastores under the resources if they contained the any of the iris to replace.
 */
export async function replaceIrisRecursively(resourceReplacementIrisMap: Record<string, string>) {
  for (const newIri of Object.values(resourceReplacementIrisMap)) {
    const prismaResource = await prismaClient.resource.findFirst({where: {iri: newIri}});
    if (prismaResource === null) {
      throw new Error("Resource to copy not found.");
    }

    for (const [key, store] of Object.entries(JSON.parse(prismaResource.dataStoreId))) {
      const datastoreContentAsJson = await storeModel.getModelStore(store as string).getJson();
      const { datastoreWithReplacedIris } = createDatastoreWithReplacedIris(datastoreContentAsJson, resourceReplacementIrisMap);
      await storeModel.getModelStore(store as string).setJson(datastoreWithReplacedIris);
    }

    const { datastoreWithReplacedIris: convertedMetadata, containedIriToReplace } = createDatastoreWithReplacedIris(prismaResource.userMetadata, resourceReplacementIrisMap);
    if (containedIriToReplace) {
      await prismaClient.resource.update({
        where: {iri: newIri},
        data: {
          userMetadata: convertedMetadata
        }
      });
    }
  }
}