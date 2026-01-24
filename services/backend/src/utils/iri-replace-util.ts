import { convertDatastoreContentBasedOnFormat, createDatastoreWithReplacedIris, stringifyDatastoreContentBasedOnFormat } from "@dataspecer/git";
import { LocalStoreModelGetter } from "../models/local-store-model.ts";
import { Prisma, PrismaClient } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/index.js";

type PrismaClientType = PrismaClient<Prisma.PrismaClientOptions, never, Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined, DefaultArgs>;

export type ResourceToFindWhenReplacingIri = {
  iri: string;
  dataStoreId: string;
  userMetadata: string;
}

export interface StorageApiForIriReplacement {
  findResource(iri: string): Promise<ResourceToFindWhenReplacingIri | null>;
  updateResource(iri: string, newUserMetadata: string): Promise<void>;
};

export class PrismaClientStorageApiForIriReplacement implements StorageApiForIriReplacement {
  private prismaClientForStorage: PrismaClientType;

  constructor(prismaClientForStorage: PrismaClientType) {
    this.prismaClientForStorage = prismaClientForStorage;
  }


  async findResource(iri: string): Promise<ResourceToFindWhenReplacingIri | null> {
    const prismaResource = await this.prismaClientForStorage.resource.findFirst({where: {iri}});
    return prismaResource;
  }

  async updateResource(iri: string, newUserMetadata: string): Promise<void> {
    await this.prismaClientForStorage.resource.update({
      where: {iri},
      data: {
        userMetadata: newUserMetadata,
      }
    });
    return;
  }
}


/**
 * Takes the values from the {@link resourceReplacementIrisMap} map. And for each resource it replaces all the keys it found from the map by the corresponding value.
 *  So what this does: It changes userMetadata if it contained the iri and the datastores under the resources if they contained the any of the iris to replace.
 */
export async function replaceIrisRecursively(
  resourceReplacementIrisMap: Record<string, string>,
  localStoreModel: LocalStoreModelGetter,
  storageApi: StorageApiForIriReplacement,
) {
  for (const newIri of Object.values(resourceReplacementIrisMap)) {
    const prismaResource = await storageApi.findResource(newIri);
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
      storageApi.updateResource(newIri, stringifiedConvertedMetadata);
    }
  }
}