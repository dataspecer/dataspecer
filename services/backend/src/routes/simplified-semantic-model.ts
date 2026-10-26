import { LOCAL_SEMANTIC_MODEL } from "@dataspecer/core-v2/model/known-models";
import { modelRepository } from "../main.ts";
import { asyncHandler } from "../utils/async-handler.ts";
import express from "express";
import { z } from "zod";
import { SemanticModelEntity } from "@dataspecer/core-v2/semantic-model/concepts";
import { semanticModelToSimplifiedSemanticModel, simplifiedSemanticModelToSemanticModel } from "@dataspecer/core-v2/simplified-semantic-model";

export const getSimplifiedSemanticModel = asyncHandler(async (request: express.Request, response: express.Response) => {
    const querySchema = z.object({
        iri: z.string().min(1),
    });
    const query = querySchema.parse(request.query);

    const resource = await modelRepository.getResource(query.iri);

    if (!resource) {
        response.status(404).send({error: "Resource does not exist."});
        return;
    }

    if (resource.types[0] !== LOCAL_SEMANTIC_MODEL) {
        response.status(400).send({error: "This type of resource is not supported."});
        return;
    }

    const data = await modelRepository.getResourceStoreJson(query.iri);
    const entities = (data?.entities ?? {}) as Record<string, SemanticModelEntity>;

    const simplifiedModel = semanticModelToSimplifiedSemanticModel(entities, {});

    response.send(simplifiedModel);
    return;
});

export const setSimplifiedSemanticModel = asyncHandler(async (request: express.Request, response: express.Response) => {
    const querySchema = z.object({
        iri: z.string().min(1),
    });
    const query = querySchema.parse(request.query);

    const resource = await modelRepository.getResource(query.iri);

    if (!resource) {
        response.status(404).send({error: "Resource does not exist."});
        return;
    }

    if (resource.types[0] !== LOCAL_SEMANTIC_MODEL) {
        response.status(400).send({error: "This type of resource is not supported."});
        return;
    }

    const data = (await modelRepository.getResourceStoreJson(query.iri)) ?? { modelId: query.iri };
    const entities = (data.entities ?? {}) as Record<string, SemanticModelEntity>;

    const newEntities = simplifiedSemanticModelToSemanticModel(request.body, entities);

    data.entities = newEntities;
    await modelRepository.setModelJson(query.iri, data);
    response.sendStatus(204);
});
