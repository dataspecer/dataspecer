import { z } from "zod";
import { asyncHandler } from "../../../utils/async-handler.ts";
import { mergeStateModel, resourceModel } from "../../../main.ts";
import express from "express";
import { GitProviderNodeFactory } from "@dataspecer/git-node/git-providers";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-nodejs";
import configuration from "../../../configuration.ts";
import { BaseResource, compareBackendFilesystems, MergeEndpointForComparison } from "@dataspecer/git-node";
import { GitIgnoreBase } from "@dataspecer/git";
import { createFilesystemFactoryParams } from "../../../utils/filesystem-helpers.ts";
import { MergeStateModel } from "../../../models/merge-state-model.ts";


/**
 * This handles the action, which should be performed, when merge state has all conflicts resolved.
 * This handler handles the finalizing of merge state caused by pulling.
 */
export const finalizePullMergeState = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    uuid: z.string().min(1),
  });
  const query = querySchema.parse(request.query);
  const { uuid } = query;

  try {
    const dataForComparison = await createDataForBackendComparisonForPull(uuid);
    if (dataForComparison.type === "error") {
      response.status(dataForComparison.responseStatus);
      response.json({ error: dataForComparison.responseText });
      return;
    }
    // TODO RadStr PR: ... It would be better to have the projectIri stored in the merge state ... we already fetch it in two places for no reason.
    const { diffTreeComparison } = await compareBackendFilesystems(dataForComparison.gitEndpoint, dataForComparison.dsEndpoint, dataForComparison.resource.projectIri, "pull");

    const result = await mergeStateModel.mergeStateFinalizer(uuid);
    if (result === null) {
      response.status(409);
      response.json({error: "The merge state still has conflicts"});
      return;
    }
    else {
      response.status(200);
      const hasUncommittedChanges = diffTreeComparison.conflicts.length !== 0 || diffTreeComparison.created.length !== 0 ||
                                    diffTreeComparison.changed.length !== 0 || diffTreeComparison.removed.length !== 0;
      resourceModel.setHasUncommittedChanges(dataForComparison.resource.iri, hasUncommittedChanges);
      response.json({ uuid, mergeStateCause: result.mergeStateCause });
      return;
    }
  }
  catch(err) {
    response
      .status(300)
      .json({
        message: "The commit on which we are in DS is already after the commit to which we were pulling within the merge state",
      });
    return;
  }
});



type BackendComparisonParamsForPullOk = {
  type: "ok";
} & BackendComparisonParamsForPull;

type BackendComparisonParamsForPull = {
  gitEndpoint: MergeEndpointForComparison;
  dsEndpoint: MergeEndpointForComparison;
  resource: BaseResource;
};

type BackendComparisonParamsForPullResult = BackendComparisonParamsForPullOk | {
  type: "error";
  responseStatus: number;
  responseText: string;
};

async function createDataForBackendComparisonForPull(mergeStateUuid: string): Promise<BackendComparisonParamsForPullResult> {
  const mergeState = await mergeStateModel.getMergeStateFromUUID(mergeStateUuid, false, false, false);
  if (mergeState === null) {
    return {
      type: "error",
      responseStatus: 404,
      responseText: `Merge state with uuid (${mergeStateUuid}) does not exist`,
    };
  }
  const gitProvider = GitProviderNodeFactory.createGitProviderFromRepositoryURL(mergeState.gitUrlMergeFrom, httpFetch, configuration);

  const gitEndpoint: MergeEndpointForComparison = {
    rootIri: mergeState.rootIriMergeFrom,
    filesystemFactoryParams: createFilesystemFactoryParams(false),
    gitIgnore: new GitIgnoreBase(gitProvider),
    fullPathToRootParent: MergeStateModel.extractGitRootParent(mergeState.rootFullPathToMetaMergeFrom),
    filesystemType: mergeState.filesystemTypeMergeFrom,
  };
  const dsEndpoint: MergeEndpointForComparison = {
    rootIri: mergeState.rootIriMergeTo,
    filesystemFactoryParams: createFilesystemFactoryParams(true),
    gitIgnore: null,
    fullPathToRootParent: MergeStateModel.extractGitRootParent(mergeState.rootFullPathToMetaMergeTo),      // The value probably should not matter
    filesystemType: mergeState.filesystemTypeMergeTo,
  };
  const resource = await resourceModel.getResource(dsEndpoint.rootIri);
  if (resource === null) {
    return {
      type: "error",
      responseStatus: 404,
      responseText: `The resource with iri (${dsEndpoint.rootIri}) does not exist`,
    };
  }

  return {
    type: "ok",
    resource,
    dsEndpoint,
    gitEndpoint,
  };
}
