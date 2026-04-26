import { GitProvider } from "../../git-provider-api.ts";
import { DirectoryNode, FileNode, FilesystemMappingType, FilesystemNode, FilesystemNodeLocation, DatastoreInfo, ExportMetadataType } from "../../export-import-data-api.ts";
import { DatastoreComparison } from "../../merge/merge-state.ts";


export enum AvailableFilesystems {
  DS_Filesystem = "ds-filesystem",
  ClassicFilesystem = "classic-filesystem",
}

const availableFilesystemToHumanReadableName: Record<AvailableFilesystems, string> = {
  [AvailableFilesystems.DS_Filesystem]: "Dataspecer database",
  [AvailableFilesystems.ClassicFilesystem]: "Temporary Git project",
}
export function getHumanReadableFilesystemName(filesystem: AvailableFilesystems) {
  return availableFilesystemToHumanReadableName[filesystem];
}

const availableFilesystemToHumanReadableShortName: Record<AvailableFilesystems, string> = {
  [AvailableFilesystems.DS_Filesystem]: "in DS",
  [AvailableFilesystems.ClassicFilesystem]: "in Git",
}
export function getHumanReadableFilesystemShortName(filesystem: AvailableFilesystems) {
  return availableFilesystemToHumanReadableShortName[filesystem];
}


/**
 * This interface represents abstraction over system with data. The name contains filesystem, since we can think of it as abstraction over filesystem, but
 *  it isn't entirely true. So what is it:
 *  When we clone git repository, we get representation of package in the filesystem. Basically it looks like if we performed export to file and then unzip the file into filesystem.
 *  However when we have the package stored in the DS system. Part of it is stored inside the database and other part (blobs) is stored in the filesystem. So we would like to
 *  unify these 2 different representations into one data structure {@link FilesystemMappingType} and together with that create interface with basic functionality over the "filesystem" representations.
 *  Also Note that each implmentation should have exactly one root. And it should be "fake" root,
 *   that is so we don't have any edge cases if we have more root directories in the first filesystem level.
 *
 * Often times the methods have irisTreePath as the path to look for the resource.
 *  For the DS filesystem those consists of actual IRIs, for classic filesystem it is the projectIris, since those are the path to the resource.
 *  We call it irisTreePath since it has to be unique in the filesystem and it should be the path which we could follow within the abstraction
 *   (really the abstraction, where we go through the map) that can be used to access the resource.
 */
export interface FilesystemAbstraction {

  /**
   * Returns the type of the filesystem.
   */
  getFilesystemType(): AvailableFilesystems;

  /**
   * This method behaves basically like constructor. It should initialize the filesystem with given {@link filesystemRoots}.
   * By nature of filesystems, this method is asynchronous.
   * @param filesystemRoots are roots which will be placed under the fake root.
   */
  initializeFilesystem(filesystemRoots: FilesystemNodeLocation[]): Promise<void>;

  /**
   * @returns Returns the content of {@link iriTreePath}.
   */
  readDirectory(iriTreePath: string): FilesystemNode[];

  /**
   * @returns True if the given resource is directory, false otherwise
   */
  isDirectory(iriTreePath: string): boolean;

  /**
   * @deprecated Probably deprecated, because we will use {@link getDatastoreContent} instead. or we can just call the getDatastore here instead and be done with it.
   * @param irisTreePath is the path the resource (filesystem node).
   * @returns The metadata for given {@link irisTreePath}
   */
  getMetadataObject(irisTreePath: string): Promise<ExportMetadataType>;

  /**
   *
   * @param irisTreePath is path to the filesystem node where we can look for the type.
   * @param type is the type of the datastore to get
   * @returns Returns the content of datastore (file) as string if {@link shouldConvertToDatastoreFormat} is false,
   *  otherwise it tries to return object (for example if the datastore has .json or .yaml extension).
   *  In case of filesystem it is actual file. In case of DS filesystem too, but we call it datastore.
   */
  getDatastoreContent(irisTreePath: string, type: string, shouldConvertToDatastoreFormat: boolean): Promise<any>;

  /**
   * @param irisTreePath is the path the resource. It is the path to the corresponding filesystem node.
   * @returns The datastores for given {@link irisTreePath}. To get the actual content of the datastores use the {@link getDatastoreContent}.
   */
  getDatastoreTypes(irisTreePath: string): DatastoreInfo[];

  /**
   * Changes content of the given version of datastore inside {@link changed} to the new version inside the filesystem.
   *  {@link otherFilesystem} is the other filesystem containing the data of the new version.
   * @deprecated We are not using it in the end
   */
  changeDatastore(otherFilesystem: FilesystemAbstraction, changed: DatastoreComparison): Promise<boolean>;

  /**
   * Removes datastore from the {@link filesystemNode}, if it was the last {@link datastoreType} inside the node, also removes the whole node.
   *  Removes all the datastores and the resource itself.
   * @param shouldRemoveFileWhenNoDatastores if true, then if after removal no datastore is present, then also the file holding the datastores is deleted.
   */
  removeDatastore(filesystemNode: FilesystemNode, datastoreType: string, shouldRemoveFileWhenNoDatastores: boolean): Promise<void>;

  /**
   * Removes given {@link filesystemNode} from both the abstraction of filesystem and the filesystem itself.
   *  Removes all the datastores and the resource itself.
   */
  removeFilesystemNode(filesystemNode: FilesystemNode): Promise<void>;

  /**
   * Updates datastore (if it does not exist, creates one) of {@link datastoreType} inside {@link fileNode} in the underlying filesystem with given {@link content}.
   */
  updateDatastore(fileNode: FileNode, datastoreType: string, content: string): Promise<boolean>;


  /**
   * Creates new {@link changedDatastore} inside the abstraction and in the underlying filesystem.
   *  It does it so it follows the filesystem structure of the provided {@link filesystemNode}, which is the node in another {@link otherFilesystem}, which we want to put into ours.
   *  Note that if some parent directories are missing, then hey are created also. Also if the node with the datastore does not exist, it is created as well.
   */
  createDatastore(parentIriInToBeChangedFilesystem: string, otherFilesystem: FilesystemAbstraction, filesystemNode: FilesystemNode, changedDatastore: DatastoreInfo): Promise<void>;

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
   * @deprecated Should probably just use the {@link getGlobalFilesystemMapForIris}
   * @returns The global mapping. It contains the whole filesystem, keys are absolute paths created from project iris joined by "/".
   */
  getGlobalFilesystemMapForProjectIris(): FilesystemMappingType;

  /**
   * The global mapping. It contains the whole filesystem, keys are absolute paths created from "iris" (See class comment) joined by "/".
   */
  getGlobalFilesystemMapForIris(): FilesystemMappingType;

  /**
   * @returns Returns the mapping of filesystem nodes to their parents.
   *  The reason why it is separate record and not part of the objects is that
   *  parents cause circular dependencies, which cause issues in serialzation.
   */
  getNodeToParentMap(): Record<string, DirectoryNode | null>;

  getParentForNode(node: FilesystemNode): DirectoryNode | null;
}


export interface GitIgnore {
  /**
   * @param file is the name of the file. It is just the name of the file. Not the full path.
   * @returns Returns true if the given file should be ignored when handling creation of filesystem abstraction.
   */
  isIgnoredFile(file: string): boolean;

  /**
   * @param directory is the name of the directory. It is the irisPath in the filesystem tree (that is without the artificial directories, etc.).
   * @returns Returns true if the given directory should be ignored when handling creation of filesystem abstraction.
   */
  isIgnoredDirectory(directory: string): boolean;

  /**
   * Calls {@link isIgnoredFile} and {@link isIgnoredDirectory}
   */
  isIgnoredEntry(entry: string): boolean;
}


/**
 * Creates GitIgnore for given GitProvider.
 */
export class GitIgnoreBase implements GitIgnore {
  private gitProvider: GitProvider;

  constructor(gitProvider: GitProvider) {
    this.gitProvider = gitProvider;
  }

  public static isGitDirectory(directory: string): boolean {
    return directory.endsWith(".git");
  }
  public static isReadmeFile(file: string): boolean {
    return file === "README.md";
  }

  public isGitProviderDirectory(directory: string): boolean {
    return this.gitProvider.isGitProviderDirectory(directory);
  }
  isIgnoredFile(file: string): boolean {
    // TODO RadStr: Possibly can be better by using configuration or something instead of hardcoded.
    return GitIgnoreBase.isReadmeFile(file);
  }
  isIgnoredDirectory(directory: string): boolean {
    return this.isGitProviderDirectory(directory) || GitIgnoreBase.isGitDirectory(directory);
  }
  isIgnoredEntry(entry: string): boolean {
    return this.isIgnoredDirectory(entry) || this.isIgnoredFile(entry);
  }
}


/**
 * @returns Returns newly created root, which can and should be used as fake root.
 *  But note that it does not create the map of root to the parent. That is handled by {@link createInitialNodeToParentMap}
 */
export function createFilesystemMappingFakeRoot(): DirectoryNode {
  const root: DirectoryNode = {
    type: "directory",
    name: "",
    metadata: { iri: "fake-root", projectIri: "fake-root-project-iri", types: [], userMetadata: {} },
    content: {},
    datastores: [],
    irisTreePath: "",
    projectIrisTreePath: "",
  };
  return root;
}


export function createEmptyFilesystemMapping(): FilesystemMappingType {
  return {};
}

export function createInitialNodeToParentMap(fakeRoot: DirectoryNode): Record<string, DirectoryNode | null> {
  const nodeToParentMap: Record<string, DirectoryNode | null> = {};
  nodeToParentMap[fakeRoot.irisTreePath] = null;
  return nodeToParentMap;
}

export function getMetaPrefixType(): string {
  return "meta";
}

/**
 * Removes {@link datastoreType} from the array of datastores present in the {@link node}.
 */
export function removeDatastoreFromNode(node: FilesystemNode, datastoreType: string) {
  node.datastores = node.datastores.filter(datastore => datastore.type !== datastoreType);
}

/**
 * @returns Returns true if the {@link datastoreType} represents meta file.
 */
export function isDatastoreForMetadata(datastoreType: string): boolean {
  return datastoreType === getMetaPrefixType();
}

/**
 * @returns Returns the DatastoreInfo that represents meta file or undefined. It is searched for in the given {@link datastores}.
 */
export function getMetadataDatastoreFile(datastores: DatastoreInfo[]): DatastoreInfo | undefined {
  return datastores.find(datastore => isDatastoreForMetadata(datastore.type));
}


/**
 * @returns Returns Datastore of the given {@link type} present in the datastores of the given {@link filesystemNode}. Returns null if not present.
 */
export function getDatastoreInfoOfGivenDatastoreType(filesystemNode: FilesystemNode, type: string): DatastoreInfo | null {
  return findDatastoreInfoOfGivenDatastoreType(filesystemNode.datastores, type);
}

function findDatastoreInfoOfGivenDatastoreType(datastores: DatastoreInfo[], type: string): DatastoreInfo | null {
  const relevantDatastore = datastores.find(datastore => datastore.type === type);
  return relevantDatastore ?? null;
}