import { GitProvider } from "../../../git-providers/git-provider-api.ts";
import { ComparisonData } from "../../../routes/git-webhook-handler.ts";
import { DirectoryNode, FileNode, FilesystemMappingType, FilesystemNode, FilesystemNodeLocation, MetadataCacheType, DatastoreInfo } from "../../export-import-data-api.ts";
import { FilesystemAbstractionBase } from "../filesystem-abstraction-base.ts";
import { FilesystemAbstraction, FileSystemAbstractionFactoryMethod, getMetaPrefixType, removeDatastoreFromNode } from "../filesystem-abstraction.ts";

import fs from "fs";
import * as pathLibrary from "path";
import { isDatastoreForMetadata } from "../../export-new.ts";
import { getDatastoreInfoOfGivenDatastoreType } from "./ds-filesystem.ts";
import { isArtificialExportDirectory } from "../../export-by-resource-type.ts";
import { convertDatastoreBasedOnFormat, dsPathJoin } from "../../../utils/git-utils.ts";


export class ClassicFilesystem extends FilesystemAbstractionBase {
  /////////////////////////////////////
  // Properties
  /////////////////////////////////////

  private gitProvider: GitProvider;

  /////////////////////////////////////
  // Factory method
  /////////////////////////////////////
  public static createFilesystemAbstraction: FileSystemAbstractionFactoryMethod = async (roots: FilesystemNodeLocation[], gitProvider: GitProvider | null): Promise<ClassicFilesystem> => {
    if (gitProvider === null) {
      throw new Error("The filesystem abstractions needs to have git provider.");        // TODO RadStr: Better error handling
    }
    const createdFilesystem = new ClassicFilesystem(gitProvider);
    await createdFilesystem.initializeFilesystem(roots);
    return createdFilesystem;
  };


  /////////////////////////////////////
  // Constructor
  /////////////////////////////////////

  constructor(gitProvider: GitProvider) {
    super();
    this.gitProvider = gitProvider;
  }

  /////////////////////////////////////
  // Methods
  /////////////////////////////////////
  protected async createFilesystemMappingRecursive(
    mappedNodeLocation: FilesystemNodeLocation,
    filesystemMapping: FilesystemMappingType,
    parentDirectoryNode: DirectoryNode | null,
    shouldSetMetadataCache: boolean
  ) {
    const { iri } = mappedNodeLocation;
    const fullPath: string = dsPathJoin(mappedNodeLocation.fullPath, iri);
    let fullTreePath: string;
    const isArtificialDirectory = isArtificialExportDirectory(iri);
    if (isArtificialDirectory) {
      fullTreePath = mappedNodeLocation.fullTreePath;
    }
    else {
      fullTreePath = dsPathJoin(mappedNodeLocation.fullTreePath, iri);
    }

    if (this.shouldIgnoreDirectory(fullTreePath, this.gitProvider)) {      // TODO RadStr: treePath or fullPath? ... I would use treePath
      return {};
    }

    const _directoryContent = fs.readdirSync(fullPath, { withFileTypes: true });
    const filesInDirectory = _directoryContent.filter(entry => !entry.isDirectory());
    const subDirectories = _directoryContent.filter(entry => entry.isDirectory());
    const directoryContentNames = filesInDirectory.map(content => content.name).filter(name => !this.shouldIgnoreFile(name));
    const { prefixGroupings, invalidNames } = groupByPrefixDSSpecific(fullPath, ...directoryContentNames);


    let parentDirectoryNodeForRecursion: DirectoryNode;
    let directoryContentContainer: FilesystemMappingType;

    if (!isArtificialDirectory) {
      const directoryNodeFilesystemLocation: FilesystemNodeLocation = {
        iri,
        fullPath,
        fullTreePath,
      };

      const directoryNode: DirectoryNode = {
        name: iri,
        type: "directory",
        metadataCache: {},
        datastores: [],
        content: {},
        parent: parentDirectoryNode,
        fullTreePath: fullTreePath,
      };

      parentDirectoryNodeForRecursion = directoryNode;
      directoryContentContainer = parentDirectoryNodeForRecursion.content;

      // TODO RadStr: It was not here previously however I think that it should be. Because it is missing in the global mapping otherwise
      this.setValueInFilesystemMapping(directoryNodeFilesystemLocation, filesystemMapping, directoryNode);
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
          fullTreePath: dsPathJoin(fullTreePath, invalidName),
        };

        const prefixName: DatastoreInfo = {
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
          metadataCache: { iri: invalidName },
          // TODO RadStr: the old way
          // datastores: { model: path.join(directory, invalidName) },
          datastores: [prefixName],
          parent: parentDirectoryNodeForRecursion,
          fullTreePath: newFileSystemNodeLocation.fullTreePath,
        };

        this.setValueInFilesystemMapping(newFileSystemNodeLocation, directoryContentContainer, newSingleNode);
      }

      // TODO RadStr: Remove commented - no longer valid
      // We just log the error and move on - TODO RadStr: Probably should log a bit better.
      // console.error("Some of the files don't have enough separators. That is they don't follow the format [name].[dataStoreId].[format]", { invalidNames });
    }

    for (const [prefix, valuesForPrefix] of Object.entries(prefixGroupings)) {
      // TODO RadStr: Previously I tried using map - maybe will get back to it later

      // const datastores: Record<string, string> = {};
      // valuesForPrefix.forEach(datastore => {
      //   datastores[datastore.type] = path.join(directory, datastore.fullName);
      // });

      if (prefix === "") {    // Directory data
        const relevantDirectoryNode = this.globalFilesystemMapping[fullTreePath];
        if (relevantDirectoryNode !== undefined) {
          if (shouldSetMetadataCache && Object.values(relevantDirectoryNode.metadataCache).length === 0) {
            parentDirectoryNodeForRecursion.datastores = parentDirectoryNodeForRecursion.datastores.concat(valuesForPrefix);
            const newFullPath = fullPath + "/";    // We have to do it explictly, if we use path.join on empty string, it won't do anything with the result.
            if (getMetadataDatastoreFile(parentDirectoryNodeForRecursion.datastores) !== undefined) {
              setMetadataCache(parentDirectoryNodeForRecursion, newFullPath, shouldSetMetadataCache);
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

      const newFullPath = dsPathJoin(fullPath, prefix);
      const newFullTreePath = dsPathJoin(fullTreePath, prefix);
      const fileNodeLocation: FilesystemNodeLocation = {
        iri: prefix,
        fullPath: newFullPath,
        fullTreePath: newFullTreePath,
      };

      let fileNode: FilesystemNode | undefined = this.globalFilesystemMapping[newFullTreePath];
      if (fileNode === undefined) {
        fileNode = {
          name: prefix,
          type: "file",
          metadataCache: {},
          datastores: valuesForPrefix,
          parent: parentDirectoryNodeForRecursion,
          fullTreePath: fileNodeLocation.fullTreePath,
        };
        this.setValueInFilesystemMapping(fileNodeLocation, directoryContentContainer, fileNode);
      }
      else {
        // TODO RadStr: There should be no duplicate - however I don't think that there is a need for check
        fileNode.datastores = fileNode.datastores.concat(valuesForPrefix);
      }

      if (getMetadataDatastoreFile(fileNode.datastores) !== undefined) {
        setMetadataCache(fileNode, fileNodeLocation.fullPath, shouldSetMetadataCache);
      }
    }


    for (const subDirectory of subDirectories) {
      const newDirectoryLocation: FilesystemNodeLocation = {
        iri: subDirectory.name,
        fullPath: fullPath,
        fullTreePath: fullTreePath,
      };

      await this.createFilesystemMappingRecursive(newDirectoryLocation, directoryContentContainer, parentDirectoryNodeForRecursion, shouldSetMetadataCache);
    }

    return filesystemMapping;
  }

  async getDatastoreContent(treePath: string, type: string, shouldConvertToDatastoreFormat: boolean): Promise<any> {
    const node = this.globalFilesystemMapping[treePath];
    if (node === undefined) {
      throw new Error(`Given datastore in ${treePath} of type ${type} is not present in abstracted filesystem.`);    // TODO RadStr: Better error handling
    }
    const datastore = getDatastoreInfoOfGivenDatastoreType(node, type);

    if (datastore === undefined) {
      throw new Error(`Given datastore in ${treePath} of type ${type} is not present in abstracted filesystem.`);    // TODO RadStr: Better error handling
    }

    const pathToDatastore = datastore.fullPath;

    const content = fs.readFileSync(pathToDatastore, "utf-8");
    return convertDatastoreBasedOnFormat(content, datastore.format, shouldConvertToDatastoreFormat);
  }

  shouldIgnoreDirectory(directory: string, gitProvider: GitProvider): boolean {
    if (directory.endsWith(".git")) {     // TODO RadStr: Maybe can be better integrated into the ignore file
      return true;
    }
    if (gitProvider.isGitProviderDirectory(directory)) {     // TODO RadStr: Maybe can be better integrated into the ignore file
      return true;
    }

    return false;
  }
  shouldIgnoreFile(file: string): boolean {
    return file === "README.md";
  }

  createFilesystemMapping(root: FilesystemNodeLocation, shouldSetMetadataCache: boolean): Promise<FilesystemMappingType> {
    throw new Error("Method not implemented.");
  }
  async changeDatastore(otherFilesystem: FilesystemAbstraction, changed: ComparisonData, shouldUpdateMetadataCache: boolean): Promise<boolean> {
    const newContent = await otherFilesystem.getDatastoreContent(changed.newVersion!.name, changed.affectedDataStore.type, false);
    return this.updateDatastore(changed.oldVersion!, changed.affectedDataStore.type, newContent);
  }
  async removeDatastore(filesystemNode: FilesystemNode, datastoreType: string, shouldRemoveFileWhenNoDatastores: boolean): Promise<boolean> {
    const relevantDatastore = getDatastoreInfoOfGivenDatastoreType(filesystemNode, datastoreType)!;
    // TODO RadStr: ... Looking at it, I think that this method can be implemented only once in base case, if we use the instance methods for removal of datastores/resources
    fs.rmSync(relevantDatastore.fullPath);
    removeDatastoreFromNode(filesystemNode, datastoreType);

    if (shouldRemoveFileWhenNoDatastores) {
      if (filesystemNode.datastores.length === 0) {
        fs.rmSync(filesystemNode.fullTreePath);
        this.removeValueInFilesystemMapping(filesystemNode.name, filesystemNode.parent!.content);
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
  async createDatastore(otherFilesystem: FilesystemAbstraction, filesystemNode: FilesystemNode, changedDatastore: DatastoreInfo): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
}




function setMetadataCache(node: FilesystemNode, directory: string, shouldSetMetadataCache: boolean) {
  if (shouldSetMetadataCache) {
    const metadataDatastore = getMetadataDatastoreFile(node.datastores);
    if (metadataDatastore === undefined) {
      console.error("Metadata datastore is missing, that is there is no .meta file or its equivalent (depending on filesystem)");
      return;
    }
    const fullPath = `${directory}${metadataDatastore.afterPrefix}`;
    node.metadataCache = constructMetadataCache(fullPath, node.metadataCache);
  }
  // TODO RadStr: Maybe also do something if shouldSetMetadataCache === false
}

function constructMetadataCache(metadataFilePath: string, oldCache?: object) {
  oldCache ??= {};
  return {
    ...oldCache,
    ...readMetadataFile(metadataFilePath),
  };
}


/**
 * @deprecated Probably once again deprecated - use the filesystem instead
 */
function readMetadataFile(metadataFilePath: string) {
  const metadata = JSON.parse(fs.readFileSync(metadataFilePath, "utf-8"));
  return metadata;
}

function getMetadataDatastoreFile(datastores: DatastoreInfo[]): DatastoreInfo | undefined {
  return datastores.find(datastore => isDatastoreForMetadata(datastore.type));
}




/**
 * Takes the list of names in {@link names} and {@link prefixSeparator}, which you can think of as separator of prefix chunks, which can be joined to create longest prefix.
 * @returns Groups the {@link names} by longest prefix and the invalid names should be in this case probably things, which don't have a single {@link prefixSeparator}.
 *
 * @todo We are using {@link groupByPrefix} instead, which is simpler to implement and covers the current use-case
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
function groupByLongestPrefix(prefixSeparator: string, ...names: string[]): PrefixResult {
  throw new Error("Not implented, since it is overkill for current implementatio of DS resources.");
}

type PrefixResult = {
  prefixGroupings: Record<string, DatastoreInfo[]>,
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
function groupByPrefix(pathToDirectory: string, prefixSeparator: string, postfixCount: number, ...names: string[]): PrefixResult {
  // TODO RadStr: Once we will have different layouts of the directories (for example group by type - for each type 1 directory)
  //              We no longer need the grouping - we will just extract the basename and based on that find correct file in filesystem and then insert the datastore info into it
  const invalidNames: string[] = [];
  const prefixGroupings: Record<string, DatastoreInfo[]> = {};
  names
    .forEach(name => {
      const { basename, type, format } = extractTypeAndFormat(name, prefixSeparator);
      if (format === null || type === null) {     // If format === null then also type === null, this is just so typescript does not complain
        invalidNames.push(basename);
        return null;
      }

      if (prefixGroupings[basename] === undefined) {
        prefixGroupings[basename] = [];
      }


      const prefixName: DatastoreInfo = {
        fullName: name,
        afterPrefix: `${prefixSeparator}${type}${prefixSeparator}${format}`,
        type,
        name: basename,
        format,
        fullPath: dsPathJoin(pathToDirectory, name),
      };
      prefixGroupings[basename].push(prefixName);
    });

  return {
    prefixGroupings,
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
 * Just calls {@link groupByPrefix} with prefixSeparator === "." and postfixCount === 2
 */
function groupByPrefixDSSpecific(pathToDirectory: string, ...names: string[]): PrefixResult {
  return groupByPrefix(pathToDirectory, ".", 2, ...names);
}
