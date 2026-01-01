import { resourceModel } from "../main.ts";
import { asyncHandler } from "../utils/async-handler.ts";
import express from "express";
import { z } from "zod";
import { v4 as uuidv4 } from 'uuid';
import { CommitReferenceType, convertToValidGitName, GitProviderNode } from "@dataspecer/git";

export const getResource = asyncHandler(async (request: express.Request, response: express.Response) => {
    const querySchema = z.object({
        iri: z.string().min(1),
    });
    const query = querySchema.parse(request.query);

    const resource = await resourceModel.getResource(query.iri);

    if (!resource) {
        response.sendStatus(404);
        return;
    }

    response.send(resource);
    return;
});

export const createResourceHandler = asyncHandler(async (request: express.Request, response: express.Response) => {
    const querySchema = z.object({
        parentIri: z.string().min(1),
    });
    const query = querySchema.parse(request.query);

    const bodySchema = z.object({
        iri: z.string().min(1).optional(),
        type: z.string().min(1),
        userMetadata: z.optional(z.record(z.unknown())),
    }).strict();
    const body = bodySchema.parse(request.body);

    const iri = await createResource(query.parentIri, body.type, body.iri, body.userMetadata);

    response.send(await resourceModel.getResource(iri));
    return;
});

/**
 * @returns Returns used iri, which is either the given {@link iri} or newly created one if not provided
 */
export const createResource = async (parentIri: string, type: string, iri?: string, userMetadata?: Record<string, unknown>): Promise<string> => {
    iri = iri ?? uuidv4();
    await resourceModel.createResource(parentIri, iri, type, userMetadata ?? {});
    if (userMetadata) {
        await resourceModel.updateResourceMetadata(iri, userMetadata);
    }

    return iri;
};


/**
 * Copies the whole package recursively or just the resource.
 */
export const copyRecursively = asyncHandler(async (request: express.Request, response: express.Response) => {
    const querySchema = z.object({
        iri: z.string().min(1),
        parentIri: z.string().min(1),
    });
    const query = querySchema.parse(request.query);

    const bodySchema = z.object({
        userMetadata: z.optional(z.record(z.unknown())),
    }).strict();
    const body = bodySchema.parse(request.body);

    const newRootIri = await resourceModel.copyRecursively(query.iri, query.parentIri, body.userMetadata ?? {});
    const responseData = {
        newRootIri,
        parentResource: await resourceModel.getResource(query.parentIri),
    };

    response.send(responseData);
    return;
});

export const updateResourceMetadataHandler = asyncHandler(async (request: express.Request, response: express.Response) => {
    const querySchema = z.object({
        iri: z.string().min(1),
    });
    const query = querySchema.parse(request.query);

    const bodySchema = z.object({
        userMetadata: z.optional(z.record(z.unknown())),

    }).strict();
    const body = bodySchema.parse(request.body);

    await updateResourceMetadata(query.iri, body.userMetadata);

    response.send(await resourceModel.getResource(query.iri));
    return;
});

export const updateResourceProjectIriAndBranchHandler = asyncHandler(async (request: express.Request, response: express.Response) => {
    const querySchema = z.object({
        iri: z.string().min(1),
    });
    const query = querySchema.parse(request.query);

    const bodySchema = z.object({
        projectIri: z.string().optional(),
        branch: z.string().optional(),
    }).strict();
    const body = bodySchema.parse(request.body);
    const branch = body.branch === undefined ? undefined : convertToValidGitName(body.branch);

    await resourceModel.updateResourceProjectIriAndBranch(query.iri, body.projectIri, branch);

    response.send(await resourceModel.getResource(query.iri));
    return;
});

export const updateRepresentsBranchHeadOnResourceHandler = asyncHandler(async (request: express.Request, response: express.Response) => {
    const querySchema = z.object({
        iri: z.string().min(1),
    });
    const query = querySchema.parse(request.query);

    const bodySchema = z.object({
        representsBranchHead: z.boolean(),
    }).strict();
    const body = bodySchema.parse(request.body);

    // We could also differ between commit and a tag, but for now it is enough. And they are the same thing from Dataspecer's view anyways
    const commitReferenceType: CommitReferenceType = body.representsBranchHead ? "branch" : "tag";
    await resourceModel.updateRepresentsBranchHead(query.iri, commitReferenceType);

    response.send(await resourceModel.getResource(query.iri));
    return;
});


export const updateResourceMetadata = async (iri: string, userMetadata: Record<string, unknown> | undefined) => {
    if (userMetadata) {
        await resourceModel.updateResourceMetadata(iri, userMetadata);
    }
};

export const deleteResourceHandler = asyncHandler(async (request: express.Request, response: express.Response) => {
    const querySchema = z.object({
        iri: z.string().min(1),
    });
    const query = querySchema.parse(request.query);

    await deleteResource(query.iri);

    response.sendStatus(204);
    return;
});

export const deleteResource = async (iri: string) => {
    await resourceModel.deleteResource(iri);
}


export const getBlob = asyncHandler(async (request: express.Request, response: express.Response) => {
    const querySchema = z.object({
        iri: z.string().min(1),
        name: z.string().min(1).default("model"),
    });
    const query = querySchema.parse(request.query);

    const store = await resourceModel.getResourceModelStore(query.iri, query.name);

    if (!store) {
        response.sendStatus(404);
        return;
    }

    const buffer = await (store).getBuffer();

    response.send(buffer);
    return;
});

export const updateBlobHandler = asyncHandler(async (request: express.Request, response: express.Response) => {
    const querySchema = z.object({
        iri: z.string().min(1),
        name: z.string().min(1).default("model"),
    });
    const query = querySchema.parse(request.query);

    const buffer = await updateBlob(query.iri, query.name, request.body);

    response.sendStatus(200);
    return;
});

export const updateBlob = async (iri: string, datastoreType: string, newBlobContent: any, mergeStateUUIDsToIgnoreInUpdating?: string[]) => {
    await (await resourceModel.getOrCreateResourceModelStore(iri, datastoreType, mergeStateUUIDsToIgnoreInUpdating)).setJson(newBlobContent);
};

export const deleteBlobHandler = asyncHandler(async (request: express.Request, response: express.Response) => {
    const querySchema = z.object({
        iri: z.string().min(1),
        name: z.string().min(1).default("model"),
    });
    const query = querySchema.parse(request.query);

    await deleteBlob(query.iri, query.name);

    response.sendStatus(204);
    return;
});

export const deleteBlob = async (iri: string, datastoreType: string) => {
    await resourceModel.deleteModelStore(iri, datastoreType);
}

export const getPackageResource = asyncHandler(async (request: express.Request, response: express.Response) => {
    const querySchema = z.object({
        iri: z.string().min(1),
    });
    const query = querySchema.parse(request.query);

    const resource = await resourceModel.getPackage(query.iri);

    if (!resource) {
        response.sendStatus(404);
        return;
    }

    response.send(resource);
    return;
});

export const createPackageResource = asyncHandler(async (request: express.Request, response: express.Response) => {
    const querySchema = z.object({
        parentIri: z.string().min(1),
    });
    const query = querySchema.parse(request.query);

    const bodySchema = z.object({
        iri: z.string().min(1).optional(),
        userMetadata: z.optional(z.record(z.unknown())),
    }).strict();
    const body = bodySchema.parse(request.body);

    const iri = body.iri ?? uuidv4();

    await resourceModel.createPackage(query.parentIri, iri, body.userMetadata ?? {});

    response.send(await resourceModel.getPackage(iri));
    return;
});

export const getRootPackages = asyncHandler(async (request: express.Request, response: express.Response) => {
    response.send(await resourceModel.getRootResources());
    return;
});

export const updateGitRelatedDataForPackage = async (
  iri: string,
  gitProvider: GitProviderNode,
  repositoryURL: string,
  commitReferenceValue: string | null,
  commitReferenceType?: CommitReferenceType,
) => {
  const defaultRepositoryUrl = gitProvider.extractDefaultRepositoryUrl(repositoryURL);
  console.info("defaultRepositoryUrl", defaultRepositoryUrl);     // TODO RadStr Debug: Debug print
  // TODO RadStr: Ideally we should update all at once so we do not call the merge state isUpToDate setter unnecesarily

  // The true here is important - it sets the projectIri to the existing resources if they exist. That being said in case of import those should be already set from the meta file
  //  (so possible TODO: Remove the linkToExistingGitRepository and then we can call this with false)
  await resourceModel.updateResourceGitLink(iri, defaultRepositoryUrl, true);
  // If commitReferenceType still not set, just use null, the method will use its default
  const lastCommitHash = await gitProvider.getLastCommitHashFromUrl(defaultRepositoryUrl, commitReferenceType ?? null, commitReferenceValue);
  await resourceModel.updateLastCommitHash(iri, lastCommitHash, "pull");

  // If undefined just assume that it is reference to commit, so if it is not user have to explictly switch it to branch
  await resourceModel.updateRepresentsBranchHead(iri, commitReferenceType ?? "commit");
  await resourceModel.updateResourceProjectIriAndBranch(
    iri,
    undefined,      // Should be already set correctly
    commitReferenceValue ?? undefined);
  await resourceModel.setHasUncommittedChanges(iri, false);
};
