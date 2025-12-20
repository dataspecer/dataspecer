import { AvailableFilesystems, convertDatastoreContentBasedOnFormat, getDatastoreInfoOfGivenDatastoreType, GitProvider, isDatastoreForMetadata, ExportMetadataType, ComparisonData, GitIgnore } from "@dataspecer/git";
import { DirectoryNode, FileNode, FilesystemMappingType, FilesystemNode, FilesystemNodeLocation, DatastoreInfo, FilesystemAbstractionBase, FilesystemAbstraction, FileSystemAbstractionFactoryMethod, removeDatastoreFromNode } from "@dataspecer/git";

import fs from "fs";
import { isArtificialExportDirectory } from "../../export.ts";
import { dsPathJoin } from "../../../utils/git-utils.ts";


export class ClassicFilesystem extends FilesystemAbstractionBase {
  /////////////////////////////////////
  // Properties
  /////////////////////////////////////

  private gitIgnore: GitIgnore;

  /////////////////////////////////////
  // Factory method
  /////////////////////////////////////
  public static createFilesystemAbstraction: FileSystemAbstractionFactoryMethod = async (roots: FilesystemNodeLocation[], gitIgnore: GitIgnore | null): Promise<ClassicFilesystem> => {
    if (gitIgnore === null) {
      throw new Error("The filesystem abstractions needs to have git provider.");
    }
    const createdFilesystem = new ClassicFilesystem(gitIgnore);
    await createdFilesystem.initializeFilesystem(roots);
    return createdFilesystem;
  };


  /////////////////////////////////////
  // Constructor
  /////////////////////////////////////

  constructor(gitIgnore: GitIgnore) {
    super();
    this.gitIgnore = gitIgnore;
  }

  /////////////////////////////////////
  // Methods
  /////////////////////////////////////
  public getFilesystemType(): AvailableFilesystems {
    return AvailableFilesystems.ClassicFilesystem;
  }

  protected async createFilesystemMappingRecursive(
    mappedNodeLocation: FilesystemNodeLocation,
    filesystemMapping: FilesystemMappingType,
    parentDirectoryNode: DirectoryNode | null,
  ) {
    const projectIri = mappedNodeLocation.iri;      // Not a mistake! iri is the same as projectIri in case of git (classic filesystem)
                                                    // So also the tree path for iris and projectIris will be the same.
    const fullPath: string = dsPathJoin(mappedNodeLocation.fullPath, projectIri);
    let irisTreePath: string;
    let projectIrisTreePath: string;
    const isArtificialDirectory = isArtificialExportDirectory(projectIri);
    if (isArtificialDirectory) {
      irisTreePath = mappedNodeLocation.irisTreePath;
      projectIrisTreePath = mappedNodeLocation.projectIrisTreePath;
    }
    else {
      irisTreePath = dsPathJoin(mappedNodeLocation.irisTreePath, projectIri);
      projectIrisTreePath = dsPathJoin(mappedNodeLocation.projectIrisTreePath, projectIri);
    }

    if (this.gitIgnore.isIgnoredDirectory(irisTreePath)) {
      return {};
    }

    const _directoryContent = fs.readdirSync(fullPath, { withFileTypes: true });
    const filesInDirectory = _directoryContent.filter(entry => !entry.isDirectory());
    const subDirectories = _directoryContent.filter(entry => entry.isDirectory());
    const directoryContentNames = filesInDirectory.map(content => content.name).filter(name => !this.gitIgnore.isIgnoredFile(name));
    const { datastoreInfoGroupings, invalidNames } = groupByPrefixDSSpecific(fullPath, ...directoryContentNames);


    let parentDirectoryNodeForRecursion: DirectoryNode;
    let directoryContentContainer: FilesystemMappingType;

    if (!isArtificialDirectory) {
      const directoryNodeFilesystemLocation: FilesystemNodeLocation = {
        iri: projectIri,
        fullPath,
        irisTreePath,
        projectIrisTreePath,
      };

      const directoryNode: DirectoryNode = {
        name: projectIri,
        type: "directory",
        metadata: {} as ExportMetadataType,    // We are not using the value in the course of creating the mapping! We set them later
        datastores: [],
        content: {},
        irisTreePath,
        projectIrisTreePath,
      };

      parentDirectoryNodeForRecursion = directoryNode;
      directoryContentContainer = parentDirectoryNodeForRecursion.content;

      // TODO RadStr: It was not here previously however I think that it should be. Because it is missing in the global mapping otherwise
      this.setValueInFilesystemMapping(projectIri, directoryNodeFilesystemLocation, filesystemMapping, directoryNode, parentDirectoryNode);
    }
    else {
      if (parentDirectoryNode === null) {
        throw new Error("Expected parent to be directory node, however it is null"); // TODO RadStr: It could be parentDirectoryNode!
      }

      parentDirectoryNodeForRecursion = parentDirectoryNode;
      directoryContentContainer = filesystemMapping;
    }


    if (invalidNames.length > 0) {
      // TODO RadStr: ... we need to process them anyways, since they might be valid files from git, so the error + TODO node is no longer valid
      for (const invalidName of invalidNames) {
        const newFileSystemNodeLocation: FilesystemNodeLocation = {
          iri: invalidName,
          fullPath: dsPathJoin(fullPath, invalidName),
          irisTreePath: dsPathJoin(irisTreePath, invalidName),
          projectIrisTreePath: dsPathJoin(projectIrisTreePath, invalidName),
        };

        const datastoreInfo: DatastoreInfo = {
          fullName: invalidName,
          afterPrefix: invalidName,
          type: invalidName,
          name: invalidName,
          format: null,
          fullPath: newFileSystemNodeLocation.fullPath
        };
        const newSingleNode: FileNode = {
          name: invalidName,
          type: "file",
          // TODO RadStr: Here I don't know if iri should equal the projectIri
          metadata: { iri: invalidName, types: ["from-git-unknown"], projectIri: invalidName, userMetadata: {} },      // TODO RadStr: I don't know about this.
          // TODO RadStr: the old way
          // datastores: { model: path.join(directory, invalidName) },
          datastores: [datastoreInfo],
          irisTreePath: newFileSystemNodeLocation.irisTreePath,
          projectIrisTreePath: newFileSystemNodeLocation.projectIrisTreePath,
        };

        this.setValueInFilesystemMapping(invalidName, newFileSystemNodeLocation, directoryContentContainer, newSingleNode, parentDirectoryNodeForRecursion);
      }

      // TODO RadStr: Remove commented - no longer valid
      // We just log the error and move on - TODO RadStr: Probably should log a bit better.
      // console.error("Some of the files don't have enough separators. That is they don't follow the format [name].[dataStoreId].[format]", { invalidNames });
    }

    // Shared name here is the name without the postfix (that is the format and type)
    for (const [sharedProjectIri, datastoresForSharedName] of Object.entries(datastoreInfoGroupings)) {
      // TODO RadStr: Previously I tried using map - maybe will get back to it later

      // const datastores: Record<string, string> = {};
      // valuesForPrefix.forEach(datastore => {
      //   datastores[datastore.type] = path.join(directory, datastore.fullName);
      // });

      if (sharedProjectIri === "") {    // Directory data
        const relevantDirectoryNode = this.globalFilesystemMappingForIris[irisTreePath];
        if (relevantDirectoryNode !== undefined) {
          if (Object.values(relevantDirectoryNode.metadata).length === 0) {
            parentDirectoryNodeForRecursion.datastores = parentDirectoryNodeForRecursion.datastores.concat(datastoresForSharedName);
            const newFullPath = fullPath + "/";    // We have to do it explictly, if we use path.join on empty string, it won't do anything with the result.
            if (getMetadataDatastoreFile(parentDirectoryNodeForRecursion.datastores) !== undefined) {
              setMetadata(parentDirectoryNodeForRecursion, newFullPath);
            }
          }
          else {
            throw new Error ("Probably implementation error. Metadata for directory have been already set");
          }
        }
        else {
          throw new Error ("Probably implementation error. Processing metadata for directory, however we have not yet seen the directory");
        }
        continue;
      }

      const newFullPath = dsPathJoin(fullPath, sharedProjectIri);
      const newFullTreePath = dsPathJoin(irisTreePath, sharedProjectIri);
      const newProjectIriFullTreePath = dsPathJoin(projectIrisTreePath, sharedProjectIri);
      const fileNodeLocation: FilesystemNodeLocation = {
        iri: sharedProjectIri,
        fullPath: newFullPath,
        irisTreePath: newFullTreePath,
        projectIrisTreePath: newProjectIriFullTreePath,
      };

      let fileNode: FilesystemNode | undefined = this.globalFilesystemMappingForIris[newFullTreePath];
      if (fileNode === undefined) {
        fileNode = {
          name: sharedProjectIri,
          type: "file",
          metadata: {} as ExportMetadataType,    // We are not using the value in the course of creating the mapping!
          datastores: datastoresForSharedName,
          irisTreePath: fileNodeLocation.irisTreePath,
          projectIrisTreePath: fileNodeLocation.projectIrisTreePath,
        };
        this.setValueInFilesystemMapping(sharedProjectIri, fileNodeLocation, directoryContentContainer, fileNode, parentDirectoryNodeForRecursion);
      }
      else {
        // TODO RadStr: There should be no duplicate - however I don't think that there is a need for check
        fileNode.datastores = fileNode.datastores.concat(datastoresForSharedName);
      }

      if (getMetadataDatastoreFile(fileNode.datastores) !== undefined) {
        setMetadata(fileNode, fileNodeLocation.fullPath);
      }
    }


    for (const subDirectory of subDirectories) {
      const newDirectoryLocation: FilesystemNodeLocation = {
        iri: subDirectory.name,
        fullPath: fullPath,
        irisTreePath,
        projectIrisTreePath,
      };

      await this.createFilesystemMappingRecursive(newDirectoryLocation, directoryContentContainer, parentDirectoryNodeForRecursion);
    }

    return filesystemMapping;
  }

  async getDatastoreContent(irisTreePath: string, type: string, shouldConvertToDatastoreFormat: boolean): Promise<any> {
    const node = this.globalFilesystemMappingForIris[irisTreePath];
    if (node === undefined) {
      throw new Error(`Given datastore in ${irisTreePath} of type ${type} is not present in abstracted filesystem.`);
    }
    const datastore = getDatastoreInfoOfGivenDatastoreType(node, type);

    if (datastore === null) {
      throw new Error(`Given datastore in ${irisTreePath} of type ${type} is not present in abstracted filesystem.`);
    }

    const pathToDatastore = datastore.fullPath;

    const content = fs.readFileSync(pathToDatastore, "utf-8");
    return convertDatastoreContentBasedOnFormat(content, datastore.format, shouldConvertToDatastoreFormat, null);
  }

  createFilesystemMapping(root: FilesystemNodeLocation): Promise<FilesystemMappingType> {
    throw new Error("Method not implemented.");
  }
  async changeDatastore(otherFilesystem: FilesystemAbstraction, changed: ComparisonData): Promise<boolean> {
    const newContent = await otherFilesystem.getDatastoreContent(changed.new!.name, changed.affectedDataStore.type, false);
    return this.updateDatastore(changed.old!, changed.affectedDataStore.type, newContent);
  }
  async removeDatastore(filesystemNode: FilesystemNode, datastoreType: string, shouldRemoveFileWhenNoDatastores: boolean): Promise<boolean> {
    const relevantDatastore = getDatastoreInfoOfGivenDatastoreType(filesystemNode, datastoreType)!;
    // TODO RadStr: ... Looking at it, I think that this method can be implemented only once in base case, if we use the instance methods for removal of datastores/resources
    fs.rmSync(relevantDatastore.fullPath);
    removeDatastoreFromNode(filesystemNode, datastoreType);

    if (shouldRemoveFileWhenNoDatastores) {
      if (filesystemNode.datastores.length === 0) {
        fs.rmSync(filesystemNode.irisTreePath);
        this.removeValueInFilesystemMapping(filesystemNode.name, this.getParentForNode(filesystemNode)!.content);
      }
    }
    return true;          // TODO RadStr: Again returning true only
  }
  async removeFile(filesystemNode: FilesystemNode): Promise<boolean> {
    for (const datastore of filesystemNode.datastores) {
      await this.removeDatastore(filesystemNode, datastore.type, true);
    }
    return true;          // TODO RadStr: Again returning true only
  }
  async updateDatastore(filesystemNode: FilesystemNode, datastoreType: string, content: string): Promise<boolean> {
    const relevantDatastore = getDatastoreInfoOfGivenDatastoreType(filesystemNode, datastoreType)!;
    fs.writeFileSync(relevantDatastore.fullPath, content);
    return true;          // TODO RadStr: Again returning true only
  }
  async createDatastore(parentIriInToBeChangedFilesystem: string, otherFilesystem: FilesystemAbstraction, filesystemNode: FilesystemNode, changedDatastore: DatastoreInfo): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
}




function setMetadata(node: FilesystemNode, directory: string) {
  const metadataDatastore = getMetadataDatastoreFile(node.datastores);
  if (metadataDatastore === undefined) {
    console.error("Metadata datastore is missing, that is there is no .meta file or its equivalent (depending on filesystem)");
    return;
  }
  const fullPath = `${directory}${metadataDatastore.afterPrefix}`;
  node.metadata = constructMetadata(fullPath, metadataDatastore.format, node.metadata);
}

function constructMetadata(metadataFilePath: string, format: string | null, oldCache?: object) {
  oldCache ??= {};
  return {
    ...oldCache,
    ...readMetadataFile(metadataFilePath, format),
  };
}


/**
 * @deprecated Probably once again deprecated - use the filesystem one instead
 */
function readMetadataFile(metadataFilePath: string, format: string | null) {
  const metadata = convertDatastoreContentBasedOnFormat(fs.readFileSync(metadataFilePath, "utf-8"), format, true, null);
  return metadata;
}

function getMetadataDatastoreFile(datastores: DatastoreInfo[]): DatastoreInfo | undefined {
  return datastores.find(datastore => isDatastoreForMetadata(datastore.type));
}




/**
 * Takes the list of names in {@link names} and {@link prefixSeparator}, which you can think of as separator of prefix chunks, which can be joined to create longest prefix.
 * @returns Groups the {@link names} by longest prefix and the invalid names should be in this case probably things, which don't have a single {@link prefixSeparator}.
 *
 * @todo We are using {@link groupDatastoreInfosByName} instead, which is simpler to implement and covers the current use-case
 * @deprecated See todo
 *
 * @example The call of groupByLongestPrefix(".", "hello.svg.json", "hello.model.json", "hell.svg.json", "ahoj.model.json")
 *
 * Returns (not necessary in the following order)
 * {
 *  hello: [ { fullName: hello.svg.json, afterPrefix: .svg.json }, { fullName: hello.model.json, afterPrefix: .model.json } ],
 *  hell: [ { fullName: hell.svg.json, afterPrefix: .svg.json } ],
 *  ahoj: [ { fullName: ahoj.svg.json, afterPrefix: .svg.json } ],
 * }
 */
function groupByLongestPrefix(prefixSeparator: string, ...names: string[]): DatastoreInfosBySharedName {
  throw new Error("Not implented, since it is overkill for current implementatio of DS resources.");
}

type DatastoreInfosBySharedName = {
  /**
   * Groupings by name without the postifx (the type and format ... that is the .type.format)
   */
  datastoreInfoGroupings: Record<string, DatastoreInfo[]>,
  invalidNames: string[],
};

type SplitDatastoreName = {
  basename: string;
  type: string | null;
  format: string | null;
};

/**
 * @returns The type and format from given {@link value}, which is of the following format.
 *
 * [anything][separator][type][separator][format]
 *  So the last two tokens created by {@link separator} and the rest of string are returned. If there is not enough separators the relevant value is null.
 * @example extractModelAndFormat(value="a.b.c.d.e.gh.meta.json", separator=".") returns { basename = "a.b.c.d.e.gh", type = "meta", format = "json" }
 */
function extractTypeAndFormat(value: string, separator: string): SplitDatastoreName {
  let index = value.length + 1;
  let previousIndex = -1;
  let basename: string;
  let type: string | null = null;
  let format: string | null = null;
  for (let i = 0; i < 2; i++) {
    previousIndex = index;
    index = value.lastIndexOf(separator, index - 1);
    if (index === -1) {
      basename = value.substring(0, previousIndex);
      return { basename, type, format };
    }
    if (i === 0) {
      format = value.substring(index + 1);
    }
    else {
      type = value.substring(index + 1, previousIndex);
    }
  }

  basename = value.substring(0, index);
  return { basename, type, format };
}


/**
 * This methods groups datastore infos by their name (name stripped of the suffix - that is the "".format.type")
 *
 * This method takes {@link names}, remove the last {@link postfixCount} chunks, which starts with {@link prefixSeparator}.
 *
 * This method covers current use-case where the files have the following names [name].[dataStoreId].[format], (In the result the datastoreId is stored inside type property)
 *  where dataStoreId is for example "model" or "meta" and format is usually "json" (but in future may be "yaml" or "rdf") and name is currently the iri of resource.
 *  The "." is the {@link prefixSeparator}.
 *
 * TODO RadStr: Maybe should be in some utils.ts file instead, same for the other prefix methods.
 *
 * @param pathToDirectory is the path to directory which contain given {@link names}
 *
 * @returns Groups the {@link names} by same prefix. and invalid values, that is those which don't have at least {@link postfixCount} {@link prefixSeparator}s
 *
 * @example The call of groupByPrefix(".", 2, "hello.svg.json", "hello.model.json", "hell.svg.json", "ahoj.model.json")
 *
 * Returns (not necessary in the following order)
 * {
 *  hello: [ { fullName: hello.svg.json, afterPrefix: .svg.json, type: svg }, { fullName: hello.model.json, afterPrefix: .model.json, type: model } ],
 *  hell: [ { fullName: hell.svg.json, afterPrefix: .svg.json, type: svg } ],
 *  ahoj: [ { fullName: ahoj.svg.json, afterPrefix: .svg.json, type: svg } ],
 * }
 */
function groupDatastoreInfosByName(pathToDirectory: string, prefixSeparator: string, postfixCount: number, ...names: string[]): DatastoreInfosBySharedName {
  // TODO RadStr: Once we will have different layouts of the directories (for example group by type - for each type 1 directory)
  //              We no longer need the grouping - we will just extract the basename and based on that find correct file in filesystem and then insert the datastore info into it
  const invalidNames: string[] = [];
  const datastoreInfoGroupings: Record<string, DatastoreInfo[]> = {};
  names
    .forEach(name => {
      const { basename, type, format } = extractTypeAndFormat(name, prefixSeparator);
      if (format === null || type === null) {     // If format === null then also type === null, this is just so typescript does not complain
        invalidNames.push(basename);
        return null;
      }

      if (datastoreInfoGroupings[basename] === undefined) {
        datastoreInfoGroupings[basename] = [];
      }


      const prefixName: DatastoreInfo = {
        fullName: name,
        afterPrefix: `${prefixSeparator}${type}${prefixSeparator}${format}`,
        type,
        name: basename,
        format,
        fullPath: dsPathJoin(pathToDirectory, name),
      };
      datastoreInfoGroupings[basename].push(prefixName);
    });

  return {
    datastoreInfoGroupings,
    invalidNames
  };
}

/**
 * TODO RadStr: Maybe should be in some utils.ts file instead
 * @returns The index of the {@link n}-th last {@link separator} in given {@link value}. -1 there is not enough separators.
 * @example name = "a.b.c.d", separator = ".", n = 3 returns 1
 */
function findNthlastSeparator(value: string, separator: string, n: number): number {
  let index = value.length + 1;
  for (let i = 0; i < n; i++) {
    index = value.lastIndexOf(separator, index - 1);
    if (index === -1) {
      return -1;
    }
  }

  return index;
}

/**
 * @param pathToDirectory is the path to directory which contain given {@link names}
 * Just calls {@link groupDatastoreInfosByName} with prefixSeparator === "." and postfixCount === 2
 */
function groupByPrefixDSSpecific(pathToDirectory: string, ...names: string[]): DatastoreInfosBySharedName {
  return groupDatastoreInfosByName(pathToDirectory, ".", 2, ...names);
}
