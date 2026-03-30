import { z } from "zod";
import { asyncHandler } from "../../utils/async-handler.ts";
import express from "express";
import { AvailableFilesystems } from "@dataspecer/git";
import { getDatastoreContent } from "./datastore-actions.ts";
import configuration from "../../configuration.ts";
import { currentVersion } from "../../tools/migrations/index.ts";

/**
 * Gets the full metas for the given array of paths.
 * @deprecated Should be correct, but we will probably not use it, since we already have all the needed data in diff tree.
 */
export const getMetas = asyncHandler(async (request: express.Request, response: express.Response) => {
  const availableFilesystems = Object.values(AvailableFilesystems);

  const bodySchema = z.object({
    metaInfos: z.array(z.object({
      fullPath: z.string().min(1),
      format: z.string().min(1).optional(),
    })),
    filesystem: z.enum(availableFilesystems as [string, ...string[]]),
  });
  const body = bodySchema.parse(request.query);
  const filesystem: AvailableFilesystems = body.filesystem as AvailableFilesystems;

  const metas: Record<string, any> = {};
  for (const metaInfo of body.metaInfos) {
    const metaContent = await getDatastoreContent(
      metaInfo.fullPath, filesystem, "meta", true,
      configuration.host ?? "unknown", currentVersion,    // Matters only for DS
      metaInfo.format
    )

    metas[metaInfo.fullPath] = metaContent;
  }

  response.status(200).json(metas);
});
