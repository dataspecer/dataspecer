import { LOCAL_PACKAGE } from "@dataspecer/core-v2/model/known-models";
import { ZipStreamDictionary } from "../utils/zip-stream-dictionary.ts";
import { BaseResource, ResourceModel } from "../models/resource-model.ts";
import { v4 as uuidv4 } from 'uuid';
import { currentVersion } from "../tools/migrations/index.ts";
import configuration from "../configuration.ts";
import { MetadataCacheType } from "./export-import-data-api.ts";

export class PackageExporter {
  resourceModel: ResourceModel;
  zipStreamDictionary!: ZipStreamDictionary;

  constructor(resourceModel: ResourceModel) {
    this.resourceModel = resourceModel;
  }

  async doExport(iri: string): Promise<Buffer> {
    this.zipStreamDictionary = new ZipStreamDictionary();
    await this.exportResource(iri, "");
    return await this.zipStreamDictionary.save();
  }

  private async exportResource(iri: string, path: string) {
    const resource = (await this.resourceModel.getResource(iri))!;

    let localNameCandidate = iri;
    if (iri.startsWith(path)) {
      localNameCandidate = iri.slice(path.length);
    }
    if (localNameCandidate.includes("/") || localNameCandidate.length === 0) {
      localNameCandidate = uuidv4();
    }
    let fullName = path + localNameCandidate;

    if (resource.types.includes(LOCAL_PACKAGE)) {
      fullName += "/"; // Create directory

      const pckg = (await this.resourceModel.getPackage(iri))!;

      for (const subResource of pckg.subResources) {
        await this.exportResource(subResource.iri, fullName);
      }
    }

    const metadata = this.constructMetadataFromResource(resource);
    await this.writeBlob(fullName, "meta", metadata);

    for (const [blobName, storeId] of Object.entries(resource.dataStores)) {
      const data = await this.resourceModel.storeModel.getModelStore(storeId).getJson();
      await this.writeBlob(fullName, blobName, data);
    }
  }

  private constructMetadataFromResource(resource: BaseResource): MetadataCacheType {
    return {
      iri: resource.iri,
      types: resource.types,
      userMetadata: resource.userMetadata,
      metadata: resource.metadata,
      _version: currentVersion,
      _exportVersion: 1,
      _exportedAt: new Date().toISOString(),
      _exportedBy: configuration.host,
    };
  }

  private async writeBlob(iri: string, blobName: string, data: object) {
    const stream = this.zipStreamDictionary.writePath(iri + "." + blobName + ".json");
    await stream.write(JSON.stringify(data, null, 2));
    stream.close();
  }
}