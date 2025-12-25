// TODO RadStr: Put on better place
//  How to handle resources coming from Git:
// Chosen variant:
//   We expect the git file to be named as a datastoreType.format
//   We store it as a datastore under the directory (pacakge) with the given name chosen as datastore type

// !Not! chosen alternative
//   We expect the resource to not have any meta file.
//   We expect that the given name contains no "/" and the name is unique and as such can be used as a project iri (If we wanted to be more strict about this we would have to not use the names but the projectIris/iris from the meta file - TODO RadStr: Maybe we will?)
//   We create meta file with the relevant data - iri, projectIri and type to be "git-resource" (TODO RadStr: Maybe change type)
//   With next commit we all store it back.
//  ... However some cons - why it was not chosen - we can not expect the user to porvide projectIri, all we can expect from him is to provide unique iri, but at most on the current directory level.


import { asyncHandler } from "../utils/async-handler.ts";
import express from "express";
import { ComparisonData, dsPathJoin, getMergeFromMergeToMappingForGitAndDS, GitProvider, isDatastoreForMetadata, MergeStateCause, DatastoreInfo, DirectoryNode, FilesystemNode, FilesystemAbstraction, getMergeFromMergeToForGitAndDS } from "@dataspecer/git";
import fs from "fs";
import path from "path";
import { updateBlob, updateResourceMetadata } from "./resource.ts";
import _ from "lodash";
import { mergeStateModel, resourceModel } from "../main.ts";
import { updateDSRepositoryByPullingGit } from "./pull-remote-repository.ts";
import { compareGitAndDSFilesystems } from "../export-import/filesystem-abstractions/backend-filesystem-comparison.ts";
import { MergeEndInfoWithRootNode } from "../models/merge-state-model.ts";
import { SimpleGit } from "simple-git";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-nodejs";
import configuration from "../configuration.ts";
import { GitProviderFactory } from "@dataspecer/git-node/git-providers";
import { WEBHOOK_PATH_PREFIX } from "@dataspecer/git-node";
import { ResourceModelTODOBetterName } from "../export-import/export.ts";


export const handleWebhook = asyncHandler(async (request: express.Request, response: express.Response) => {
  // console.info("Requested URL: ", request.originalUrl);
  // console.info("Webhook - Body: ", request.body);
  // console.info("Webhook - Body payload: ", request.body.payload);
  response.type("text/plain");      // TODO RadStr: Not sure if there is any good reason why was I doing this.

  const { gitProvider, webhookPayload } = GitProviderFactory.createGitProviderFromWebhookRequest(request, httpFetch, configuration);
  const dataForWebhookProcessing = await gitProvider.extractDataForWebhookProcessing(webhookPayload, resourceModel.getResourceForGitUrlAndBranch);
  if (dataForWebhookProcessing === null) {
    return;
  }
  const { commits, cloneURL, iri, branch } = dataForWebhookProcessing;

  console.info("dataForWebhookProcessing", dataForWebhookProcessing);   // TODO RadStr Debug: Debug

  const resource = await resourceModel.getPackage(iri);
  if (resource === null) {
    return;
  }

  const createdMergeState = await updateDSRepositoryByPullingGit(iri, gitProvider, branch, cloneURL, WEBHOOK_PATH_PREFIX, resource.lastCommitHash, resourceModel, commits.length);
  // Actually we don't need to answer based on response, since this comes from git provider, only think we might need is to notify users that there was update, which we do by setting the isInSyncWithRemote
  return;
});

export type GitChangesToDSPackageStoreResult = {
  createdMergeState: boolean;
  conflictCount: number;
}

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
export async function saveChangesInDirectoryToBackendFinalVersion(
  remoteRepositoryUrl: string,
  git: SimpleGit,
  gitInitialDirectoryParent: string,
  iri: string,
  gitProvider: GitProvider,
  dsLastCommitHash: string,
  gitLastCommitHash: string,
  commonCommitHash: string,
  branch: string,
  mergeStateCause: Omit<MergeStateCause, "merge">,
  resourceModelForDS: ResourceModelTODOBetterName,
): Promise<GitChangesToDSPackageStoreResult> {
  // Merge from is DS
  const {
    diffTreeComparisonResult,
    filesystemMergeFrom, fakeRootMergeFrom, rootMergeFrom, pathToRootMetaMergeFrom,
    filesystemMergeTo, fakeRootMergeTo, rootMergeTo, pathToRootMetaMergeTo,
  } = await compareGitAndDSFilesystems(
    gitProvider, iri, gitInitialDirectoryParent, mergeStateCause, resourceModelForDS);

  const { valueMergeFrom: lastHashMergeFrom, valueMergeTo: lastHashMergeTo } = getMergeFromMergeToForGitAndDS(mergeStateCause, dsLastCommitHash, gitLastCommitHash);
  const filesystemFakeRoots = { fakeRootMergeFrom, fakeRootMergeTo };
  const { gitResultNameSuffix } = getMergeFromMergeToMappingForGitAndDS(mergeStateCause);
  const gitRootDirectory = filesystemFakeRoots["fakeRoot" + gitResultNameSuffix as keyof typeof filesystemFakeRoots];              // TODO RadStr: Just backwards compatibility with code so I don't have to change much


  try {
    await git.checkout(dsLastCommitHash);
    // Basically check against the commit the package is supposed to represent, if we did not change anything, we can always pull without conflict.
    // Otherwise we changed something and even though we could handle it automatically. We let the user resolve everything manually, it is his responsibility.
    const comparisonBetweenCurrentDSPackageAndCorrespondingCommit = await compareGitAndDSFilesystems(
      gitProvider, iri, gitInitialDirectoryParent, mergeStateCause, resourceModelForDS);
    const canPullWithoutCreatingMergeState = comparisonBetweenCurrentDSPackageAndCorrespondingCommit.diffTreeComparisonResult.conflicts.length === 0;

    if (canPullWithoutCreatingMergeState) {
      // TODO RadStr: Rename ... and update based on the conflicts resolution, like we do not want to update when there is conflict
      await git.checkout(gitLastCommitHash);
      await saveChangesInDirectoryToBackendFinalVersionRecursiveFinalFinal(gitRootDirectory, gitInitialDirectoryParent, gitProvider, filesystemMergeTo);
      await resourceModelForDS.updateLastCommitHash(iri, gitLastCommitHash, "pull");

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

  const mergeFromInfo: MergeEndInfoWithRootNode = {
    rootNode: rootMergeFrom,
    filesystemType: filesystemMergeFrom.getFilesystemType(),
    lastCommitHash: lastHashMergeFrom,
    branch: branch,
    rootFullPathToMeta: pathToRootMetaMergeFrom,
    gitUrl: remoteRepositoryUrl,
  };
  const mergeToInfo: MergeEndInfoWithRootNode = {
    rootNode: rootMergeTo,
    filesystemType: filesystemMergeTo.getFilesystemType(),
    lastCommitHash: lastHashMergeTo,
    branch: branch,
    rootFullPathToMeta: pathToRootMetaMergeTo,
    gitUrl: remoteRepositoryUrl,
  };

  const createdMergeStateId = mergeStateModel.createMergeStateIfNecessary(
    iri, "", "pull", diffTreeComparisonResult, commonCommitHash, mergeFromInfo, mergeToInfo);
  return {
    createdMergeState: true,
    conflictCount: diffTreeComparisonResult.conflicts.length,
  };
}


async function saveChangesInDirectoryToBackendFinalVersionRecursiveFinalFinal(
  currentlyProcessedDirectoryNode: DirectoryNode,
  treePath: string,
  gitProvider: GitProvider,
  filesystem: FilesystemAbstraction,
) {
  console.info("RECURSIVE MAPPING", currentlyProcessedDirectoryNode);
  await handleResourceUpdateFinalVersion(currentlyProcessedDirectoryNode);

  for (const [name, value] of Object.entries(currentlyProcessedDirectoryNode.content)) {
    // TODO RadStr: Name vs IRI
    if(value.type === "directory") {
      const newDirectory = dsPathJoin(treePath, name);
      await saveChangesInDirectoryToBackendFinalVersionRecursiveFinalFinal(value, newDirectory, gitProvider, filesystem);
    }
    else {
      await handleResourceUpdateFinalVersion(value);
    }
  }
}

type ComparisonResult = {
  changed: ComparisonData[],
  removed: ComparisonData[],
  created: ComparisonData[],
}

/**
 * @deprecated TODO RadStr: I guess? I added the parentIri to createDatastore and since I am not calling from anywhere we can probably just remove this method.
 */
async function updateFilesystemBasedOnChanges(changes: ComparisonResult, filesystem: FilesystemAbstraction) {
  throw new Error("Calling deprecated method, which was not yet extend by the new api which contains parentIri")
  // for (const removed of changes.removed) {
  //   filesystem.removeDatastore(removed.oldVersion!, removed.affectedDataStore.type, false);
  // }
  // for (const changed of changes.changed) {
  //   filesystem.changeDatastore(filesystem, changed, true);
  // }

  // const createdDirectories = changes.created.filter(created => created.newVersion?.type === "directory");
  // const createdFiles = changes.created.filter(created => created.newVersion?.type === "file");
  // for (const createdDirectory of createdDirectories) {    // First create the directories
  //   filesystem.createDatastore(filesystem, createdDirectory.newVersion!, createdDirectory.affectedDataStore);
  // }

  // for (const createdFile of createdFiles) {
  //   filesystem.createDatastore(filesystem, createdFile.newVersion!, createdFile.affectedDataStore);
  // }
}

async function handleResourceUpdateFinalVersion(
  filesystemNode: FilesystemNode,
) {
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
      const metaFileContent = JSON.parse(fs.readFileSync(datastore.fullPath, "utf-8"));
      // TODO RadStr:  - since the iri may differ from name for example in the case of imported DCAT-AP
      await updateResourceMetadata(nodeIri, metaFileContent!.userMetadata);
      continue;
    }
    else {
        // TODO: Just for now - I don't know about used encodings, etc. - but this is just detail
      const packageModelFileContent = JSON.parse(fs.readFileSync(datastore.fullPath, "utf-8"));
      await updateBlob(nodeIri, datastore.type, packageModelFileContent);
    }
  }
}

function readMetadataFile(metadataFilePath: string) {
  const metadata = JSON.parse(fs.readFileSync(metadataFilePath, "utf-8"));
  return metadata;
}


// TODO RadStr: Maybe can be better integrated into the ignore file
function ignoredFilesFilter(file: string) {
  return file === "README.md";
}

/**
 * Takes the list of names in {@link names} and {@link prefixSeparator}, which you can think of as separator of prefix chunks, which can be joined to create longest prefix.
 * @returns Groups the {@link names} by longest prefix and the invalid names should be in this case probably things, which don't have a single {@link prefixSeparator}.
 *
 * @todo We are using groupByPrefix instead, which is simpler to implement and covers the current use-case
 * @deprecated See TODO
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


/**
 * TODO RadStr: Maybe should be in some utils.ts file instead
 * @deprecated Implementation moved to different file!!!
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
 * @returns The model and format from given {@link value}, which is of the following format. The * are there to separate "tokens".
 *
 * [anything]*separator*model*separator*format
 *  So the last two tokens created by {@link separator} are returned. If there is not enough separators the relevant values are null.
 * @example extractModelAndFormat(value="a.b.c.d.e.gh.meta.json", separator=".") returns {model = "meta", format = "json"}
 */
function extractModelAndFormat(value: string, separator: string): {model: string | null, format: string | null} {
  let index = value.length + 1;
  let previousIndex = -1;
  let model: string | null = null;
  let format: string | null = null;
  for (let i = 0; i < 2; i++) {
    previousIndex = index;
    index = value.lastIndexOf(separator, index - 1);
    if (index === -1) {
      return { model, format };
    }
    if (i === 0) {
      format = value.substring(index + 1);
    }
    else {
      model = value.substring(index + 1, previousIndex);
    }
  }

  return { model, format };
}

/**
 * @deprecated Implementation moved to different file!!!
 */
type PrefixResult = {
  prefixGroupings: Record<string, DatastoreInfo[]>,
  invalidNames: string[];
};

/**
 * This method takes {@link names}, remove the last {@link postfixCount} chunks, which starts with {@link prefixSeparator}.
 *
 * This method covers current use-case where the files have the following names [name].[dataStoreId].[format], (In the result the datastoreId is stored inside type property)
 *  where dataStoreId is for example "model" or "meta" and format is usually "json" (but in future may be "yaml" or "rdf") and name is currently the iri of resource.
 *  The "." is the {@link prefixSeparator}.
 *
 * TODO RadStr: Maybe should be in some utils.ts file instead, same for the other prefix methods.
 * @deprecated Implementation moved to different file - and CHANGED!!!!!!!!!
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
function groupByPrefix(prefixSeparator: string, postfixCount: number, ...names: string[]): PrefixResult {
  const invalidNames: string[] = [];
  const prefixGroupings: Record<string, DatastoreInfo[]> = {};
  names
    .forEach(name => {
      const index = findNthlastSeparator(name, prefixSeparator, postfixCount);
      if (index === -1) {
        invalidNames.push(name);
        return null;
      }
      const prefix = name.substring(0, index);

      if (prefixGroupings[prefix] === undefined) {
        prefixGroupings[prefix] = [];
      }

      const afterPrefix = name.substring(index);
      let type: string;
      if (postfixCount <= 1) {
        // TODO RadStr: Just fallback for errors, but should not really ever happen
        type = afterPrefix.substring(1);
      }
      else {
        const typeIndex = findNthlastSeparator(name, prefixSeparator, postfixCount - 1);
        type = name.substring(index, typeIndex);
      }

      const prefixName: DatastoreInfo = {
        fullName: name,
        afterPrefix,
        type,
        name: name,
        format: "TODO: RadStr no longer correct - use the different implementation",
        fullPath: "TODO: RadStr no longer correct - use the different implementation"
      };
      prefixGroupings[prefix].push(prefixName);
    });

  return {
    prefixGroupings,
    invalidNames
  };
}


/**
 * Just calls {@link groupByPrefix} with prefixSeparator === "." and postfixCount === 2
 * @deprecated Implementation moved to different file
 */
function groupByPrefixDSSpecific(...names: string[]): PrefixResult {
  return groupByPrefix(".", 2, ...names);
}

/**
 * @deprecated The old version, which could handle only the meta and model file
 */
async function updateResourceFullyOldVersion(metaFile: fs.Dirent | undefined, modelFile: fs.Dirent | undefined) {
  // TODO: Should check if the resource/blob exists, that is if it is actually update or create
  // TODO: I don't know why it says that we should use parentPath, when it is empty, unlike path???
  console.info("CONTENT:", metaFile, modelFile);
  const metaFullPath = dsPathJoin(metaFile?.path ?? "", metaFile?.name ?? "");
  const modelFullPath = dsPathJoin(modelFile?.path ?? "", modelFile?.name ?? "");

  console.info("FULL PATHS", metaFullPath, modelFullPath);

  // TODO: Just for now - I don't know about used encodings, etc. - but this is just detail
  const metaFileContent = metaFile === undefined ? null : JSON.parse(fs.readFileSync(metaFullPath, "utf-8"));

  // TODO: Can it actually take null/undefined in parameter or not? ... that is use ! or not
  // TODO: + The defaults should be better
  await updateResourceMetadata(metaFileContent!.iri, metaFileContent!.userMetadata);
  const packageModelFileContent = modelFile === undefined ? null : JSON.parse(fs.readFileSync(modelFullPath, "utf-8"));
  // TODO: Better name, not "model"
  await updateBlob(metaFileContent!.iri, "model", packageModelFileContent);
}

// TODO RadStr: jmeno - Oni to uplne nejsou datastores ... meta treba neni
// TODO RadStr: Document
async function updateResourceFully(fullPathToDirectory: string, datastoreIdentifier: string, datastores: DatastoreInfo[]) {
  const datastoreTypesToDatastores: Record<string, DatastoreInfo> = {};
  if (datastoreIdentifier.length === 0) {   // The directory files
    datastoreIdentifier = path.basename(fullPathToDirectory);
  }

  for (const datastore of datastores) {
    datastoreTypesToDatastores[datastore.type] = datastore;

    const fullPathToDatastore = dsPathJoin(fullPathToDirectory, datastore.fullName);

    // TODO RadStr: Should check if it already exists, or if not it should be created
    if (isDatastoreForMetadata(datastore.type)) {
      // TODO: Just for now - I don't know about used encodings, etc. - but this is just detail
      const metaFileContent = JSON.parse(fs.readFileSync(fullPathToDatastore, "utf-8"));
      await updateResourceMetadata(datastoreIdentifier, metaFileContent!.userMetadata);
      continue;
    }
    else {
      // TODO: Just for now - I don't know about used encodings, etc. - but this is just detail
      const packageModelFileContent = JSON.parse(fs.readFileSync(fullPathToDatastore, "utf-8"));
      await updateBlob(datastoreIdentifier, datastore.type, packageModelFileContent);
    }
  }
}

/**
 * @param name is the name of the file of the git resource, which is in reality the datastoreType of the resource - TODO RadStr: Only datastoretype? or datastoretype.format
 */
async function createNewResourceUploadedFromGit(parentIri: string, path: string, name: string) {
  // TODO RadStr: If I want to create separate file ... however there are issues, which stem from the fact that there becomes incosistency between DS filesystem (there is new .meta and .model file) and git system (only one file)

  // const iri = await createResource(parentIri, "added-from-git-type", name, {"label": {"cs": name}});
  // const fullPathToFile = dsPathJoin(fullPathToDirectory, name);
  // console.info("fullPathToFile:", fs.statSync(fullPathToFile));
  // const fileContent = fs.readFileSync(fullPathToFile, "utf-8");
  // console.info("TODO RadStr: fileContent", { fileContent });
  // await updateBlob(iri, "added-from-git-type-nname", fileContent);
  // await updateBlob(iri, "added-from-git-type-name", fileContent);

  // Trying to use as the model for the package, however by default we don't show the non-model stuff
  // ... This is better, we will end up only with one file. Only one issue is that we have to solve the problem when user decides to explicitly create .meta and .model
  //     in git, because he would like to have metadata for this file ... however what it means - it means that user removed the old file so we remove the resource
  //       and then added new .meta and .model file, so all we have to do is just handle the cases, where new .meta and .model file is added to the git

  throw new Error("TODO RadStr: I will fix it later, the issue is that I am using treePath instead classic path and storing it to the parent as a model")

  const fileContent = fs.readFileSync(path, "utf-8");
  await updateBlob(parentIri, name, fileContent);
}

/**
 * @deprecated TODO RadStr Later: Just debug method
 */
export const createRandomWebook = asyncHandler(async (request: express.Request, response: express.Response) => {
  throw new Error("TODO: Fix errors if needed. But it is just for playing out with webhooks, so you can safely remove this method")
  // const WEBHOOK_HANDLER_URL = "https://789d-2a00-1028-9192-49e6-17b-1f2d-ea59-1f4.ngrok-free.app/git/webhook-test2";
  // const OWNER = configuration.gitConfiguration?.dsBotUserName;
  // const REPO = "test-webhooks";

  // // The token has to have commiting rights
  // const webhookResponse = GitProviderFactory
  //   .createGitProvider(GitProviderEnum.GitHub)
  //   .createWebhook(configuration.gitConfiguration?.dsBotAbsoluteGitProviderControlToken ?? "", OWNER ?? "undefined-owner", REPO, WEBHOOK_HANDLER_URL, ["push", "pull_request"]);

  // const data = (await webhookResponse).json();
  // console.log("Fetched webhook response: ", data);
});
