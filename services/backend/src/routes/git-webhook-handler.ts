import { asyncHandler } from "../utils/async-handler.ts";
import express from "express";
import { getMergeFromMergeToMappingForGitAndDS, getMetadataDatastoreFile, GitProvider, GitProviderEnum, isDatastoreForMetadata, MergeStateCause } from "@dataspecer/git";
import { GitProviderFactory } from "../git-providers/git-provider-factory.ts";
import { GIT_RAD_STR_BOT_USERNAME, GITHUB_RAD_STR_BOT_ABSOLUTE_CONTROL_TOKEN } from "../git-never-commit.ts";
import fs from "fs";
import path from "path";
import { createResource, updateBlob, updateResourceMetadata } from "./resource.ts";
import _ from "lodash";
import { dsPathJoin } from "../utils/git-utils.ts";
import { mergeStateModel, resourceModel } from "../main.ts";
import { updateDSRepositoryByPullingGit } from "./pull-remote-repository.ts";
import { WEBHOOK_PATH_PREFIX } from "../models/git-store-info.ts";
import { DatastoreInfo, DirectoryNode, FilesystemNode, FilesystemAbstraction, getMergeFromMergeToForGitAndDS } from "@dataspecer/git";
import { compareGitAndDSFilesystems } from "../export-import/filesystem-abstractions/backend-filesystem-comparison.ts";


export const handleWebhook = asyncHandler(async (request: express.Request, response: express.Response) => {
  // console.info("Requested URL: ", request.originalUrl);
  // console.info("Webhook - Body: ", request.body);
  // console.info("Webhook - Body payload: ", request.body.payload);
  response.type("text/plain");      // TODO RadStr: Not sure if there is any good reason why was I doing this.

  const { gitProvider, webhookPayload } = GitProviderFactory.createGitProviderFromWebhookRequest(request);
  const dataForWebhookProcessing = await gitProvider.extractDataForWebhookProcessing(webhookPayload);
  if (dataForWebhookProcessing === null) {
    return;
  }
  const { commits, cloneURL, iri, branch } = dataForWebhookProcessing;

  console.info("dataForWebhookProcessing", dataForWebhookProcessing);

  const resource = await resourceModel.getPackage(iri);
  if (resource === null) {
    return;
  }

  const isCloneSuccess = await updateDSRepositoryByPullingGit(iri, gitProvider, branch, cloneURL, WEBHOOK_PATH_PREFIX, resource.lastCommitHash, commits.length);
  // Actually we don't need to answer based on response, since this comes from git provider, only think we might need is to notify users that there was update
  return;
});


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
 * @returns True if there were conflicts, false otherwise
 */
export async function saveChangesInDirectoryToBackendFinalVersion(
  gitInitialDirectoryParent: string,
  iri: string,
  gitProvider: GitProvider,
  shouldSetMetadataCache: boolean,
  dsLastCommitHash: string,
  gitLastCommitHash: string,
  commonCommitHash: string,
  mergeStateCause: Omit<MergeStateCause, "merge">,
): Promise<boolean> {
  // Merge from is DS
  const {
    diffTreeComparisonResult,
    filesystemMergeFrom, fakeRootMergeFrom, rootMergeFrom, pathToRootMetaMergeFrom,
    filesystemMergeTo, fakeRootMergeTo, rootMergeTo, pathToRootMetaMergeTo,
  } = await compareGitAndDSFilesystems(gitProvider, iri, gitInitialDirectoryParent, mergeStateCause);

  const { valueMergeFrom: lastHashMergeFrom, valueMergeTo: lastHashMergeTo } = getMergeFromMergeToForGitAndDS(mergeStateCause, dsLastCommitHash, gitLastCommitHash);
  const filesystemFakeRoots = { fakeRootMergeFrom, fakeRootMergeTo };
  const { gitResultNameSuffix } = getMergeFromMergeToMappingForGitAndDS(mergeStateCause);

  const gitRootDirectory = filesystemFakeRoots["fakeRoot" + gitResultNameSuffix as keyof typeof filesystemFakeRoots];              // TODO RadStr: Just backwards compatibility with code so I don't have to change much
  const gitRootDirectoryName = gitRootDirectory.name;

  // TODO RadStr: Rename ... and update based on the conflicts resolution, like we do not want to update when there is conflict
  await saveChangesInDirectoryToBackendFinalVersionRecursiveFinalFinal(gitRootDirectoryName, gitRootDirectory, gitInitialDirectoryParent, gitProvider, filesystemMergeTo);      // TODO RadStr: Maybe await is unnecessary

  const createdMergeStateId = mergeStateModel.createMergeStateIfNecessary(
    iri, "pull", diffTreeComparisonResult,
    lastHashMergeFrom, lastHashMergeTo, commonCommitHash,
    rootMergeFrom, pathToRootMetaMergeFrom, filesystemMergeFrom.getFilesystemType(),
    rootMergeTo, pathToRootMetaMergeTo, filesystemMergeTo.getFilesystemType());
  return createdMergeStateId !== null;
}


async function saveChangesInDirectoryToBackendFinalVersionRecursiveFinalFinal(
  currentlyProcessedDirectoryNodeName: string,
  currentlyProcessedDirectoryNode: DirectoryNode,
  treePath: string,
  gitProvider: GitProvider,
  filesystem: FilesystemAbstraction,
) {
  console.info("RECURSIVE MAPPING", currentlyProcessedDirectoryNode);
  await handleResourceUpdateFinalVersion(treePath, currentlyProcessedDirectoryNodeName, currentlyProcessedDirectoryNode, filesystem);

  for (const [name, value] of Object.entries(currentlyProcessedDirectoryNode.content)) {
    // TODO RadStr: Name vs IRI
    if(value.type === "directory") {
      const newDirectory = dsPathJoin(treePath, name);
      await saveChangesInDirectoryToBackendFinalVersionRecursiveFinalFinal(name, value, newDirectory, gitProvider, filesystem);
    }
    else {
      await handleResourceUpdateFinalVersion(treePath, name, value, filesystem);
    }
  }
}

// TODO RadStr: Move elsewhere in code. Used both in backend and DiffTree dialog
export type ComparisonData = {
  oldVersion: FilesystemNode | null;
  affectedDataStore: DatastoreInfo;
  newVersion: FilesystemNode | null;
}

type ComparisonResult = {
  changed: ComparisonData[],
  removed: ComparisonData[],
  created: ComparisonData[],
}

async function updateFilesystemBasedOnChanges(changes: ComparisonResult, filesystem: FilesystemAbstraction) {
  for (const removed of changes.removed) {
    filesystem.removeDatastore(removed.oldVersion!, removed.affectedDataStore.type, false);
  }
  for (const changed of changes.changed) {
    filesystem.changeDatastore(filesystem, changed, true);
  }

  const createdDirectories = changes.created.filter(created => created.newVersion?.type === "directory");
  const createdFiles = changes.created.filter(created => created.newVersion?.type === "file");
  for (const createdDirectory of createdDirectories) {    // First create the directories
    filesystem.createDatastore(filesystem, createdDirectory.newVersion!, createdDirectory.affectedDataStore);
  }

  for (const createdFile of createdFiles) {
    filesystem.createDatastore(filesystem, createdFile.newVersion!, createdFile.affectedDataStore);
  }
}

// TODO RadStr: Better name for the datastoreIdentifier maybe filesystemNodeIdentifier?
/**
 *
 * @returns Returns true if the given file has only the data without any other related files - no metadata, or anything.
 *  This happens when user adds new file from git without explicitly creating the .meta and .model file.
 */
function isFileAddedFromGit(datastoreIdentifier: string, datastores: DatastoreInfo[]): boolean {
  return datastores.length === 1 && datastoreIdentifier === datastores[0].fullName;
}

async function handleResourceUpdateFinalVersion(
  treePath: string,
  filesystemNodeName: string,
  filesystemNode: FilesystemNode,
  filesystem: FilesystemAbstraction
) {
  if (isFileAddedFromGit(filesystemNodeName, filesystemNode.datastores)) {
    const parentIri = filesystem.getParentForNode(filesystemNode)?.metadataCache.iri;
    if (parentIri !== undefined) {
      await createNewResourceUploadedFromGit(parentIri, treePath, filesystemNodeName);
    }
    else {
      console.error("Missing parent IRI, so we can not create");    // TODO RadStr: Not sure, this probably should not happen, I should always have the parentIri available
    }
    return;
  }

  const datastoreTypesToDatastores: Record<string, DatastoreInfo> = {};

  for (const datastore of filesystemNode.datastores) {
    datastoreTypesToDatastores[datastore.type] = datastore;

    // TODO RadStr: If just for debug
    if(filesystemNode.type === "directory") {
      console.info("Directroy");
    }

    // TODO RadStr: This really means that metadataCache is not a cache but a hardcoded thing which always has to exist
    // TODO RadStr:  - since the iri may differ from name for example in the case of imported DCAT-AP
    const nodeIri = filesystemNode.metadataCache.iri ?? filesystemNodeName;

    // TODO RadStr: Should check if it already exists, or if not it should be created
    if (isDatastoreForMetadata(datastore.type)) {
      // TODO: Just for now - I don't know about used encodings, etc. - but this is just detail
      const metaFileContent = JSON.parse(fs.readFileSync(datastore.fullPath, "utf-8"));
      // TODO RadStr: This really means that metadataCache is not a cache but a hardcoded thing which always has to exist
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


function setMetadataCache(node: FilesystemNode, directory: string, shouldSetMetadataCache: boolean) {
  if (shouldSetMetadataCache) {
    const metadataDatastore = getMetadataDatastoreFile(node.datastores);
    if (metadataDatastore === undefined) {
      console.error("Metadata datastore is missing, that is there is no .meta file or its equivalent (depending on filesystem)", { node, directory, datastores: node.datastores });
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
  const WEBHOOK_HANDLER_URL = "https://789d-2a00-1028-9192-49e6-17b-1f2d-ea59-1f4.ngrok-free.app/git/webhook-test2";
  const OWNER = GIT_RAD_STR_BOT_USERNAME;
  const REPO = "test-webhooks";

  // The token has to have commiting rights
  const webhookResponse = GitProviderFactory
    .createGitProvider(GitProviderEnum.GitHub)
    .createWebhook(GITHUB_RAD_STR_BOT_ABSOLUTE_CONTROL_TOKEN ?? "", OWNER ?? "undefined-owner", REPO, WEBHOOK_HANDLER_URL, ["push", "pull_request"]);

  const data = (await webhookResponse).json();
  console.log("Fetched webhook response: ", data);
});
