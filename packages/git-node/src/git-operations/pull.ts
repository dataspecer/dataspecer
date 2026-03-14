import { AvailableFilesystems, ComparisonFullResult, DatastoreInfo, DirectoryNode, dsPathJoin, FilesystemAbstraction, FilesystemNode, getMergeFromMergeToForGitAndDS, getMergeFromMergeToMappingForGitAndDS, GitIgnore, GitIgnoreBase, GitProvider, isDatastoreForMetadata, MergeEndInfoWithRootNode, MergeStateCause } from "@dataspecer/git";
import { compareGitAndDSFilesystems } from "../filesystem-abstractions/backend-filesystem-comparison.ts";
import { AllowedPrefixes, createSimpleGitUsingPredefinedGitRoot } from "../git-store-info.ts";
import { SimpleGit } from "simple-git";
import { getLastCommitHash, removePathRecursively } from "../git-utils-node.ts";
import { getCommonCommitInHistory, gitCloneBasic } from "../simple-git-methods/simple-git-utils.ts";
import fs from "fs";
import { DsFsConstructorParamsWithStrongerResourceModel } from "../filesystem-abstractions/backend-filesystem-abstraction-factory.ts";

export type GitPullFields = {
  iri: string;
  gitProvider: GitProvider;
  branch: string;
  cloneURL: string;
  cloneDirectoryNamePrefix: AllowedPrefixes;
  dsLastCommitHash: string;
  alwaysCreateMergeState: boolean;
  updateBlob: UpdateBlobMethod;
  updateResourceMetadata: UpdateResourceMetadataMethod;
  mergeStateModel: MergeStateCreator;
  filesystemConstructorParams: DsFsConstructorParamsWithStrongerResourceModel;
}

type GitChangesToDSPackageStoreResult = {
  createdMergeState: boolean;
  conflictCount: number;
}

export interface MergeStateCreator {
  createMergeState(
    rootResourceIri: string, commitMessage: string, mergeStateCause: MergeStateCause,
    diffTreeComparison: ComparisonFullResult, commonCommitHash: string,
    mergeFromInfo: MergeEndInfoWithRootNode, mergeToInfo: MergeEndInfoWithRootNode
  ): Promise<string>;
}
type UpdateBlobMethod = (iri: string, datastoreType: string, newBlobContent: any, mergeStateUUIDsToIgnoreInUpdating?: string[] | undefined) => Promise<void>;
type UpdateResourceMetadataMethod = (iri: string, userMetadata: Record<string, unknown> | undefined) => Promise<void>;


export class GitPullBase {
  public constructor(fields: GitPullFields) {
    this.fields = fields;
  }

  private fields: GitPullFields;

  /**
   * Updates the data in Dataspecer based on the data coming from git pull. Depending on the parameters and the incoming changes Dataspecer content is
   *  either updated immediately or a new merge state is created and expected to be resolved later by the user.
   * @param depth is the number of commits to clone. In case of webhooks this number is given in the webhook payload. For normal pull we have to clone whole history.
   * @returns Return true if merge state was created
   */
  public async updateDSRepositoryByGitPull(depth?: number): Promise<boolean> {
    const { iri, gitProvider, branch, cloneURL, cloneDirectoryNamePrefix, dsLastCommitHash, filesystemConstructorParams } = this.fields;
    const { git, gitInitialDirectory, gitInitialDirectoryParent, gitDirectoryToRemoveAfterWork } = createSimpleGitUsingPredefinedGitRoot(iri, cloneDirectoryNamePrefix, true);
    let storeResult: GitChangesToDSPackageStoreResult | null = null;
    try {
      // TODO RadStr turn into TODO later: Not sure if it is better to pull only commits or everything -- I think that only commits is better
      await gitCloneBasic(git, gitInitialDirectory, cloneURL, true, true, branch, depth);
      const gitLastCommitHash = await getLastCommitHash(git);
      const commonCommit = await getCommonCommitInHistory(git, dsLastCommitHash, gitLastCommitHash);
      const gitIgnore: GitIgnore = new GitIgnoreBase(gitProvider);
      storeResult = await this.storeGitChangesToDataspecer(
        cloneURL, git, gitInitialDirectoryParent, gitIgnore,
        gitLastCommitHash, commonCommit, "pull");
    }
    catch (cloneError) {
      throw cloneError;
    }
    finally {
      if (storeResult !== null && storeResult.createdMergeState) {
        // If we created merge state then do not remove the Git directory
        return true;
      }
      // It is important to not only remove the actual files, but also the .git directory,
      // otherwise we would later also push the git history, which we don't want (unless we get the history through git clone)
      await filesystemConstructorParams.resourceModel.setHasUncommittedChanges(iri, false);
      removePathRecursively(gitDirectoryToRemoveAfterWork);
    }

    return storeResult?.createdMergeState ?? false;     // Wrong Typescript type, the value still can be null, if we throw error before setting the value
  };


  // TODO RadStr: Here also ideally reduce the number of parameters.
  /**
   * This method handles the storing of directory content, which usually comes from git clone, back to the DS store.
   * That means:
   *  0) Don't do anything with not changed (or copy them if necessary - depends on implementation of versioning inside DS)
   *  1) Remove removed
   *  2) Change changed
   *  3) Create created
   *   a) If there is new file from Git, which has not .meta and .model, just put it as new model (under the name of the file) to the package - user can edit it under the edit model on package
   *   b) If it has both .meta and .model create completely new resource - that is there will be new entry inside the package shown in manager
   *   c) Either only .meta or .model - skip it. We could try to somehow solve it, but we would probably end up in invalid state by some sequence of actions, so it is better to just skip it.
   * TODO RadStr: This should however account for collisions
   * @returns Self-explanatory, just note that (at least for now), if there are 0 conflicts we still create merge state.
   *  We don't create merge state only if we haven't performed any changes inside DS,
   *  so we can just safely move HEAD to the last git commit and update DS package based on that
   */
  async storeGitChangesToDataspecer(
    remoteRepositoryUrl: string,
    git: SimpleGit,
    gitInitialDirectoryParent: string,
    gitIgnore: GitIgnore,
    gitLastCommitHash: string,
    commonCommitHash: string,
    mergeStateCause: Omit<MergeStateCause, "merge">,
  ): Promise<GitChangesToDSPackageStoreResult> {
    const { iri, dsLastCommitHash, alwaysCreateMergeState, branch, mergeStateModel, filesystemConstructorParams } = this.fields;

    // Merge from is DS
    // TODO RadStr: Why am I doing the comparison twice? I think that there was a reason for that, but maybe we just wanted the fakeRoot data, etc.
    //              If that is the case, then we should just extract the part of the compareGitAndDSFilesystems method, which does it (respective from the method which calls it)
    //    ......... Well in one case I am comparing to the current head and in after that I checkout to the last commit and do it again
    //              The issue is - why do i need to do it to the not last commit ever?
    //    ......... This whole flow feels wrong - why can I in the canPullWithoutCreatingMergeState - updateLastCommit hash to the gitLastCommitHash??? I am not checking against it
    //              Well I do right in this first compare but i do not check the result anywhere here. I just pass it to the next method.
    //              I should check also in the "if canPullWithoutCreatingMergeState" that there are also no conflicts

    const {
      diffTreeComparison,
      mergeFromFilesystemInformation,
      mergeToFilesystemInformation,
    } = await compareGitAndDSFilesystems(gitIgnore, iri, gitInitialDirectoryParent, mergeStateCause, filesystemConstructorParams);
    const { fakeRoot: fakeRootMergeFrom, root: rootMergeFrom, filesystem: filesystemMergeFrom, pathToRootMeta: pathToRootMetaMergeFrom } = mergeFromFilesystemInformation;
    const { fakeRoot: fakeRootMergeTo, root: rootMergeTo, filesystem: filesystemMergeTo, pathToRootMeta: pathToRootMetaMergeTo } = mergeToFilesystemInformation;

    const { valueMergeFrom: lastHashMergeFrom, valueMergeTo: lastHashMergeTo } = getMergeFromMergeToForGitAndDS(mergeStateCause, dsLastCommitHash, gitLastCommitHash);
    const filesystemFakeRoots = { fakeRootMergeFrom, fakeRootMergeTo };
    const { gitResultNameSuffix } = getMergeFromMergeToMappingForGitAndDS(mergeStateCause);
    const gitRootDirectory = filesystemFakeRoots["fakeRoot" + gitResultNameSuffix as keyof typeof filesystemFakeRoots];              // TODO RadStr: Just backwards compatibility with code so I don't have to change much


    if (!alwaysCreateMergeState) {
      try {
        await git.checkout(dsLastCommitHash);
        // Basically check against the commit the package is supposed to represent, if we did not change anything, we can always pull without conflict.
        // Otherwise we changed something and even though we could handle it automatically. We let the user resolve everything manually, it is his responsibility.
        const currentDSPackageAndGitCommitComparison = await compareGitAndDSFilesystems(
          gitIgnore, iri, gitInitialDirectoryParent, mergeStateCause, filesystemConstructorParams);
        const canPullWithoutCreatingMergeState = currentDSPackageAndGitCommitComparison.diffTreeComparison.conflicts.length === 0;

        if (canPullWithoutCreatingMergeState) {
          // TODO RadStr: Rename ... and update based on the conflicts resolution, like we do not want to update when there is conflict
          await git.checkout(gitLastCommitHash);
          await this.storeGitChangesToDataspecerInternal(gitRootDirectory, gitInitialDirectoryParent, filesystemMergeTo);
          await filesystemConstructorParams.resourceModel.updateLastCommitHash(iri, gitLastCommitHash, "pull");

          return {
            createdMergeState: false,
            conflictCount: -1,
          };
        }
      }
      catch (err) {
        // EMPTY
      }
      finally {
        await git.checkout(gitLastCommitHash);
      }
    }

    const mergeFromInfo: MergeEndInfoWithRootNode = {
      rootNode: rootMergeFrom,
      filesystemType: filesystemMergeFrom.getFilesystemType(),
      lastCommitHash: lastHashMergeFrom,
      // Since the merge state cause can not be merge, the value does not really matter all that much.
      // But technically the Git is tracking certain commit (even though it was the last commit at the branch at time of cloning)
      // So we set it based on that. Same for MergeTo
      isBranch: filesystemMergeFrom.getFilesystemType() === AvailableFilesystems.DS_Filesystem,
      branch: branch,
      rootFullPathToMeta: pathToRootMetaMergeFrom,
      gitUrl: remoteRepositoryUrl,
    };
    const mergeToInfo: MergeEndInfoWithRootNode = {
      rootNode: rootMergeTo,
      filesystemType: filesystemMergeTo.getFilesystemType(),
      lastCommitHash: lastHashMergeTo,
      isBranch: filesystemMergeTo.getFilesystemType() === AvailableFilesystems.DS_Filesystem,     // Same as mergeFrom.
      branch: branch,
      rootFullPathToMeta: pathToRootMetaMergeTo,
      gitUrl: remoteRepositoryUrl,
    };

    const createdMergeStateId = mergeStateModel.createMergeState(
      iri, "", "pull", diffTreeComparison, commonCommitHash, mergeFromInfo, mergeToInfo);
    return {
      createdMergeState: true,
      conflictCount: diffTreeComparison.conflicts.length,
    };
  }

  private async storeGitChangesToDataspecerInternal(
    currentlyProcessedDirectoryNode: DirectoryNode,
    treePath: string,
    filesystem: FilesystemAbstraction,
  ): Promise<void> {
    console.info("RECURSIVE MAPPING", currentlyProcessedDirectoryNode);       // TODO RadStr: Debug
    await this.handleResourceUpdate(currentlyProcessedDirectoryNode);

    for (const [name, value] of Object.entries(currentlyProcessedDirectoryNode.content)) {
      // TODO RadStr: Name vs IRI
      if(value.type === "directory") {
        const newDirectory = dsPathJoin(treePath, name);
        await this.storeGitChangesToDataspecerInternal(value, newDirectory, filesystem);
      }
      else {
        await this.handleResourceUpdate(value);
      }
    }
  }

  private async handleResourceUpdate(filesystemNode: FilesystemNode): Promise<void> {
    // Note that the the files added from git are handled as other ones - it works since update
    // of blob is create/update. However it stops working if we add some completely new resource and
    // not just something which we put under existing filesystem node.
    const datastoreTypesToDatastores: Record<string, DatastoreInfo> = {};

    for (const datastore of filesystemNode.datastores) {
      datastoreTypesToDatastores[datastore.type] = datastore;

      // TODO RadStr: This If exists just for debug
      if(filesystemNode.type === "directory") {
        console.info("Directroy");
      }

      // TODO RadStr:  - since the iri may differ from name for example in the case of imported DCAT-AP
      // TODO RadStr: .... Well could it really?
      const nodeIri = filesystemNode.metadata.iri ?? filesystemNode.name;

      // TODO RadStr: Should check if it already exists, or if not it should be created
      if (isDatastoreForMetadata(datastore.type)) {
        // TODO: Just for now - I don't know about used encodings, etc. - but this is just detail
        // TODO RadStr PR: If we check for existence here, we can allow to create new models from Git. However, there is more work then just checking for existence.
        //                 There is validation, ...
        const metaFileContent = JSON.parse(fs.readFileSync(datastore.fullPath, "utf-8"));
        // TODO RadStr:  - since the iri may differ from name for example in the case of imported DCAT-AP
        await this.fields.updateResourceMetadata(nodeIri, metaFileContent!.userMetadata);
        continue;
      }
      else {
          // TODO: Just for now - I don't know about used encodings, etc. - but this is just detail
        const packageModelFileContent = JSON.parse(fs.readFileSync(datastore.fullPath, "utf-8"));
        await this.fields.updateBlob(nodeIri, datastore.type, packageModelFileContent);
      }
    }
  }
}
