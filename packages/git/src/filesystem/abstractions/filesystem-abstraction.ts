// TODO RadStr: Think of better names and the name of the property and of type should be aligned

import { GitProvider } from "../../git-provider-api.ts";
import { DirectoryNode, FileNode, FilesystemMappingType, FilesystemNode, FilesystemNodeLocation, MetadataCacheType, DatastoreInfo } from "../../export-import-data-api.ts";
import { ComparisonData } from "../../diff-types.ts";


export enum AvailableFilesystems {
  DS_Filesystem = "ds-filesystem",
  ClassicFilesystem = "classic-filesystem",
}


/**
 * This interface represents abstraction over system with data. The name contains filesystem, since we can think of it as abstraction over filesystem, but
 *  it isn't entirely true. So what is it:
 *  When we clone git repository, we get representation of package in the filesystem. Basically it looks like if we performed export to file and then unzip the file into filesystem.
 *  However when we have the package stored in the DS system. Part of it is stored inside the database and other part (blobs) is stored in the filesystem. So we would like to
 *  unify these 2 different representations into one data structure {@link FilesystemMappingType} and together with that create interface with basic functionality over the "filesystem" representations.
 *  Also Note that each implmentation should have exactly one root. And it should be "fake" root,
 *   that is so we don't have any edge cases if we have more root directories in the first filesystem level.
 */
export interface FilesystemAbstraction {

  /**
   * This method behaves basically like constructor. It should initialize the filesystem with given {@link filesystemRoots}.
   * By nature of filesystems, this method is asynchronous.
   * @param filesystemRoots are roots which will be placed under the fake root.
   */
  initializeFilesystem(filesystemRoots: FilesystemNodeLocation[]): Promise<void>;

  /**
   * @deprecated Deprecated variant, we return the nodes instead ... just remove it once I finish the API. or maybe remove the other variant?
   * @returns Returns the content of {@link directory}. In case of filesystem it is names of files and directories, in case of DS filesystem it is the IRIs of resources inside.
   */
  readDirectoryOldVariant(directory: string): string[];

  /**
   * @returns Returns the content of {@link directory}.
   */
  readDirectory(directory: string): FilesystemNode[];

  /**
   * @param name is the name of the resource. It is either IRI or full path depending on filesystem.
   * @returns True if the given resource is directory, false otherwise
   */
  isDirectory(name: string): boolean;

  /**
   * Extends the {@link filesystemAbstractionObject} by content inside {@link directory} (with last part explicitly copied in {@link basename} - path/to/dir/basename) and if
   *  {@link shouldExtendWithMetadata} is true, then also extends the object by metadata (if we are in filesystem, it means that the .meta file has to be loaded).
   */
  extendFilesystemAbstractionObjectByDirectory(filesystemAbstractionObject: FilesystemMappingType, directory: string, basename: string, shouldExtendWithMetadata: boolean): void;

  /**
   * Converts given {@link filesystemAbstractionObject} in such a way that the keys, which may have been possibly uuids when working with filesystem, will be IRIs.
   *  This expects that the structure {@link filesystemAbstractionObject} already contains IRIs.
   * TODO RadStr: Not sure if it should be with or without argument.
   */
  convertFilesystemAbstractionObjectNamesToIris(filesystemAbstractionObject: FilesystemMappingType): FilesystemMappingType;

  // TODO RadStr: still not sure if I should use treePath or fullPath from the DatastoreInfo
  /**
   * TODO RadStr: I am not sure what is the input for this even - maybe it even isn't part of interface, since this maybe won't be FS speicfic
   *              ... yeah it probably should be here, I have the names inside the data structure but here I want to get the data from filesystem based on the paths stored in the DataStructure
   * TODO RadStr: Not sure about using the "treePath" ... maybe use resourceName instead? or something nad the same for others
   * TODO RadStr: Not sure abotu the returned type.
   * @deprecated Probably deprecated, because we will use {@link getDatastoreContent} instead. or we can just call the getDatastore here instead and be done with it.
   * @param treePath is the path the resource. However the name contains the basis in case of filesystem (it does not contain the .meta suffix). In case of DS filesystem it is the IRI of resource.
   * @returns The metadata for given {@link treePath}
   */
  getMetadataObject(treePath: string): Promise<MetadataCacheType>;

  /**
   *
   * @param treePath is path to the directory in which we can find the {@link file}. In case of filesystem it is actual path, in case of DS FileSystem it is the resource IRI.
   *  It is the full path to the file, but without the possible suffix (for example .model.json if we are on filesystem)
   * @param type is the type of the datastore to get
   * @returns Returns the content of datastore (file) as string if {@link shouldConvertToDatastoreFormat} is false,
   *  otherwise it tries to return object (for example if the datastore has .json or .yaml extension).
   *  In case of filesystem it is actual file. In case of DS filesystem too, but we call it datastore.
   */
  getDatastoreContent(treePath: string, type: string, shouldConvertToDatastoreFormat: boolean): Promise<any>;

  /**
   * TODO RadStr: Similar TODOs as in {@link getMetadataObject}
   * TODO RadStr: Return the content or the names? Probably content - I have the names isnide the object ... so yeah it probably should be inisde this IFace
   * @param treePath is the path the resource. However the name contains the basis in case of filesystem (it does not contain the .meta suffix). In case of DS filesystem it is the IRI of resource.
   * @returns The datastores for given {@link treePath}. To get the actual content of the datastores use the {@link getDatastoreContent}.
   */
  getDatastoreTypes(treePath: string): DatastoreInfo[];

  /**
   * @param directory is the name of the directory
   * @param gitProvider is git provider to check against for git provider specific files to ignore
   * @returns Returns true if the given directory should be ignored.
   */
  shouldIgnoreDirectory(directory: string, gitProvider: GitProvider): boolean;

  /**
   * @param file is the name of the file
   * @returns Returns true if the given file should be ignored.
   */
  shouldIgnoreFile(file: string): boolean;

  /**
   * @param root is the location info of the root needed to build the filesystem tree.
   * @param shouldSetMetadataCache if true then also sets the metadata cache. In case of DS this is basically free operation, in case of Filesystem, we have to read metadata file.
   */
  createFilesystemMapping(root: FilesystemNodeLocation, shouldSetMetadataCache: boolean): Promise<FilesystemMappingType>

  // TODO RadStr: After I am done with the implementation fix the docs here - for example I newly added datastoreType: string, but I'm not sure if it will stay.
  // TODO RadStr: I don't know - the api could also be oldFileSystemNode, newFileSystemNode (and its abstraction). and it just replaces stuff
  /**
   * Changes content of the given version of datastore inside {@link ComparisonData} to the new version inside the filesystem
   *  and if {@link shouldUpdateMetadataCache} is provided then also updates cache accordingly, otherwise the abstraction is unchanged.
   *  {@link otherFilesystem} is the other filesystem containing the data of the new version.
   * TODO RadStr: Move the metadata away probably? I don't know what ot do with the metadata yet
   * @returns True if the file was sucessfully changed, false on failure.
   */
  changeDatastore(otherFilesystem: FilesystemAbstraction, changed: ComparisonData, shouldUpdateMetadataCache: boolean): Promise<boolean>;

  /**
   * Removes datastore from the {@link filesystemNode}, if it was the last {@link datastoreType} inside the node, also removes the whole node.
   *  Removes all the datastores and the resource itself.
   * TODO RadStr: Maybe write example what exactly it means for each filesystem
   * @param shouldRemoveFileWhenNoDatastores if true, then if after removal no datastore is present, then also the file holding the datastores is deleted.
   * @returns True if the file was sucessfully removed, false on failure.
   */
  removeDatastore(filesystemNode: FilesystemNode, datastoreType: string, shouldRemoveFileWhenNoDatastores: boolean): Promise<boolean>;

  /**
   * Removes given {@link filesystemNode} from both the abstraction of filesystem and the filesystem itself.
   *  Removes all the datastores and the resource itself.
   * @returns True if the file was sucessfully removed, false on failure.
   */
  removeFile(filesystemNode: FilesystemNode): Promise<boolean>;

  /**
   * Updates datastore (if it does not exist, creates one) of {@link datastoreType} inside {@link fileNode} in the underlying filesystem with given {@link content}.
   * @returns True if the datastore was sucessfully created, false on failure.
   */
  updateDatastore(fileNode: FileNode, datastoreType: string, content: string): Promise<boolean>;


  // TODO RadStr: createFile and createDirectory replaced by createDatastore
  // /**
  //  * Creates new {@link fileNode} inside the abstraction and in the underlying filesystem with given {@link metadata}. and the file will be of given {@link fileNodeType}.
  //  * The file will be stored inside {@link parent} node, if the {@link parent} is null, it means that it is at root level.
  //  * @returns True if the file was sucessfully created, false on failure.
  //  */
  // createFile(parent: DirectoryNode | null, fileNode: FileNode, fileNodeType: string, metadata: object): Promise<boolean>;

  // /**
  //  * Creates new {@link directoryNode} inside the abstraction and in the underlying filesystem with given {@link content}.
  //  *  Note that all the given filesystem nodes inside {@link content} are created also.
  //  * @returns True if the directory (and its content) was sucessfully created, false on failure.
  //  */
  // createDirectory(directoryNode: DirectoryNode, content: FilesystemNode): Promise<boolean>;

  /**
   * Creates new {@link changedDatastore} inside the abstraction and in the underlying filesystem.
   *  It does it so it follows the filesystem structure of the provided {@link filesystemNode}, which is the node in another {@link otherFilesystem}, which we want to put into ours.
   *  Note that if some parent directories are missing, then hey are created also. Also if the node with the datastore does not exist, it is created as well.
   * @returns True if the datastore (and its content) was sucessfully created, false on failure.
   */
  createDatastore(otherFilesystem: FilesystemAbstraction, filesystemNode: FilesystemNode, changedDatastore: DatastoreInfo): Promise<boolean>;

  /**
   * @returns The root of the filesystem. Note that each implmentation should have exactly one root. And it should be "fake" root,
   *  that is so we don't have any edge cases if we have more root directories in the first filesystem level.
   */
  getRoot(): DirectoryNode;

  /**
   * Sets the content of root (that is the one we get from {@link getRoot}) to the given {@link newRootContent}
   */
  setRootContent(newRootContent: FilesystemMappingType): void;

  /**
   * @returns The global mapping. It contains the whole filesystem, keys are absolute paths.
   * TODO RadStr: Not sure if I should expose that though
   */
  getGlobalFilesystemMap(): Record<string, FilesystemNode>;

  /**
   * @returns Returns the mapping of filesystem nodes to their parents.
   *  The reason why it is separate record and not part of the objects is that
   *  parents cause circular dependencies, which cause issues in serialzation.
   */
  getNodeToParentMap(): Record<string, DirectoryNode | null>;

  getParentForNode(node: FilesystemNode): DirectoryNode | null;
}

/**
   * Creates new filesystem abstraction from given {@link roots}. The underlying filesystem of course depends on the implementation.
   * The actual implementations of this interface should be more restrictive, when it comes to the returned {@link FilesystemAbstraction} types -
   *  it should be the actual created type.
   * @returns The created instance of type {@link FilesystemAbstraction}.
   */
export type FileSystemAbstractionFactoryMethod = (roots: FilesystemNodeLocation[], gitProvider: GitProvider | null) => Promise<FilesystemAbstraction>;


/**
 * @returns Returns newly created root, which can and should be used as fake root.
 *  But note that it does not create the map of root to the parent. That is handled by {@link createInitialNodeToParentMap}
 */
export function createFilesystemMappingRoot(): DirectoryNode {
  const root: DirectoryNode = {
    type: "directory",
    name: "",
    metadataCache: { iri: "fake-root" },
    content: {},
    datastores: [],
    fullTreePath: "",
  };
  return root;
}


export function createEmptyFilesystemMapping(): FilesystemMappingType {
  return {};
}

export function createInitialNodeToParentMap(fakeRoot: DirectoryNode): Record<string, DirectoryNode | null> {
  const nodeToParentMap: Record<string, DirectoryNode | null> = {};
  nodeToParentMap[fakeRoot.fullTreePath] = null;
  return nodeToParentMap;
}

export function getMetaPrefixType(): string {
  return "meta";
}

// TODO RadStr: Implement the datastores as map - then we don't need this method and it should be slightly faster.
export function removeDatastoreFromNode(node: FilesystemNode, datastoreType: string) {
  node.datastores = node.datastores.filter(datastore => datastore.type !== datastoreType);
}

export function isDatastoreForMetadata(datastoreType: string): boolean {
  return datastoreType === getMetaPrefixType();
}

export function getMetadataDatastoreFile(datastores: DatastoreInfo[]): DatastoreInfo | undefined {
  return datastores.find(datastore => isDatastoreForMetadata(datastore.type));
}

/**
 * Creates the {@link DatastoreInfo} with given {@link basename}, which describes metadata file.
 */
export function createMetaPrefixName(basename: string, format: string): DatastoreInfo {
  const afterPrefix = ".meta.json";

  return {
    fullName: `${basename}${afterPrefix}`,
    afterPrefix,
    type: getMetaPrefixType(),
    name: basename,
    format,
    fullPath: basename,     // TODO RadStr: ??? For DS filesystem ok, for classic fileystem not
  };
}


export function getDatastoreInfoOfGivenDatastoreType(filesystemNode: FilesystemNode, type: string) {
  const relevantDatastore = filesystemNode.datastores.find(datastore => datastore.type === type);
  return relevantDatastore;
}