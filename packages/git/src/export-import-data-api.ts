
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

export type ExportShareableMetadataType = {
  [key: string]: any;
} & ShareableMetadata;


export type ExportMetadataType = {
  // We actually need the iri! At first I thought it is just identifier within DS. So we need it when we work inside DS, but not on the actual import.
  // But it is not the case, because some other values may refer to the iri, because of that we need to export it, so we can safely map it to some newly created iri on import.
  iri: string;
} & ExportShareableMetadataType;

/**
 * Metadata which can be shared when copying, etc.
 */
export type ShareableMetadata = {
  userMetadata: NonNullable<object>,
  projectIri: string;
  types: string[];
};

export function pickShareableMetadata(metadata: ExportMetadataType): ShareableMetadata {
  return {
    projectIri: metadata.projectIri,
    types: metadata.types,
    userMetadata: metadata.userMetadata ?? {},
  };
}

/**
 * Important note: When it comes to to the fullTrePpath - use the /, don't use filesystem specific separators (that is path.sep).
 * To further understand what is FilesystemNode check the comment for {@link metadata}. But in short it is the DS resource stored in database.
 */
type FilesystemNodeCommonData = {
  /**
   * Name of the filesystem node.
   */
  name: string,

  // TODO RadStr: Retype and rename - it is not cache
  /**
   * The metadata for the filesystem node. Basically what we find under the .meta. There is a very impossible note which I noticed With hindsight.
   *  Filesystem node = DS resource. That means the meta and the resource are one entity, even though in the git it lives as a separate entity.
   *  (That is the reason why at one point it was not metadata but metadata cache. Note that it still could be implemented -
   *   basically fetch the metadata on demand, but it is too mcuh of a headache to make it work for basically 0 gain)
   */
  metadata: ExportMetadataType,
  /**
   * TODO RadStr Idea: Could be Record<DatastoreType, string>. Note that the record variant would expect to have at most 1 datastore of given type
   */
  datastores: DatastoreInfo[],
  /**
   * path/to/node. Note that we can reconstruct it recursively if need to by visiting parents in the filesystem abstraction.
   */
  irisTreePath: string,
  /**
   * Same as {@link irisTreePath}, but with project iris instead.
   */
  projectIrisTreePath: string,
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
   * Is the iri of the resource. That is the last part of the fullTreePath. In case of DS filesystem this is the only necessary.
   * !!! Very important note related to iris. We do not need projectIri, because:
   *  1) For DS - we need the iri to find the resource, after we have the resource we can extract the projectIri. The iri is unique identifier to find the package.
   *  2) For Git (ClassicFilesystem) - The resources are identified by projectIri (which is in their case same as iri) and the fullPath for their meta file.
   *     That is in this case the uniqueness is given by projectIri and system path (where is the git repository located).
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
  irisTreePath: string;

  /**
   * Same as {@link iriTreePath} but with projectIris instead.
   */
  projectIrisTreePath: string
};