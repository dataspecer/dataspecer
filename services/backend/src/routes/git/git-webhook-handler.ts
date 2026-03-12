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


import { asyncHandler } from "../../utils/async-handler.ts";
import express from "express";
import { DatastoreComparison, dsPathJoin, isDatastoreForMetadata, DatastoreInfo, FilesystemAbstraction } from "@dataspecer/git";
import fs from "fs";
import path from "path";
import { updateBlob, updateResourceMetadata } from "../resource.ts";
import _ from "lodash";
import { mergeStateModel, resourceModel } from "../../main.ts";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-nodejs";
import configuration from "../../configuration.ts";
import { GitPullBase, GitPullFields, WEBHOOK_PATH_PREFIX } from "@dataspecer/git-node";
import { GitProviderNodeFactory } from "@dataspecer/git-node/git-providers";
import { createFilesystemFactoryParams } from "../../utils/filesystem-helpers.ts";


export const handleWebhook = asyncHandler(async (request: express.Request, response: express.Response) => {
  // TODO RadStr Debug: DEBUG prints
  // console.info("Requested URL: ", request.originalUrl);
  // console.info("Webhook - Body: ", request.body);
  // console.info("Webhook - Body payload: ", request.body.payload);

  const { gitProvider, webhookPayload } = GitProviderNodeFactory.createGitProviderFromWebhookRequest(request, httpFetch, configuration);
  const isPushWebhook = gitProvider.isPushWebhook(request.headers);
  if(!isPushWebhook) {
    response.sendStatus(200);
    return;
  }

  const getResourceForGitUrlAndBranch = async (gitRepositoryUrl: string, branch: string) => {return resourceModel.getResourceForGitUrlAndBranch(gitRepositoryUrl, branch)};
  const dataForWebhookProcessing = await gitProvider.extractDataForWebhookProcessing(webhookPayload, getResourceForGitUrlAndBranch);
  if (dataForWebhookProcessing === null) {
    return;
  }
  const { commits, cloneURL, iri, branch } = dataForWebhookProcessing;

  console.info("dataForWebhookProcessing", dataForWebhookProcessing);   // TODO RadStr Debug: Debug

  const resource = await resourceModel.getPackage(iri);
  if (resource === null) {
    return;
  }

  const webhookCommit = commits.at(-1);
  if (webhookCommit === undefined) {
    response.sendStatus(200);
    return;
  }

  const webhookCommitHash = gitProvider.extractHashFromWebhookCommitObject(webhookCommit);
  // Note that it may be technically possible that the webhook runs before we actually store the hash into database after the push.
  // However, it is highly unlikely. If that happens the user will just have new merge state that has zero changes.
  if (webhookCommitHash === resource.lastCommitHash) {
    // The commits comes from this Dataspecer instance.
    response.sendStatus(200);
    return;
  }

  const filesystemConstructorParams = createFilesystemFactoryParams(true);
  const pullUpdateParams: GitPullFields = {
    iri,
    gitProvider,
    branch,
    cloneURL,
    cloneDirectoryNamePrefix: WEBHOOK_PATH_PREFIX,
    dsLastCommitHash: resource.lastCommitHash,
    alwaysCreateMergeState: true,
    mergeStateModel: mergeStateModel,
    updateBlob: updateBlob,
    updateResourceMetadata: updateResourceMetadata,
    filesystemConstructorParams,
  };
  const pullContainer = new GitPullBase(pullUpdateParams);
  const createdMergeState = await pullContainer.updateDSRepositoryByGitPull(commits.length);

  // Actually we don't need to answer based on response, since this comes from git provider, only think we might need is to notify users that there was update, which we do by setting the isInSyncWithRemote
  response.sendStatus(200);
  return;
});


type ComparisonResult = {
  changed: DatastoreComparison[],
  removed: DatastoreComparison[],
  created: DatastoreComparison[],
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
