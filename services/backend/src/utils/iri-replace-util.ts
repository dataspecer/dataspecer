import { convertDatastoreContentBasedOnFormat, createDatastoreWithReplacedIris, stringifyDatastoreContentBasedOnFormat } from "@dataspecer/git";
import { LocalStoreModel } from "../models/local-store-model.ts";
import { Prisma, PrismaClient } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/index.js";

/**
 * @todo Create better interface/type for the {@link storageApi}, it just need the update and find method and not be exactly of type prisma.
 */
export type StorageApi = PrismaClient<Prisma.PrismaClientOptions, never, Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined, DefaultArgs>;

/**
 * Takes the values from the {@link resourceReplacementIrisMap} map. And for each resource it replaces all the keys it found from the map by the corresponding value.
 *  So what this does: It changes userMetadata if it contained the iri and the datastores under the resources if they contained the any of the iris to replace.
 */
export async function replaceIrisRecursively(
  resourceReplacementIrisMap: Record<string, string>,
  localStoreModel: LocalStoreModel,
  storageApi: StorageApi,
) {
  for (const newIri of Object.values(resourceReplacementIrisMap)) {
    const prismaResource = await storageApi.resource.findFirst({where: {iri: newIri}});
    if (prismaResource === null) {
      throw new Error("Resource to copy not found.");
    }

    for (const [key, store] of Object.entries(JSON.parse(prismaResource.dataStoreId))) {
      const datastoreContentAsJson = await localStoreModel.getModelStore(store as string).getJson();
      const { datastoreWithReplacedIris } = createDatastoreWithReplacedIris(datastoreContentAsJson, resourceReplacementIrisMap);
      await localStoreModel.getModelStore(store as string).setJson(datastoreWithReplacedIris);
    }

    const metadataAsJson = convertDatastoreContentBasedOnFormat(prismaResource.userMetadata, "json", true, null);
    const { datastoreWithReplacedIris: convertedMetadata, containedIriToReplace } = createDatastoreWithReplacedIris(metadataAsJson, resourceReplacementIrisMap);
    const stringifiedConvertedMetadata = stringifyDatastoreContentBasedOnFormat(convertedMetadata, "json", true);
    if (containedIriToReplace) {
      await storageApi.resource.update({
        where: {iri: newIri},
        data: {
          userMetadata: stringifiedConvertedMetadata,
        }
      });
    }
  }
}