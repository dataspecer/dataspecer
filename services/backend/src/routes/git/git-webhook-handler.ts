//  How to handle resources coming from Git:
// Chosen variant:
//   We expect the git file to be named as a name.datastoreType.format
//   We store it as a datastore under the directory (pacakge) with the given name chosen as datastore type

// !Not! chosen alternative
//   We expect the resource to not have any meta file.
//   We expect that the given name contains no "/" and the name is unique and as such can be used as a project ir
//   We create meta file with the relevant data - iri, projectIri and type to be "git-resource" (Maybe change type)
//   With next commit we all store it back.
//  ... However some cons - why it was not chosen - we can not expect the user to porvide projectIri, all we can expect from him is to provide unique iri, but at most on the current directory level.


import { asyncHandler } from "../../utils/async-handler.ts";
import express from "express";
import { updateBlob, updateResourceMetadata } from "../resource.ts";
import _ from "lodash";
import { mergeStateModel, resourceModel } from "../../main.ts";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-nodejs";
import configuration from "../../configuration.ts";
import { GitPull, GitPullFields, WEBHOOK_PATH_PREFIX } from "@dataspecer/git-node";
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
    projectIri: resource.projectIri,
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
  const pullContainer = new GitPull(pullUpdateParams);
  const { createdMergeState } = await pullContainer.updateDSRepositoryByGitPull(commits.length);

  // Actually we don't need to answer based on response, since this comes from git provider, only think we might need is to notify users that there was update, which we do by setting the isInSyncWithRemote
  response.sendStatus(200);
  return;
});


/**
 * @returns The model and format from given {@link value}, which is of the following format. The * are there to separate "tokens".
 *
 * [anything]*separator*model*separator*format
 *  So the last two tokens created by {@link separator} are returned. If there is not enough separators the relevant values are null.
 * @example extractModelAndFormat(value="a.b.c.d.e.gh.meta.json", separator=".") returns {model = "meta", format = "json"}
 * @deprecated No longer used, but the method is probably implemented correctly
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
