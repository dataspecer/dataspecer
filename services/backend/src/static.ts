import { NextFunction, Request, Response } from "express";
import fs from "fs";
import path from "path";
// @ts-ignore bad typing
import mime from "mime";

/**
 *
 * @param URL URL from
 * @param basePath root of the static files directory
 * @returns
 */
export function useStaticSpaHandler(basePath: string) {
  return (request: Request, response: Response, next: NextFunction) => {
    const splat = request.params.splat;
    const url = Array.isArray(splat) ? splat.join("/") : "";

    // Helper function to send file with proper MIME type
    const sendFileWithMime = (filePath: string) => {
      const mimeType = mime.getType(filePath) || "application/octet-stream";
      response.setHeader("Content-Type", mimeType);
      const cacheControl = filePath.endsWith(".html") ? "no-cache" : "public, max-age=604800";
      response.setHeader("Cache-Control", cacheControl);
      response.sendFile(filePath);
    };

    // File as is
    {
      const filePath = path.join(basePath, url);
      if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
        sendFileWithMime(filePath);
        return;
      }
    }

    // File with .html extension
    {
      const filePath = path.join(basePath, `${url}.html`);
      if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
        sendFileWithMime(filePath);
        return;
      }
    }

    // Base index.html
    {
      const filePath = path.join(basePath, "index.html");
      if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
        sendFileWithMime(filePath);
        return;
      }
    }

    next();
    return;
  };
}

