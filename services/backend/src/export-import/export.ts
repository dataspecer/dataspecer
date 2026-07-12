import { LOCAL_PACKAGE } from "@dataspecer/core-v2/model/known-models";
import { ZipStreamDictionary } from "../utils/zip-stream-dictionary.ts";
import { BaseResource } from "../models/resource-model.ts";
import { ModelRepository } from "../models/model-repository.ts";
import { currentVersion } from "../tools/migrations/index.ts";
import configuration from "../configuration.ts";
import crypto from 'node:crypto';

export class PackageExporter {
  modelRepository: ModelRepository;
  zipStreamDictionary!: ZipStreamDictionary;

  constructor(modelRepository: ModelRepository) {
    this.modelRepository = modelRepository;
  }

  async doExport(iri: string): Promise<Buffer> {
    this.zipStreamDictionary = new ZipStreamDictionary();
    await this.exportResource(iri, "");
    return await this.zipStreamDictionary.save();
  }

  private async exportResource(iri: string, path: string) {
    const resource = (await this.modelRepository.getResource(iri))!;

    let localNameCandidate = iri;
    if (iri.startsWith(path)) {
      localNameCandidate = iri.slice(path.length);
    }
    if (localNameCandidate.includes("/") || localNameCandidate.length === 0) {
      localNameCandidate = crypto.hash('sha1', iri);
    }
    let fullName = path + localNameCandidate;

    if (resource.types.includes(LOCAL_PACKAGE)) {
      fullName += "/"; // Create directory

      const pckg = (await this.modelRepository.getPackage(iri))!;

      for (const subResource of pckg.subResources) {
        await this.exportResource(subResource.iri, fullName);
      }
    }

    const metadata = this.constructMetadataFromResource(resource);
    await this.writeBlob(fullName, "meta", metadata);

    for (const blobName of Object.keys(resource.dataStores)) {
      const data = await this.modelRepository.getResourceStoreJson(iri, blobName);
      await this.writeBlob(fullName, blobName, data);
    }
  }

  private constructMetadataFromResource(resource: BaseResource): object {
    return {
      iri: resource.iri,
      types: resource.types,
      userMetadata: resource.userMetadata,
      metadata: resource.metadata,
      _version: currentVersion,
      _exportVersion: 1,
      _exportedAt: new Date().toISOString(),
      _exportedBy: configuration.host,
    }
  }

  private async writeBlob(iri: string, blobName: string, data: object) {
    const stream = this.zipStreamDictionary.writePath(iri + "." + blobName + ".json");
    await stream.write(JSON.stringify(data, null, 2));
    stream.close();
  }
}