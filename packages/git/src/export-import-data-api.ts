
// TODO RadStr: These comments need revision.
/**
 * Contains all info about datastore - including format, type and the path where it can be found.
 * @example Prefix = 12; FullName = 12345; afterPrefix = 345
 */
export type DatastoreInfo = {
  /**
   * Is the full name. But it does not necessary have to be exist in the filesystem. It is the name.type.format
   */
  fullName: string;

  /**
   * is the part of {@link fullName} after the prefix. That is usually the .type.format
   */
  afterPrefix: string;

  /**
   * Is the type - for example "model", or "meta"
   */
  type: string;       // TODO radStr: Maybe rename to model?

  /**
   * Is the name of the datastore. It does not contain the format or the type. It is simply the name.
   */
  name: string;

  /**
   * Is the format of the datastore. Can be "json" or "yaml", etc., null if unknown.
   */
  format: string | null;

  /**
   * Is the fullpath to the datastore. This is the value to use to get the content of the datastore from the filesystem.
   */
  fullPath: string;
}

export type MetadataCacheType = {
  iri?: string;
  projectIri?: string;
  [key: string]: any;
};

// TODO RadStr: Also when it comes to to the fullpath - use the /, don't use filesystem specific separators (that is path.sep)
type DatastructureToExport = {
  name: string,   // TODO RadStr: The name is the same as the key in the FilesystemMappingType
  metadataCache: MetadataCacheType,
  datastores: DatastoreInfo[],     // Could be Record<string, string> ... however I am not sure if there can not technically exist two or more datastores of same type (TODO RadStr:)
  fullTreePath: string,   // TODO RadStr: We can get it recursively, if we need to (by visiting parents and concating the names). So we don't have to store it.
  extraData?: object  // TODO RadStr: Maybe use later.
};

export type FileNode = {
  type: "file";
} & DatastructureToExport;

export type DirectoryNode = {
  type: "directory";
  content: FilesystemMappingType;
} & DatastructureToExport;

export type FilesystemNode = FileNode | DirectoryNode;

export type FilesystemMappingType = Record<string, FilesystemNode>;

// TODO RadStr: I use it a bit differently - the fullPaths are without the IRI
/**
 * Contains information about the filesystem's node's location
 */
export type FilesystemNodeLocation = {
  /**
   * Is the iri of the resource. That is the last part of the fullTreePath. In case of DS filesystem this is the only necessary
   */
  iri: string;
  /**
   * Is the full path to the node within filesystem, which can be used to access the node.
   */
  fullPath: string;
  /**
   * Is the full path within the filesystem tree.
   * We can use this to access the resource using global mapping of tree paths to nodes.
   * The last part should be the IRI.
   */
  fullTreePath: string;
};