import JSZip from "jszip";
import { ResourceModel } from "../models/resource-model.ts";
import { isArtificialExportDirectory } from "./export.ts";
import { v4 as uuidv4 } from "uuid";
import { PACKAGE_ROOT } from "@dataspecer/git";
import { replaceIrisRecursively } from "../utils/iri-replace-util.ts";


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
  private rootToWrite = PACKAGE_ROOT;
  private inputPathsToCanonicalMapping!: Record<string, string>;
  private canonicalPathsToInputMapping!: Record<string, string>;
  private shouldGenerateNewIris!: boolean;
  private mapToNewIds!: Record<string, string>;

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

  /**
   * Basically the only public method of class. The internal values in class are dependent on calling this method first.
   */
  async doImport(buffer: Buffer, shouldGenerateNewIris: boolean): Promise<string[]> {
    this.shouldGenerateNewIris = shouldGenerateNewIris;
    this.zip = new JSZip();
    this.mapToNewIds = {};
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
    console.info({files});
    for (let rootDirectoryDepth = 2; rootDirectoryDepth <= maxDepth; rootDirectoryDepth++) {
      rootPackagesMeta = files.filter((file) => file.endsWith("/.meta.json") && file.split("/").length === rootDirectoryDepth); // It is a directory with one level
      if (rootPackagesMeta.length > 0) {
        break;
      }
    }
    console.info("rootPackagesMeta", rootPackagesMeta);		// TODO RadStr DEBUG: Debug print
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

    // TODO RadStr DEBUG: Debug print
    console.info("exportVariant", {exportVariant, inputPathsToCanonicalMapping: this.inputPathsToCanonicalMapping});

    const createdPackages = [];
    for (const rootPackageId of rootPackagesIds) {
      const importedRootPackageId: string = rootPackageId + "/";
      const canonicalRootPackageId = this.inputPathsToCanonicalMapping[importedRootPackageId];
      console.info({rootPackageId, canonicalRootPackageId});		// TODO RadStr DEBUG: Debug print

      const iri = await this.importPackage(canonicalRootPackageId, this.rootToWrite);
      createdPackages.push(iri);
    }


    await replaceIrisRecursively(this.mapToNewIds);
    return createdPackages;
  }

  async importPackage(canonicalDirPath: string, parentPackageIri: string): Promise<string> {
    const metaFileName = canonicalDirPath + ".meta.json";
    const metaFileNameOnInput = this.canonicalPathsToInputMapping[metaFileName]
    console.info({metaFileName, metaFileNameOnInput, canonicalDirPath});		// TODO RadStr DEBUG: Debug print
    const metaFile = await this.zip.file(metaFileNameOnInput)!.async("text");     // TODO RadStr: ... what if it is not json
    const meta = JSON.parse(metaFile);

    const thisPackageIri: string = this.createNewIdForResource(meta.iri);

    const projectIri = this.getProjectIriFromMeta(meta, canonicalDirPath);
    await this.resourceModel.createPackage(parentPackageIri, thisPackageIri, meta.userMetadata, projectIri);
    await this.setBlobsForResource(canonicalDirPath, thisPackageIri);

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
    const metaFileNameOnInput = this.canonicalPathsToInputMapping[metaFileName];
    const metaFile = await this.zip.file(metaFileNameOnInput)!.async("text");
    const meta = JSON.parse(metaFile);

    const thisResourceIri = this.createNewIdForResource(meta.iri);
    const projectIri = this.getProjectIriFromMeta(meta, canonicalDirPath);
    await this.resourceModel.createResource(parentPackageIri, thisResourceIri, meta.types[0], meta.userMetadata, projectIri);
    await this.setBlobsForResource(canonicalDirPath, thisResourceIri);
  }

  private getProjectIriFromMeta(meta: any, canonicalDirPath: string): string {
    // This code is basically the reflection of the original export code.
    let projectIri: string;
    if (meta.projectIri !== undefined) {
      projectIri = meta.projectIri;
    }
    else {
      // We check if the iri starts with the path (this probably happens when we perform duplicate).
      let candidateForProjectIri = meta.iri;
      if (candidateForProjectIri.startsWith(canonicalDirPath)) {
        candidateForProjectIri = candidateForProjectIri.slice(canonicalDirPath);
        // If it is empty after that use the original Iri - in the export this resulted into new uuid
        if (candidateForProjectIri.length === 0) {
          candidateForProjectIri = meta.iri;
        }
      }

      if (meta.iri.includes("/")) {
        // / clashes with paths, so we create new projectIri for this
        projectIri = uuidv4();
      }
      else {
        // Just us the candidate - it is either the meta.iri or the sliced
        projectIri = candidateForProjectIri;
      }
    }

    return projectIri;
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

  /**
   * @returns The originalIri if we should not generate new iris, otherwise creates new one and sets the {@link mapToNewIds}.
   */
  private createNewIdForResource(originalIri: string) {
    let thisPackageIri: string;

    if (this.shouldGenerateNewIris) {
      const newId = uuidv4();
      this.mapToNewIds[originalIri] = newId;
      thisPackageIri = newId;
    }
    else {
      thisPackageIri = originalIri;
    }

    return thisPackageIri;
  }
}
