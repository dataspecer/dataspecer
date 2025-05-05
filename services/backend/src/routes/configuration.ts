import {asyncHandler} from "../utils/async-handler.ts";
import express from "express";
import configuration from "../configuration.ts";

/**
 * Returns default configuration for a given instance (backend). This configuration is then merged with local
 * configuration to obtain final one that is used for generation.
 */
export const getDefaultConfiguration = asyncHandler(async (request: express.Request, response: express.Response) => {
    response.send(configuration.configuration);
});
