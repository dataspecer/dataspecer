import { resourceModel } from "../main.ts";
import { asyncHandler } from "../utils/async-handler.ts";
import express from "express";
import { z } from "zod";
import { v4 as uuidv4 } from 'uuid';
import { CommitReferenceType } from "../git-providers/git-provider-api.ts";

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

    await resourceModel.updateResourceProjectIriAndBranch(query.iri, body.projectIri, body.branch);

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

    // TODO RadStr: Maybe also differ between commit/tag? but I think that it is unnecessary. jsut have branch and tag (commit ... but i tihnk that tag is better)
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

export const updateBlob = async (iri: string, name: string, newBlobContent: any) => {
    await (await resourceModel.getOrCreateResourceModelStore(iri, name)).setJson(newBlobContent);
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