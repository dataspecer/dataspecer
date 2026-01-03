import express from "express";

export function createURLFromExpressRequest(request: express.Request): string {
  return `${request.protocol}://${request.get("host")}${request.originalUrl}`;
}

export function convertExpressRequestToNormalRequest(url: string, request: express.Request) {
  const convertedRequest  = new Request(url, {
    method: request.method,
    headers: request.headers as Record<string, string>,
    // body: req.method !== "GET" && req.method !== "HEAD" ? req : undefined,
  });

  return convertedRequest;
}

/**
 * @returns Returns the part of url containing protocol, host and possible the "/api" if it is the route for backend (for example in case of docker).
 */
export function getBaseBackendUrl(request: express.Request) {
  const possibleApiRoute = request.originalUrl.split("/")[1];
  let baseUrlSuffix = "";
  if (possibleApiRoute === "api") {
    baseUrlSuffix = "/api";
  }
  const baseURL = request.protocol + '://' + request.get("host") + baseUrlSuffix;
  return baseURL;
}
