import { resourceModel } from "../main.ts";
import { asyncHandler } from "../utils/async-handler.ts";
import express from "express";
import { z } from "zod";
import { v4 as uuidv4 } from 'uuid';

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

export const createResource = asyncHandler(async (request: express.Request, response: express.Response) => {
    const querySchema = z.object({
        parentIri: z.string().min(1),
    });
    const query = querySchema.parse(request.query);

    const bodySchema = z.object({
        iri: z.string().min(1).optional(),
        type: z.string().min(1),
        userMetadata: z.optional(z.record(z.string(), z.unknown())),
    }).strict();
    const body = bodySchema.parse(request.body);

    const iri = body.iri ?? uuidv4();

    await resourceModel.createResource(query.parentIri, iri, body.type, body.userMetadata ?? {});

    response.send(await resourceModel.getResource(iri));
    return;
});

export const updateResource = asyncHandler(async (request: express.Request, response: express.Response) => {
    const querySchema = z.object({
        iri: z.string().min(1),
    });
    const query = querySchema.parse(request.query);

    const bodySchema = z.object({
        userMetadata: z.optional(z.record(z.string(), z.unknown())),
    }).strict();
    const body = bodySchema.parse(request.body);

    if (body.userMetadata) {
        await resourceModel.updateResource(query.iri, body.userMetadata);
    }

    response.send(await resourceModel.getResource(query.iri));
    return;
});

export const deleteResource = asyncHandler(async (request: express.Request, response: express.Response) => {
    const querySchema = z.object({
        iri: z.string().min(1),
    });
    const query = querySchema.parse(request.query);

    await resourceModel.deleteResource(query.iri);

    response.sendStatus(204);
    return;
});


export const getBlob = asyncHandler(async (request: express.Request, response: express.Response) => {
    const querySchema = z.object({
        iri: z.string().min(1),
        name: z.string().min(1).default("model"),
    });
    const query = querySchema.parse(request.query);

    const buffer = await resourceModel.getResourceStoreBuffer(query.iri, query.name);

    if (!buffer) {
        response.sendStatus(404);
        return;
    }

    response.send(buffer);
    return;
});

export const updateBlob = asyncHandler(async (request: express.Request, response: express.Response) => {
    const querySchema = z.object({
        iri: z.string().min(1),
        name: z.string().min(1).default("model"),
    });
    const query = querySchema.parse(request.query);

    await resourceModel.setResourceStoreJson(query.iri, request.body, query.name);

    response.sendStatus(200);
    return;
});

export const deleteBlob = asyncHandler(async (request: express.Request, response: express.Response) => {
    const querySchema = z.object({
        iri: z.string().min(1),
        name: z.string().min(1).default("model"),
    });
    const query = querySchema.parse(request.query);

    await resourceModel.deleteResourceStore(query.iri, query.name);

    response.sendStatus(204);
    return;
});

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
        userMetadata: z.optional(z.record(z.string(), z.unknown())),
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