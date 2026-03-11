import { FilesystemNode } from "../export-import-data-api.ts";
import { AvailableFilesystems } from "../filesystem/abstractions/filesystem-abstraction.ts";

type MergeEndInfoInternal = {
  lastCommitHash: string;
  isBranch: boolean;
  branch: string;
  rootFullPathToMeta: string;
  filesystemType: AvailableFilesystems;
  gitUrl: string | null;
}

export type MergeEndInfoWithRootNode = {
  rootNode: FilesystemNode;
} & MergeEndInfoInternal;

export type MergeEndInfoWithRootIri = {
  rootIri: string;
} & MergeEndInfoInternal;

export function convertToMergeInfoWithIri(input: MergeEndInfoWithRootNode): MergeEndInfoWithRootIri {
  return {
    filesystemType: input.filesystemType,
    lastCommitHash: input.lastCommitHash,
    rootFullPathToMeta: input.rootFullPathToMeta,
    rootIri: input.rootNode.metadata.iri,
    isBranch: input.isBranch,
    branch: input.branch,
    gitUrl: input.gitUrl,
  };
}
