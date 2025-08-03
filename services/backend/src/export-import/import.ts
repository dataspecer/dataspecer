import JSZip from "jszip";
import { ResourceModel } from "../models/resource-model.ts";
import { isArtificialExportDirectory } from "./export-by-resource-type.ts";


const FILE_EXTENSION_REGEX = /^\.([-0-9a-zA-Z]+)\.json$/;
const RESOURCE_IN_PACKAGE_REGEX = /^([-0-9a-zA-Z]+)\.meta\.json$/;
const PACKAGES_IN_PACKAGE_REGEX = /^([-0-9a-zA-Z]+\/)\.meta\.json/;

type ImportMapping = {
  canonicalToImported: Record<string, string>,
  importedToCanonical: Record<string, string>,
};

export class PackageImporter {
  private readonly resourceModel: ResourceModel;
  private zip!: JSZip;
  private rootToWrite = "http://dataspecer.com/packages/local-root";
  private inputPathsToCanonicalMapping!: Record<string, string>;    // TODO RadStr: Hack with ! - Also I am not sure what should be instance methods and what not when it comes to creation of the mapping
  private canonicalPathsToInputMapping!: Record<string, string>;    // TODO RadStr: Hack with ! - Also I am not sure what should be instance methods and what not when it comes to creation of the mapping

  constructor(resourceModel: ResourceModel) {
    this.resourceModel = resourceModel;
  }

  private mapTypeImportToCanonical(inputMapping: Record<string, JSZip.JSZipObject>): ImportMapping {
    const importedToCanonical: Record<string, string> = {};
    const canonicalToImported: Record<string, string> = {};

    const inputPaths = Object.keys(inputMapping);
    for (const inputPath of inputPaths) {
      let outputPath = "";
      const pathSplits = inputPath.split("/");
      const splitCount = pathSplits.length;
      let currentSplit = 0;
      let currentInputPath = "";
      for (const pathSplit of pathSplits) {
        if(currentSplit > 0) {
          currentInputPath += "/";
        }
        currentSplit++;
        currentInputPath += pathSplit;
        if (isArtificialExportDirectory(pathSplit)) {
          continue;
        }

        if (outputPath.length > 0) {
          outputPath += "/";
        }
        outputPath += pathSplit;
        if(currentSplit < splitCount) {
          importedToCanonical[currentInputPath] = outputPath;
          canonicalToImported[outputPath] = currentInputPath;
        }
      }

      if (inputPath.endsWith("/") && !outputPath.endsWith("/")) {
        outputPath += "/";
      }
      importedToCanonical[inputPath] = outputPath;
      canonicalToImported[outputPath] = inputPath;
    }


    return {
      importedToCanonical,
      canonicalToImported,
    };
  }

  private mapCanonicalToCanonical(inputMapping: Record<string, JSZip.JSZipObject>): ImportMapping {
    const importedToCanonical: Record<string, string> = {};
    importedToCanonical[""] = "";     // I don't think this is needed, but just in case

    const inputPaths = Object.keys(inputMapping);
    for (const inputPath of inputPaths) {
      importedToCanonical[inputPath] = inputPath;
      const inputPathSplits = inputPath.split("/");
      let pathAccumulator = "";
      for (const inputPathSplit of inputPathSplits) {
        pathAccumulator += `${inputPathSplit}/`;
        importedToCanonical[pathAccumulator] = pathAccumulator;
      }
    }

    return {
      importedToCanonical,
      canonicalToImported: {...importedToCanonical},
    };
  }

  // TODO RadStr: Just use the string[] instead of the Record<> for inputMapping
  private createImportMappingToCanonical(exportVariant: number, inputMapping: Record<string, JSZip.JSZipObject>): ImportMapping {
    switch(exportVariant) {
      case 1:
        return this.mapCanonicalToCanonical(inputMapping);
      case 2:
        return this.mapTypeImportToCanonical(inputMapping);
      default:
        throw new Error("Unknown export type, maybe you forgot to extend switch");
    }
  }

  async doImport(buffer: Buffer): Promise<string[]> {
    this.zip = new JSZip();
    await this.zip.loadAsync(buffer);

    const files = Object.keys(this.zip.files);

    let maxDepth = -1;
    files.forEach(file => {
      const depth = file.split("/").length;
      if (depth > maxDepth) {
        maxDepth = depth;
      }
    });

    let rootPackagesMeta: string[] = [];
    for (let rootDirectoryDepth = 2; rootDirectoryDepth <= maxDepth; rootDirectoryDepth++) {
      rootPackagesMeta = files.filter((file) => file.endsWith("/.meta.json") && file.split("/").length === rootDirectoryDepth); // It is a directory with one level
      if (rootPackagesMeta.length > 0) {
        break;
      }
    }
    console.info("rootPackagesMeta", rootPackagesMeta);		// TODO RadStr: Debug print
    const rootPackagesIds = rootPackagesMeta.map((file) => {
      const splitBetweenIdAndType = file.lastIndexOf("/");
      return file.substring(0, splitBetweenIdAndType);
    });

    const rootMetaFile = await this.zip.file(rootPackagesMeta[0])!.async("text");
    const rootMetaAsJSON = JSON.parse(rootMetaFile);
    const exportVariant: number = rootMetaAsJSON["_exportVersion"];
    const mappings = this.createImportMappingToCanonical(exportVariant, this.zip.files);
    this.canonicalPathsToInputMapping = mappings.canonicalToImported;
    this.inputPathsToCanonicalMapping = mappings.importedToCanonical;

    // TODO RadStr: Debug print
    console.info("exportVariant", {exportVariant, inputPathsToCanonicalMapping: this.inputPathsToCanonicalMapping});

    const createdPackages = [];
    for (const rootPackageId of rootPackagesIds) {
      const importedRootPackageId: string = rootPackageId + "/";
      const canonicalRootPackageId = this.inputPathsToCanonicalMapping[importedRootPackageId];
      console.info({rootPackageId, canonicalRootPackageId});		// TODO RadStr: Debug print

      const iri = await this.importPackage(canonicalRootPackageId, this.rootToWrite);
      createdPackages.push(iri);
    }
    return createdPackages;
  }


  async importPackage(canonicalDirPath: string, parentPackageIri: string): Promise<string> {
    const metaFileName = canonicalDirPath + ".meta.json";
    const metaFileNameOnInput = this.canonicalPathsToInputMapping[metaFileName]
    console.info({metaFileName, metaFileNameOnInput, canonicalDirPath});		// TODO RadStr: Debug print
    const metaFile = await this.zip.file(metaFileNameOnInput)!.async("text");
    const meta = JSON.parse(metaFile);

    await this.resourceModel.createPackage(parentPackageIri, meta.iri, meta.userMetadata);
    await this.setBlobsForResource(canonicalDirPath, meta.iri);
    const thisPackageIri = meta.iri;

    for (const file of Object.keys(this.zip.files)) {
      const fileCanonicalPath = this.inputPathsToCanonicalMapping[file];

      if (!fileCanonicalPath.startsWith(canonicalDirPath)) {
        continue;
      }
      const restPath = fileCanonicalPath.substring(canonicalDirPath.length);

      const resourceFileName = RESOURCE_IN_PACKAGE_REGEX.exec(restPath)?.[1];
      if (resourceFileName) {
        await this.importResource(canonicalDirPath + resourceFileName, thisPackageIri);
      }

      const packageFileName = PACKAGES_IN_PACKAGE_REGEX.exec(restPath)?.[1];
      if (packageFileName) {
        await this.importPackage(canonicalDirPath + packageFileName, thisPackageIri);
      }
    }

    return thisPackageIri;
  }

  /**
   * From file name prefix creates resource (not directory) as a child of parentPackageIri.
   */
  async importResource(canonicalDirPath: string, parentPackageIri: string) {
    const metaFileName = canonicalDirPath + ".meta.json";
    const metaFileNameOnInput = this.canonicalPathsToInputMapping[metaFileName]
    const metaFile = await this.zip.file(metaFileNameOnInput)!.async("text");
    const meta = JSON.parse(metaFile);

    await this.resourceModel.createResource(parentPackageIri, meta.iri, meta.types[0], meta.userMetadata);
    await this.setBlobsForResource(canonicalDirPath, meta.iri);
  }

  /**
   * For given exiting resource by its IRI sets all blobs found in the zip.
   * For example this would be a typical store: resourcePath + ".model.json"
   */
  async setBlobsForResource(canonicalResourcePath: string, resourceIri: string) {
    const files = Object.keys(this.zip.files);

    for (const file of files) {
      const fileCanonicalPath = this.inputPathsToCanonicalMapping[file];

      if (!fileCanonicalPath.startsWith(canonicalResourcePath)) {
        continue;
      }

      const restChunk = fileCanonicalPath.substring(canonicalResourcePath.length);
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
