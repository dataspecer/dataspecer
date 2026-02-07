import { CorsOptions } from "cors";
import express from "express";
import psl from "psl";
import configuration from "../configuration.ts";


/**
 * @returns The domain for the given url, or null if it does not have domain or is invalid URL.
 */
function getRegisteredDomain(urlString: string): string | null {
  try {
    const url = new URL(urlString);
    if (url.hostname === "localhost") {
      return url.hostname;      // Allow any port.
    }
    const parsed = psl.parse(url.hostname);
    if (parsed.error !== undefined)  {
      return null;
    }
    return parsed.domain;
  }
  catch (err) {
    // We will just return null, no logging on server.
    return null;
  }
}



const allowedUrls = [...new Set(["http://localhost:5174"].concat([]))];
const allowedDomains = allowedUrls
  .map(allowedURL => getRegisteredDomain(allowedURL))
  .filter(allowedDomain => allowedDomain !== null);

export function isFrontendAllowedForAuthentication(origin: string | undefined): boolean {
  if (origin === undefined || origin.length === 0) {
    return false;
  }

  const originAsDomain = getRegisteredDomain(origin);
  if (originAsDomain === null) {
    return false;
  }

  return allowedDomains.includes(originAsDomain);
}


/**
 * Method to correctly set cors options based on origin of request {@link request}.
 */
export function corsOriginHandler(request: express.Request, callback: (err: Error | null, options?: CorsOptions | undefined) => void): void {
  // Based on https://expressjs.com/en/resources/middleware/cors.html - concretely the "Customizing CORS Settings Dynamically per Request"
  let corsOptions: CorsOptions;
  const requestOrigin = request.get("Origin");
  if (isFrontendAllowedForAuthentication(requestOrigin)) {
    corsOptions = {
      origin: requestOrigin,  // Allow only a specific origin
      credentials: true,      // Enable cookies and credentials, that is enable authentication
    };
  }
  else {
    // We could be possibly even more strict and do not allow anyone if not from the allowed frontend.
    corsOptions = { origin: "*" };   // Allow all origins for other routes but without credentials
  }

  callback(null, corsOptions);
}
