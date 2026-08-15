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
  const baseDirectory = path.resolve(basePath);

  return (request: Request, response: Response, next: NextFunction) => {
    const splat = request.params.splat;
    const url = Array.isArray(splat) ? splat.join("/") : "";

    // The requested path becomes a file path: refuse anything (e.g. ".."
    // segments) that would escape the static files directory.
    const requestedPath = path.resolve(baseDirectory, url);
    if (requestedPath !== baseDirectory && !requestedPath.startsWith(baseDirectory + path.sep)) {
      response.sendStatus(400);
      return;
    }

    // Helper function to send file with proper MIME type
    const sendFileWithMime = (filePath: string) => {
      const mimeType = mime.getType(filePath) || "application/octet-stream";
      response.setHeader("Content-Type", mimeType);
      const cacheControl = filePath.endsWith(".html") ? "no-cache" : "public, max-age=604800";
      response.setHeader("Cache-Control", cacheControl);
      response.sendFile(filePath);
    };

    // File as is, file with .html extension, base index.html
    const candidates = [requestedPath, `${requestedPath}.html`, path.join(baseDirectory, "index.html")];
    for (const filePath of candidates) {
      if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
        sendFileWithMime(filePath);
        return;
      }
    }

    next();
    return;
  };
}

