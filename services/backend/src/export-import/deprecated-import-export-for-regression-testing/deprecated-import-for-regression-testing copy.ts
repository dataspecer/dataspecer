import JSZip from "jszip";
import { ResourceModel } from "../../models/resource-model.ts";
import { ResourceModelForImport } from "../import.ts";

const FILE_EXTENSION_REGEX = /^\.([-0-9a-zA-Z]+)\.json$/;
const RESOURCE_IN_PACKAGE_REGEX = /^([-0-9a-zA-Z]+)\.meta\.json$/;
const PACKAGES_IN_PACKAGE_REGEX = /^([-0-9a-zA-Z]+\/)\.meta\.json/;

/**
 * @deprecated This is the previous exporter before we have implemented new version for Git, which uses the filesystem trees. This is used for regression testing.
 */
export class PackageImporterDeprecated {
  private readonly resourceModel: ResourceModelForImport;
  private zip!: JSZip;
  private rootToWrite = "http://dataspecer.com/packages/local-root";

  constructor(resourceModel: ResourceModelForImport) {
    this.resourceModel = resourceModel;
  }

  async doImport(buffer: Buffer): Promise<string[]> {
    this.zip = new JSZip();
    await this.zip.loadAsync(buffer);

    const files = Object.keys(this.zip.files);

    const rootPackagesMeta = files.filter((file) => file.endsWith("/.meta.json") && file.split("/").length === 2); // It is a directory with one level
    const rootPackagesIds = rootPackagesMeta.map((file) => file.split("/")[0]);

    const createdPackages = [];
    for (const rootPackageId of rootPackagesIds) {
      const iri = await this.importPackage(rootPackageId + "/", this.rootToWrite);
      createdPackages.push(iri);
    }
    return createdPackages;
  }

  async importPackage(dirPath: string, parentPackageIri: string): Promise<string> {
    const metaFileName = dirPath + ".meta.json";
    const metaFile = await this.zip.file(metaFileName)!.async("text");
    const meta = JSON.parse(metaFile);

    await this.resourceModel.createPackage(parentPackageIri, meta.iri, meta.userMetadata);
    await this.setBlobsForResource(dirPath, meta.iri);
    const thisPackageIri = meta.iri;

    for (const file of Object.keys(this.zip.files)) {
      if (!file.startsWith(dirPath)) {
        continue;
      }
      const restPath = file.substring(dirPath.length);

      const resourceFileName = RESOURCE_IN_PACKAGE_REGEX.exec(restPath)?.[1];
      if (resourceFileName) {
        await this.importResource(dirPath + resourceFileName, thisPackageIri);
      }

      const packageFileName = PACKAGES_IN_PACKAGE_REGEX.exec(restPath)?.[1];
      if (packageFileName) {
        await this.importPackage(dirPath + packageFileName, thisPackageIri);
      }
    }

    return thisPackageIri;
  }

  /**
   * From file name prefix creates resource (not directory) as a child of parentPackageIri.
   */
  async importResource(dirPath: string, parentPackageIri: string) {
    const metaFileName = dirPath + ".meta.json";
    const metaFile = await this.zip.file(metaFileName)!.async("text");
    const meta = JSON.parse(metaFile);

    await this.resourceModel.createResource(parentPackageIri, meta.iri, meta.types[0], meta.userMetadata);
    await this.setBlobsForResource(dirPath, meta.iri);
  }

  /**
   * For given exiting resource by its IRI sets all blobs found in the zip.
   * For example this would be a typical store: resourcePath + ".model.json"
   */
  async setBlobsForResource(resourcePath: string, resourceIri: string) {
    const files = Object.keys(this.zip.files);

    for (const file of files) {
      if (!file.startsWith(resourcePath)) {
        continue;
      }

      const restChunk = file.substring(resourcePath.length);
      const matches = FILE_EXTENSION_REGEX.exec(restChunk);
      if (matches) {
        const blobName = matches[1];

        // meta is a special for metadata, it is not a store per se
        if (blobName === "meta") {
          continue;
        }

        const blob = await this.zip.file(file)!.async("text");
        const blobJson = JSON.parse(blob);

        const store = await this.resourceModel.getOrCreateResourceModelStore(resourceIri, blobName);
        await store.setJson(blobJson);
      }
    }
  }
}