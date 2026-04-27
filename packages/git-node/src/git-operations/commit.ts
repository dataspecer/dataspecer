import { BranchSummary, CommitResult, SimpleGit } from "simple-git";
import { getLastCommit, getLastCommitHash, isDefaultBranch, removeEverythingExcept, removePathRecursively } from "../git-utils-node.ts";
import { createGitReadMeFile } from "../git-readme/git-readme-generator.ts";
import { AvailableFilesystems, CommitConflictInfo, CommitType, createRootFilesystemNodeLocation, CreateRootFilesystemNodeParams, createTransitiveMapFromFilesystems, ErrorDefinitionConstantsClass, ExportFormatType, ExportVersionType, FilesystemAbstraction, getAuthorizationURL, getMergeFromMergeToForGitAndDS, GitCredentials, GitIgnoreBase, GitProviderNode, MergeEndInfoWithRootNode, MergeFromDataType } from "@dataspecer/git";
import { AvailableExports } from "../resource-model-api/export/export-api/export-actions.ts";
import { DsFsConstructorParams, DsFsConstructorParamsWithStrongerResourceModel, FilesystemFactory, FilesystemFactoryMethodParams } from "../filesystem-abstractions/backend-filesystem-abstraction-factory.ts";
import { PackageExporterFactory } from "../resource-model-api/export/implementation/export-by-resource-type.ts";
import fs from "fs";
import { compareBackendFilesystems, compareGitAndDSFilesystems, MergeEndpointForComparison } from "../filesystem-abstractions/backend-filesystem-comparison.ts";
import { createSimpleGitUsingPredefinedGitRoot, MERGE_DS_CONFLICTS_PREFIX, PUSH_PREFIX } from "../git-store-info.ts";
import { ResourceModelForFilesystemRepresentation, ResourceModelForPull } from "../resource-model-api/export/export-api/export.ts";
import { MergeStateCreator } from "./pull.ts";
import { CreateSimpleGitResult, getCommonCommitInHistory, gitCloneBasic, UniqueDirectory } from "./simple-git-utils.ts";

export type GitRepositoryIdentification = {
  repositoryOwner: string,
  repositoryName: string,
}

/**
 * {@link GitCommitToCreateInfoBasic} but no more ambiguities, everything is set
 */
export type GitCommitToCreateInfoExplicitWithCredentials = {
  gitCredentials: GitCredentials;
  commitMessage: string;
  gitProvider: GitProviderNode;
  exportFormat: ExportFormatType;
  exportVersion: ExportVersionType;
  shouldAppendAfterDefaultMergeCommitMessage: boolean | null;
}

/**
 * @param commitMessage if null then default message is used.
 */
export type GitCommitToCreateInfoBasic = {
  commitMessage: string | null;
  gitProvider?: GitProviderNode;
  exportFormat: ExportFormatType;
  exportVersion: ExportVersionType;
}


/**
 * @param localLastCommitHash if empty string then there is no check for conflicts -
 *  it is expected to be the first commit on repository
 *  (however it also works the if we just want to set new last commit and
 *   do not want to cause any conflicts, we just commit current content and push it)
 */
export type CommitBranchAndHashInfo = {
  localBranch: string | null;
  localLastCommitHash: string;
  mergeFromData: MergeFromDataType | null;
}


/**
 * Same as {@link CommitBranchAndHashInfo}, but with renamed fields to mergeTo
 */
type CommitBranchAndHashInfoForMerge = {
  mergeToBranch: string | null;
  mergeToCommitHash: string;
  mergeFromData: MergeFromDataType | null;
  mergeFromResourceModel: ResourceModelForFilesystemRepresentation;
  mergeToResourceModel: ResourceModelForFilesystemRepresentation;
}


type PushToGitResult = {
  isPushSuccessful: boolean;
  hashOfPeformedCommit: string | null;
};

type CloneBeforeMergeResult = {
  mergeFromBranchExists: boolean;
  mergeToBranchExists: boolean;
  mergeToBranchExplicitName: string;
  isClonedSuccessfully: boolean;
};

export type GitCommitBaseType = {
  iri: string;
  projectIri: string;
  remoteRepositoryUrl: string;
  branchAndLastCommit: CommitBranchAndHashInfo;
  repositoryIdentificationInfo: GitRepositoryIdentification;
  shouldAlwaysCreateMergeState: boolean;
  commitType: CommitType;
};

export type GitCommitConstructorParams = {
  commitInfo: GitCommitToCreateInfoExplicitWithCredentials;
  filesystemFactoryParams: DsFsConstructorParamsWithStrongerResourceModel;
  mergeStateModel: MergeStateCreator;
} & GitCommitBaseType;


function convertBranchAndHashToMergeInfo(input: CommitBranchAndHashInfo): CommitBranchAndHashInfoForMerge {
  return {
    mergeToBranch: input.localBranch,
    mergeToCommitHash: input.localLastCommitHash,
    mergeFromData: input.mergeFromData === null ? null : {...input.mergeFromData},
    mergeFromResourceModel: null as any,
    mergeToResourceModel: null as any,
  };
}


// After long thinking the commit methods (both merge and classic commit) should be inside a class.
// That would solve the issue of passing in ton of parameters. Since some of the values are set once and unchanged for the rest of the run.
// Others are relatively fine.

/**
 * This class has methods which are used when committing to the remote repository.
 * The entry point method for committing is {@link commitPackageToGit}.
 * The commit action from {@link commitPackageToGit} will commit to repository for package identified by given {@link iri}.
 */
export class GitCommit {
  /**
   * The commit action from {@link commitPackageToGit} will commit to repository for package identified by given {@link iri}.
   * @param localLastCommitHash if empty string then there is no check for conflicts -
   *  it is expected to be the first commit on repository
   *  (however it also works the if we just want to set new last commit and
   *   do not want to cause any conflicts, we just commit current content and push it)
   */
  public constructor(params: GitCommitConstructorParams) {
    this.params = params;
  }

  // Fields
  private params: GitCommitConstructorParams;

  // Methods

  /**
   * Performs commit based on the data passed in constructor.
   * This method decides based on the data if the it is the classic commit or merge commit.
   * @returns Null on successful commit. Otherwise returns the paths to root which are in the merge state.
   */
  public async commitPackageToGit(): Promise<CommitConflictInfo | null> {
    // Note that the logic for both is similiar create git, clone, check if should create merge state conflict, perform export and "force" push.
    if (this.params.branchAndLastCommit.mergeFromData === null) {
      return await this.commitClassicToGit();
    }
    else {
      return await this.commitDSMergeToGit();
    }
  }


  /**
   * Performs the merge commit based on the given data.
   * If there is there is reason to create merge state, then it is created and we end. Otherwise, we end on successful commit or when the last access token fails.
   * If the last fails we throw an error.
   */
  private async commitDSMergeToGit(): Promise<CommitConflictInfo> {
    const {
      iri, projectIri, remoteRepositoryUrl, repositoryIdentificationInfo, commitInfo,
      shouldAlwaysCreateMergeState, mergeStateModel, filesystemFactoryParams
    } = this.params;
    const mergeInfo = convertBranchAndHashToMergeInfo(this.params.branchAndLastCommit);

    // Note that the logic follows the classic commit method logic!!!
    // the explanation for isAfterFirstSucessfulClone is not here, but in the other method
    // The logic is create git, clone, check if should create merge state conflict, perform export and "force" merge/push.
    // Possible TODO: It would be good idea to refactor it, but the methods do slightly differ with the flow, so it is not as trivial as it seems.


    const { mergeToBranch, mergeToCommitHash } = mergeInfo;
    // Has to be defined, otherwise we should not call this
    const { branch: mergeFromBranch, commitHash: mergeFromCommitHash, iri: mergeFromIri } = mergeInfo.mergeFromData!;
    const { repositoryOwner, repositoryName } = repositoryIdentificationInfo;
    const { gitCredentials } = commitInfo;


    const createSimpleGitResult: CreateSimpleGitResult = createSimpleGitUsingPredefinedGitRoot(iri, MERGE_DS_CONFLICTS_PREFIX, true);
    const { git, gitInitialDirectory, gitInitialDirectoryParent } = createSimpleGitResult;
    let cloneResult: CloneBeforeMergeResult;
    let hashOfPerformedCommit: string | null = null;

    for (const accessToken of gitCredentials.accessTokens) {
      // Check comment in the method of the classic commit for explanation of this logic
      const isAfterFirstSucessfulClone = hashOfPerformedCommit !== null;

      const repoURLWithAuthorization = getAuthorizationURL(gitCredentials, accessToken, remoteRepositoryUrl, repositoryOwner, repositoryName);
      const isLastAccessToken = accessToken === gitCredentials.accessTokens.at(-1);
      const hasSetLastCommit: boolean = mergeToCommitHash !== "";


      if (!isAfterFirstSucessfulClone) {
        cloneResult = await GitCommit.cloneBeforeMerge(git, gitInitialDirectory, repoURLWithAuthorization, mergeFromBranch, mergeToBranch, isLastAccessToken);
        if (!cloneResult.isClonedSuccessfully) {
          continue;
        }
      }
      // Once we get here the cloneResult is always set - either from current iteration (then we set it in the if)
      // or it comes from the previous iteration(s), in which we created commit,
      // since once we clone, there is no other way to fail then at push.

      const mergeFromBranchLog = await git.log([mergeFromBranch]);
      const lastMergeFromBranchCommitInGit = mergeFromBranchLog.latest?.hash;
      const mergeToBranchLog = await git.log([cloneResult!.mergeToBranchExplicitName]);
      const lastMergeToBranchCommitInGit = mergeToBranchLog.latest?.hash;
      const shouldTryCreateMergeState = (lastMergeFromBranchCommitInGit !== mergeFromCommitHash ||
                                        lastMergeToBranchCommitInGit !== mergeToCommitHash ||
                                        shouldAlwaysCreateMergeState) &&
                                        hasSetLastCommit &&
                                        !isAfterFirstSucessfulClone;

      if (shouldTryCreateMergeState) {
        const mergeFrom: MergeEndpointForComparison = {
          gitIgnore: new GitIgnoreBase(commitInfo.gitProvider),
          rootIri: mergeFromIri,
          filesystemType: AvailableFilesystems.DS_Filesystem,
          fullPathToRootParent: gitInitialDirectoryParent,
          filesystemFactoryParams: filesystemFactoryParams,
        };

        const mergeTo: MergeEndpointForComparison = {
          gitIgnore: new GitIgnoreBase(commitInfo.gitProvider),
          rootIri: iri,
          filesystemType: AvailableFilesystems.DS_Filesystem,
          fullPathToRootParent: gitInitialDirectoryParent,
          filesystemFactoryParams: filesystemFactoryParams,
        };


        const {
          diffTreeComparison,
          mergeFromFilesystemInformation,
          mergeToFilesystemInformation,
        } = await compareBackendFilesystems(mergeFrom, mergeTo, projectIri, "merge");

        const commonCommitHash = await getCommonCommitInHistory(git, mergeFromCommitHash, mergeToCommitHash);

        const mergeFromInfo: MergeEndInfoWithRootNode = {
          rootNode: mergeFromFilesystemInformation.root,
          filesystemType: mergeFromFilesystemInformation.filesystem.getFilesystemType(),
          lastCommitHash: mergeFromCommitHash,
          isBranch: true,     // It has to be true, we do not allow it to not be branch, if it is we failed to perform the checks earlier. (probably on front end)
          branch: mergeFromBranch,
          rootFullPathToMeta: mergeFromFilesystemInformation.pathToRootMeta,
          gitUrl: remoteRepositoryUrl,
        };
        const mergeToInfo: MergeEndInfoWithRootNode = {
          rootNode: mergeToFilesystemInformation.root,
          filesystemType: mergeToFilesystemInformation.filesystem.getFilesystemType(),
          lastCommitHash: mergeToCommitHash,
          isBranch: true,
          branch: cloneResult!.mergeToBranchExplicitName,
          rootFullPathToMeta: mergeToFilesystemInformation.pathToRootMeta,
          gitUrl: remoteRepositoryUrl,
        };

        const createdMergeStateId = await mergeStateModel.createMergeState(
          iri, commitInfo.commitMessage, "merge", diffTreeComparison, commonCommitHash, mergeFromInfo, mergeToInfo);
        if (diffTreeComparison.conflicts.length > 0) {
          return {
            conflictMergeFromRootPath: mergeFromInfo.rootFullPathToMeta,
            conflictMergeToRootPath: mergeToInfo.rootFullPathToMeta,
          };
        }
        // Well now what? For some reason the merge state was not created, but I think that it always should be, since we are not matching the commit hashes.
        // Actually if we commit and then revert then we don't get conflicts
      }



      const isMergingToDefaultBranch = await isDefaultBranch(git, cloneResult!.mergeToBranchExplicitName);
      const pushResult = await GitCommit.exportAndPushToGit(
        createSimpleGitResult, iri, projectIri, repoURLWithAuthorization, commitInfo, hasSetLastCommit,
        mergeFromBranch, isLastAccessToken, hashOfPerformedCommit, isMergingToDefaultBranch,
        cloneResult!.mergeToBranchExists, filesystemFactoryParams);

      hashOfPerformedCommit = pushResult.hashOfPeformedCommit;
      if (pushResult.isPushSuccessful) {
        return null;
      }
    }
    throw new Error("Unknown error when merging DS branches. This should be unreachable code. There were probably no access tokens available in DS at all");
  }


  /**
   * Performs the classic commit to the remote repository. It keeps trying access tokens until one succeeds.
   * If there is there is reason to create merge state, then it is created and we end. Otherwise, we end on successful commit or when the last access token fails.
   * If the last fails we throw an error.
   */
  private async commitClassicToGit(): Promise<CommitConflictInfo> {
    const {
      iri, projectIri, remoteRepositoryUrl, branchAndLastCommit, repositoryIdentificationInfo,
      commitInfo, mergeStateModel, shouldAlwaysCreateMergeState, filesystemFactoryParams
    } = this.params;
    const { localBranch: branch, localLastCommitHash } = branchAndLastCommit;
    const { gitCredentials, gitProvider } = commitInfo;
    const { repositoryOwner, repositoryName } = repositoryIdentificationInfo;


    const createSimpleGitResult: CreateSimpleGitResult = createSimpleGitUsingPredefinedGitRoot(iri, PUSH_PREFIX, true);
    const { git, gitDirectoryToRemoveAfterWork, gitInitialDirectory, gitInitialDirectoryParent } = createSimpleGitResult;

    let isNewlyCreatedBranchPresentOnlyInDS: boolean = false;
    let hashOfPerformedCommit: string | null = null;
    for (const accessToken of gitCredentials.accessTokens) {
      // Note that once hashOfPerformedCommit is not null. That mean we did successfully clone in previous iteration(s).
      // We have already filled directory with the export and perform commit in the previous iteration.
      // The push must have failed in previous iteration,
      // since the export and commit should not fail unless there is a mistake in code.
      // Therefore, it is safe to assume, that either merge state was created (then we do not get here and exit early)
      // or if the hashOfPerformedCommit is not null, we just have to try pushing with the different tokens and skip all the other programming flow.
      const isAfterFirstSucessfulClone = hashOfPerformedCommit !== null;

      const repoURLWithAuthorization = getAuthorizationURL(gitCredentials, accessToken, remoteRepositoryUrl, repositoryOwner, repositoryName);
      const isLastAccessToken = accessToken === gitCredentials.accessTokens.at(-1);
      const hasSetLastCommit: boolean = localLastCommitHash !== "";

      if (!isAfterFirstSucessfulClone) {
        const { isCloneSuccessful, isNewlyCreatedBranchOnlyInDS } = await GitCommit.cloneBeforeCommit(
          git, gitInitialDirectory, repoURLWithAuthorization, branch,
          localLastCommitHash, hasSetLastCommit, isLastAccessToken);
        if (!isCloneSuccessful) {
          continue;
        }

        isNewlyCreatedBranchPresentOnlyInDS = isNewlyCreatedBranchOnlyInDS;
      }

      const branchExplicit = (await git.branch()).current;
      if (hasSetLastCommit && !isAfterFirstSucessfulClone) {
        try {
          const remoteRepositoryLastCommitHash = await getLastCommitHash(git);
          const shouldTryCreateMergeState = localLastCommitHash !== remoteRepositoryLastCommitHash || shouldAlwaysCreateMergeState;
          if (shouldTryCreateMergeState) {
            const {
              diffTreeComparison,
              mergeFromFilesystemInformation,
              mergeToFilesystemInformation
            } = await compareGitAndDSFilesystems(new GitIgnoreBase(gitProvider), iri, projectIri, gitInitialDirectoryParent, "push", filesystemFactoryParams);

            const commonCommitHash = await getCommonCommitInHistory(git, localLastCommitHash, remoteRepositoryLastCommitHash);
            const { valueMergeFrom: lastHashMergeFrom, valueMergeTo: lastHashMergeTo } = getMergeFromMergeToForGitAndDS("push", localLastCommitHash, remoteRepositoryLastCommitHash);
            const mergeFromInfo: MergeEndInfoWithRootNode = {
              rootNode: mergeFromFilesystemInformation.root,
              filesystemType: mergeFromFilesystemInformation.filesystem.getFilesystemType(),
              lastCommitHash: lastHashMergeFrom,
              branch: branchExplicit,
              isBranch: true,     // Same as for merge. It has to be true, otherwise we failed some earlier check (probably on front end)
              rootFullPathToMeta: mergeFromFilesystemInformation.pathToRootMeta,
              gitUrl: remoteRepositoryUrl,
            };
            const mergeToInfo: MergeEndInfoWithRootNode = {
              rootNode: mergeToFilesystemInformation.root,
              filesystemType: mergeToFilesystemInformation.filesystem.getFilesystemType(),
              lastCommitHash: lastHashMergeTo,
              isBranch: true,
              branch: branchExplicit,
              rootFullPathToMeta: mergeToFilesystemInformation.pathToRootMeta,
              gitUrl: remoteRepositoryUrl,
            };



            const createdMergeStateId = await mergeStateModel.createMergeState(
              iri, commitInfo.commitMessage, "push", diffTreeComparison, commonCommitHash, mergeFromInfo, mergeToInfo);
            if (diffTreeComparison.conflicts.length > 0 || shouldAlwaysCreateMergeState) {
              return {
                conflictMergeFromRootPath: mergeFromInfo.rootFullPathToMeta,
                conflictMergeToRootPath: mergeToInfo.rootFullPathToMeta,
              };
            }
          }
        }
        catch(error) {
          // Remove only on failure, otherwise there is conflict and we want to keep it for merge state
          removePathRecursively(gitDirectoryToRemoveAfterWork);
          throw error;      // Rethrow
        }
      }

      const isCommittingToDefaultBranch = await isDefaultBranch(git, branchExplicit);
      const pushResult = await GitCommit.exportAndPushToGit(
        createSimpleGitResult, iri, projectIri, repoURLWithAuthorization, commitInfo, hasSetLastCommit,
        null, isLastAccessToken, hashOfPerformedCommit, isCommittingToDefaultBranch,
        !isNewlyCreatedBranchPresentOnlyInDS, filesystemFactoryParams);

      hashOfPerformedCommit = pushResult.hashOfPeformedCommit;
      if (pushResult.isPushSuccessful) {
        return null;
      }
    }

    throw new Error("Unknown error when commiting. This should be unreachable code. There were probably no access tokens available in DS at all");
  }


  /**
   * Note that if it is either the push failure on the last access token or the push was sucessful.
   *  Then the git project from the {@link createSimpleGitResult} is removed (meaning its directory).
   * @todo The removal of Git's directory is ok, but maybe it would be better to do it in the calling method.
   * @param mergeFromBranch if null, then it is classic commit, if not then merge commit
   * @param hashOfCommitToUse if null, then we do export, commit and push.
   *  If string then it is the commit hash to use. We will skip the export and commit steps and just perform the push
   * @returns True if successful. False if not and throws error if the failure was for the last access token
   */
  private static async exportAndPushToGit(
    createSimpleGitResult: CreateSimpleGitResult,
    iri: string,
    projectIri: string,
    repoURLWithAuthorization: string,
    commitInfo: GitCommitToCreateInfoExplicitWithCredentials,
    hasSetLastCommit: boolean,
    mergeFromBranch: string | null,
    isLastAccessToken: boolean,
    hashOfCommitToUse: string | null,
    shouldContainWorkflowFiles: boolean,
    isBranchAlreadyTrackedOnRemote: boolean,
    dataspecerFilesystemFactoryParams: DsFsConstructorParamsWithStrongerResourceModel,
  ): Promise<PushToGitResult> {
    // Will be used in the result
    const shouldSkipCommitting = hashOfCommitToUse !== null;
    let hashOfPeformedCommit: string | null = hashOfCommitToUse;

    // We could also extrapolate the commitType from the "commitType",
    const isClassicCommit = mergeFromBranch === null;
    const isMergeCommit = !isClassicCommit;
    const { git, gitDirectoryToRemoveAfterWork } = createSimpleGitResult;
    const { commitMessage, gitCredentials, shouldAppendAfterDefaultMergeCommitMessage } = commitInfo;
    await GitCommit.setUserConfigForGitInstance(git, gitCredentials.name, gitCredentials.email);

    try {
      if (shouldSkipCommitting) {
        const isPushSuccessful = await GitCommit.pushToRemoteAndUpdateResourceGitMetadata(dataspecerFilesystemFactoryParams.resourceModel, git, iri, repoURLWithAuthorization, hashOfCommitToUse, isClassicCommit);
        if (isPushSuccessful || isLastAccessToken) {
          removePathRecursively(gitDirectoryToRemoveAfterWork);
        }
        return {
          isPushSuccessful,
          hashOfPeformedCommit: hashOfCommitToUse,
        };    // We are done
      }

      let gitFilesystem: FilesystemAbstraction | null = null;
      // TODO RadStr PR: should isBranchAlreadyTrackedOnRemote be here or not? If it is not here then the iris from main are everywhere
      //                  If it is here, then each branch has unique IRIs.
      if (hasSetLastCommit && isBranchAlreadyTrackedOnRemote) {     // If it is not the first commit.
        // We have to create the Git filesystem before we create conflicts in the Git directory
        const rootParams: CreateRootFilesystemNodeParams = {
          projectIri,
          fullPathToParent: createSimpleGitResult.gitInitialDirectoryParent,
        };
        const gitFilesystemParams: FilesystemFactoryMethodParams = {
          roots: [createRootFilesystemNodeLocation(AvailableFilesystems.ClassicFilesystem, rootParams)],
          gitIgnore: new GitIgnoreBase(commitInfo.gitProvider),
          ...dataspecerFilesystemFactoryParams,
        };
        gitFilesystem = await FilesystemFactory.createFileSystem(AvailableFilesystems.ClassicFilesystem, gitFilesystemParams);
      }

      let mergeMessage: string = "";
      if (isMergeCommit) {
        // We create the merge commit but actually do not commit, we will do that later.
        try {
          const mergeResult = await git.merge(["--no-commit", "--no-ff", mergeFromBranch]);
          console.info({mergeResult});    // TODO RadStr Debug: Debug print
        }
        catch(mergeError) {
          // Errors for example for conflicts, do not matter, we will override it anyways by just exporting the current content of the data specfication's merge to branch.
          console.info({mergeError});       // TODO RadStr Debug: Debug print
        }
        finally {
          if (shouldContainWorkflowFiles) {
            await git.raw(["restore", "--staged", commitInfo.gitProvider.getWorkflowFilesDirectoryName()]);
            await git.raw(["restore", commitInfo.gitProvider.getWorkflowFilesDirectoryName()]);
          }
        }

        // If the file does not exist, then it probably means that actually the merge from and merge to branch the same
        try {
          const fullMergeMessage = fs.readFileSync(`${createSimpleGitResult.gitInitialDirectory}/.git/MERGE_MSG`, "utf-8");
          mergeMessage = fullMergeMessage.substring(0, fullMergeMessage.indexOf("\n"));
        }
        catch(error) {
          throw new Error(ErrorDefinitionConstantsClass.BRANCH_ALREADY_MERGE_ERROR_MSG);
        }
      }

      await GitCommit.fillGitDirectoryWithExport(
        iri, createSimpleGitResult, commitInfo.gitProvider, commitInfo.exportFormat, commitInfo.exportVersion,
        hasSetLastCommit, shouldContainWorkflowFiles, isBranchAlreadyTrackedOnRemote, dataspecerFilesystemFactoryParams, gitFilesystem);

      // TODO RadStr Debug: Debug print to remove
      for (let i = 0; i < 10; i++) {
        console.info("*****************************************************");
      }

      // TODO RadStr Debug: Debug print to remove
      try {
        // Get list of all branches (local + remote)
        const branches = await git.branch(['-a']);

        for (const branchName of Object.keys(branches.branches)) {
          console.log(`\n=== History for branch: ${branchName} ===`);

          // Get commit history of each branch
          const log = await git.log([branchName]);

          log.all.forEach(commit => {
            console.log(`${commit.date} | ${commit.hash} | ${commit.message} | ${commit.author_name}`);
          });
        }
      }
      catch (err) {
        console.error('Error fetching history:', err);
      }

      let commitResult: CommitResult;
      if (mergeFromBranch === null) {
        commitResult = await GitCommit.createClassicGitCommit(git, ["."], commitMessage);
        hashOfPeformedCommit = commitResult.commit;
        if (!commitResult.root && commitResult.commit === "" && commitResult.branch === "") {
          throw new Error(ErrorDefinitionConstantsClass.NO_CHANGES_TO_COMMIT_ERROR_MSG);
        }
      }
      else {
        if (shouldAppendAfterDefaultMergeCommitMessage === null) {
          throw new Error("Programmer error - when creating merge commit the shouldAppendAfterDefaultMergeCommitMessage is set to null instead of being boolean");
        }

        commitResult = await GitCommit.createMergeCommit(
          git, ["."], mergeMessage, commitMessage,
          gitCredentials.name, gitCredentials.email, mergeFromBranch,
          shouldAppendAfterDefaultMergeCommitMessage);
        hashOfPeformedCommit = commitResult.commit;
      }

      // TODO RadStr Debug: Debug print to remove
      for (let i = 0; i < 10; i++) {
        console.info("-----------------------------------------------");
      }
      try {
        // Get list of all branches (local + remote)
        const branches = await git.branch(['-a']);

        for (const branchName of Object.keys(branches.branches)) {
          console.log(`\n=== History for branch: ${branchName} ===`);

          // Get commit history of each branch
          const log = await git.log([branchName]);

          log.all.forEach(commit => {
            console.log(`${commit.date} | ${commit.hash} | ${commit.message} | ${commit.author_name}`);
          });
        }
      }
      catch (err) {
        console.error('Error fetching history:', err);
      }


      const isPushSuccessful = await GitCommit.pushToRemoteAndUpdateResourceGitMetadata(
        dataspecerFilesystemFactoryParams.resourceModel, git, iri, repoURLWithAuthorization, hashOfPeformedCommit, isClassicCommit);
      if (isPushSuccessful || isLastAccessToken) {
        removePathRecursively(gitDirectoryToRemoveAfterWork);
      }
      return {
        isPushSuccessful,
        hashOfPeformedCommit,
      };    // We are done
    }
    catch(error: any) {
      if (error?.message?.includes(ErrorDefinitionConstantsClass.BRANCH_ALREADY_MERGE_ERROR_MSG)) {
        throw error;
      }
      else if (error?.message?.includes(ErrorDefinitionConstantsClass.NO_CHANGES_TO_COMMIT_ERROR_MSG)) {
        throw error;
      }
      // Error can be caused by Not sufficient rights for the pushing - then we have to try all and fail on last
      if (isLastAccessToken) {
        // It is important to not only remove the actual files, but also the .git directory,
        // otherwise we would later also push the git history, which we don't want (unless we get the history through git clone)
        removePathRecursively(gitDirectoryToRemoveAfterWork);
        // If it is last then rethrow. Otherwise try again.
        throw error;
      }
      else {
        // TODO RadStr Debug: Print the error for now, however it really should be only issue with rights
        console.error({error});
        return {
          isPushSuccessful: false,
          hashOfPeformedCommit,
        };
      }
    }
  }


  private static async pushToRemoteAndUpdateResourceGitMetadata(
    resourceModelToUse: ResourceModelForPull,
    git: SimpleGit,
    iri: string,
    repoURLWithAuthorization: string,
    commitHash: string,
    isClassicCommit: boolean,
  ): Promise<boolean> {
    if (commitHash !== "") {
      // We do not need any --force or --force-with-leash options, this is enough
      await git.push(repoURLWithAuthorization);
      const updateCause = isClassicCommit ? "push" : "merge";
      await resourceModelToUse.updateLastCommitHash(iri, commitHash, updateCause);
      return true;
    }
    return false;
  }

  private static async fillGitDirectoryWithExport(
    iri: string,
    gitPaths: UniqueDirectory,
    gitProvider: GitProviderNode,
    exportFormat: ExportFormatType,
    exportVersion: ExportVersionType,
    hasSetLastCommit: boolean,
    shouldContainWorkflowFiles: boolean,
    isBranchAlreadyTrackedOnRemote: boolean,
    dataspecerFilesystemFactoryParams: DsFsConstructorParams,
    gitFilesystem: FilesystemAbstraction | null,
  ): Promise<void> {
    const { gitDirectoryToRemoveAfterWork, gitInitialDirectory, gitInitialDirectoryParent } = gitPaths;

    try {
      // Remove the content of the git directory and then replace it with the export
      // Alternatively we could keep the content and run await git.rm(['-r', '.']) ... however that would to know exactly
      //  what files were exported. So we can add them explicitly instead of running git add .
      const exceptionsForDirectoryRemoval = [".git", "README.md"];
      if (isBranchAlreadyTrackedOnRemote && shouldContainWorkflowFiles) {
        exceptionsForDirectoryRemoval.push(gitProvider.getWorkflowFilesDirectoryName());
      }

      const exporter = PackageExporterFactory.createPackageExporter(exportVersion);
      const rootParams: CreateRootFilesystemNodeParams = {
        iri,
      };
      // .... Ugly naming we have dsFilesystemFactoryParams and dataspecer...
      const dsFilesystemFactoryParams: FilesystemFactoryMethodParams = {
        roots: [createRootFilesystemNodeLocation(AvailableFilesystems.DS_Filesystem, rootParams)],
        gitIgnore: null,
        ...dataspecerFilesystemFactoryParams,
      };

      let dsIriToGitIriMap: Record<string, string> | undefined = undefined;
      if (gitFilesystem !== null) {
      // TODO RadStr PR: Optimization ... the filesystem is created again, we already created it during the comparison. Unless we skipped it because it is the first commit.
      //                              ... The Git filesystem also often already exists
        const dsFilesystem = await FilesystemFactory.createFileSystem(AvailableFilesystems.DS_Filesystem, dsFilesystemFactoryParams);
        dsIriToGitIriMap = createTransitiveMapFromFilesystems(gitFilesystem, dsFilesystem);
      }
      removeEverythingExcept(gitInitialDirectory, exceptionsForDirectoryRemoval);

      await exporter.doExportFromIRI(
        dsFilesystemFactoryParams, gitInitialDirectoryParent + "/", AvailableFilesystems.DS_Filesystem, AvailableExports.Filesystem, exportFormat, true, false, dsIriToGitIriMap);

      if (shouldContainWorkflowFiles && !hasSetLastCommit) {
        createGitReadMeFile(gitInitialDirectory);
        gitProvider.copyWorkflowFiles(gitInitialDirectory);
      }
    }
    catch(error) {
      console.error("Failure when creating the export of repository for commit");
      removePathRecursively(gitDirectoryToRemoveAfterWork);
      throw error;
    }
  }

  private static isBranchPresentInBranchList(branches: BranchSummary, branch: string): boolean {
    // We have to look for remotes of matching branch name. Because in git the local branch is not visible unless it was previously checkouted.
    const mergeFromBranchAsRemote = "remotes/origin/" + branch;
    const branchExists = branches.all.find(currBranch => mergeFromBranchAsRemote === currBranch) !== undefined;
    return branchExists;
  }

  private static async checkoutBranchIfExists(git: SimpleGit, branches: BranchSummary, branch: string): Promise<boolean> {
    const branchExists = GitCommit.isBranchPresentInBranchList(branches, branch);
    if (branchExists) {
      await git.checkout(branch);
    }
    else {
      // We just throw error, if the branch does not exist in Git.
      throw new Error(`The branch ${branch} does not exist in Git, throwing error`);
      // If we wanted to make it work, we have to create new branch from the other package content.
      //  If we ran just the git.branch([mergeFromBranch]), then we create branch with the same exact content as mergeTo.
      //  Which we do not want. We want mergeFrom
      await git.checkoutLocalBranch(branch);
    }

    return branchExists;
  }

  /**
   * Performs the 'git clone' using the {@link git} and into the {@link gitInitialDirectory}. This method is used for merge commits, for classic commits we have {@link cloneBeforeCommit}.
   * Note that method switches the git to the {@link mergeToBranch}.
   * @param mergeToBranch If null then it is considered to be the current branch (therefore it exists)
   */
  private static async cloneBeforeMerge(
    git: SimpleGit,
    gitInitialDirectory: string,
    repoURLWithAuthorization: string,
    mergeFromBranch: string,
    mergeToBranch: string | null,
    isLastAccessToken: boolean
  ): Promise<CloneBeforeMergeResult> {
    let cloneResult: CloneBeforeMergeResult;
    let mergeFromBranchExists: boolean = false;
    let mergeToBranchExists: boolean = false;

    try {
      // Just clone it full, we could perform some optimizations though, but merging is rare operation anyways
      await gitCloneBasic(git, gitInitialDirectory, repoURLWithAuthorization, false, false, undefined);
      const branches = await git.branch();

      if (mergeToBranch === null) {
        mergeToBranchExists = true;
      }
      else {
        mergeToBranchExists = await GitCommit.checkoutBranchIfExists(git, branches, mergeToBranch);
      }
      const mergeToBranchExplicitName = (await git.branch()).current;


      const currentBranch = (await git.branch()).current;
      mergeFromBranchExists = await GitCommit.checkoutBranchIfExists(git, branches, mergeFromBranch);
      await git.checkout(currentBranch);      // Go back to the mergeToBranch

      cloneResult = {
        mergeFromBranchExists,
        mergeToBranchExists,
        mergeToBranchExplicitName: mergeToBranchExplicitName,
        isClonedSuccessfully: true,
      };
    }
    catch(error) {
      cloneResult = {
        mergeFromBranchExists,
        mergeToBranchExists,
        mergeToBranchExplicitName: "",    // We failed anyways, so no need to provide correct value if it is present
        isClonedSuccessfully: false,
      };
    }

    if (isLastAccessToken && !cloneResult.isClonedSuccessfully) {
      throw new Error("Clone for merge failed for the last access token to check.");
    }

    return cloneResult;
  }

  /**
   * Performs the 'git clone' using the {@link git} and into the {@link gitInitialDirectory}. It is used before classic commit, for merge commits we have {@link cloneBeforeMerge}.
   */
  private static async cloneBeforeCommit(
    git: SimpleGit,
    gitInitialDirectory: string,
    repoURLWithAuthorization: string,
    branch: string | null,
    localLastCommitHash: string,
    hasSetLastCommit: boolean,
    isLastAccessToken: boolean
  ): Promise<{ isNewlyCreatedBranchOnlyInDS: boolean, isCloneSuccessful: boolean }> {
    let isNewlyCreatedBranchOnlyInDS = false;

    try {
      await gitCloneBasic(git, gitInitialDirectory, repoURLWithAuthorization, true, false, branch ?? undefined);
    }
    catch (cloneError: any) {
      try {
        // It is possible that the branch is newly created inside DS.
        // It is newly possible (since Git 2.49 from March 2025) to easily fetch specific commit using git options
        // https://stackoverflow.com/questions/31278902/how-to-shallow-clone-a-specific-commit-with-depth-1
        if (hasSetLastCommit) {
          const options = [
            "--depth", "1",
            "--revision", localLastCommitHash,
          ];
          await git.clone(repoURLWithAuthorization, ".", options);
          isNewlyCreatedBranchOnlyInDS = true;
        }
        else {
          // Just try to get whole history and hopefully it will work.
          await git.clone(repoURLWithAuthorization, ".");
        }
        if (branch !== null) {
          await git.checkoutLocalBranch(branch);
        }
      }
      catch(cloneError2: any)  {
        if (isLastAccessToken) {
          throw cloneError2;       // Every access token failed
        }
        return {
          isNewlyCreatedBranchOnlyInDS,
          isCloneSuccessful: false,
        };
      }
    }

    return {
      isNewlyCreatedBranchOnlyInDS,
      isCloneSuccessful: true,
    };
  }

  /**
   * Performs the git add and git commit with given {@link commitMessage}
   * Expects the {@link git} to be on correct branch.
   * @param files - Items can be both files and directories
   */
  private static async createClassicGitCommit(
    git: SimpleGit,
    files: string[],
    commitMessage: string,
  ) {
    await git.add(files);

    let commitResult: CommitResult = await git.commit(commitMessage);
    return commitResult;
  }


  /**
   * Similar to the {@link createClassicGitCommit}, but for merge.
   * It possibly prefixes the message with the {@link mergeDefaultCommitMessage} based on the {@link shouldAppendAfterDefaultMergeCommitMessage}.
   */
  private static async createMergeCommit(
    git: SimpleGit,
    files: string[],
    mergeDefaultCommitMessage: string,
    commitMessage: string,
    committerName: string,
    committerEmail: string,
    mergeFromBranchName: string,
    shouldAppendAfterDefaultMergeCommitMessage: boolean,
  ) {
    // 1) Sometime before in the flow we create merge state in git using git merge --no-ff
    //   - This tries merging, but never creates the actual merge commit
    // 2) Only reason why we did that is the get the default merge commit message, we get that from ".git/MERGE_MSG"
    // 3) Now we can actally create the merge:
    //  a) We simply run normal commit with --amend, it changes the created merge commit messages

    console.info("Status before:");
    console.info(await git.status());
    await git.add(files);
    console.info("Status after add:");
    console.info(await git.status());
    await git.commit(mergeDefaultCommitMessage);
    const lastCommitMessage = (await getLastCommit(git))?.message ?? "";
    const commitMessages: string[] = [];
    if (shouldAppendAfterDefaultMergeCommitMessage) {
      commitMessages.push(mergeDefaultCommitMessage);
    }
    commitMessages.push(commitMessage);
    // Modify the message ... it keeps the old default text, but adds the new one
    // The --no-edit option is not needed since we provide the commit message explictly (othwerise the option ensures not open editor for the amend)
    return await git.commit(commitMessages, undefined, { "--amend": null, });
  }


  /**
   * Sets the name and email of the {@link git} instance.
   */
  public static async setUserConfigForGitInstance(git: SimpleGit, committerName: string, committerEmail: string) {
    const committerNameToUse = committerName;
    const committerEmailToUse = committerEmail;
    await git.addConfig("user.name", committerNameToUse);
    await git.addConfig("user.email", committerEmailToUse);
  }
}
