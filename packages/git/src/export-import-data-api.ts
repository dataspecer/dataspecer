
/**
 * Contains all info about datastore - including format, type and the path where it can be found.
 * @example fullName = 12345; name = 12; afterPrefix = 345
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
  type: string;

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
   * Important note: When it comes to to the fullpath - use the /, don't use filesystem specific separators (that is path.sep).
   * It is for simplicity sake (see {@link dsPathJoin} documentation)
   */
  fullPath: string;
}


export type ExportMetadataCacheType = {
  iri: string;
  projectIri: string;
  types: string[];
  [key: string]: any;
};

export type DatabaseMetadataCacheType = {
  [key: string]: any;
};

/**
 * Removes the required fields from the given {@link metadata}
 */
export function convertExportMetadataCacheToDatabaseOne(metadata: ExportMetadataCacheType): DatabaseMetadataCacheType {
  delete metadata.iri;
  delete metadata.projectIri;
  delete metadata.types;
  return metadata;
}

/**
 * Important note: When it comes to to the fullTrePpath - use the /, don't use filesystem specific separators (that is path.sep)
 */
type FilesystemNodeCommonData = {
  /**
   * Name of the filesystem node.
   */
  name: string,

  // TODO RadStr: Retype and rename - it is not cache
  metadataCache: ExportMetadataCacheType,
  /**
   * TODO RadStr Idea: Could be Record<DatastoreType, string>. Note that the record variant would expect to have at most 1 datastore of given type
   */
  datastores: DatastoreInfo[],
  /**
   * path/to/node. Note that we can reconstruct it recursively if need to by visiting parents in the filesystem abstraction.
   */
  fullTreePath: string,
  /**
   * Currently unusued
   */
  extraData?: object
};

export type FileNode = {
  type: "file";
} & FilesystemNodeCommonData;

export type DirectoryNode = {
  type: "directory";
  content: FilesystemMappingType;
} & FilesystemNodeCommonData;

export type FilesystemNode = FileNode | DirectoryNode;

/**
 * The key is the name of the filesystem node.
 */
export type FilesystemMappingType = Record<string, FilesystemNode>;

/**
 * Contains information about the filesystem's node's location.
 */
export type FilesystemNodeLocation = {
  /**
   * Is the iri of the resource. That is the last part of the fullTreePath. In case of DS filesystem this is the only necessary
   */
  iri: string;
  // TODO RadStr: I don't like this, maybe just rename it in the methods and pass as parametr or idk. This usage on context is weird.
  /**
   * Is the full path to the node within filesystem, which can be used to access the node.
   * This value is kind of weird. It depends on used context. It is either the full path, which can be accessed the resource,
   * or it is path which should be used for export. Sometimes it is also just path to parent (that is without the iri).
   */
  fullPath: string;
  /**
   * Is the full path within the filesystem tree.
   * We can use this to access the resource using global mapping of tree paths to nodes.
   * The last part should be the IRI.
   */
  fullTreePath: string;
};