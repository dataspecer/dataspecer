import { CorsOptions } from "cors";
import express from "express";
import psl from "psl";


/**
 * @returns The domain for the given url, or null if it does not have domain or is invalid URL.
 */
function getRegisteredDomain(urlString: string): string | null {
  try {
    const url = new URL(urlString);
    console.info({url});
    if (url.hostname === "localhost") {
      return url.hostname;      // TODO RadStr: Allow any port, if we wanted to allow only the exact port, we would return hostname.
    }
    const parsed = psl.parse(url.hostname);
    if (parsed.error !== undefined)  {
      return null;
    }
    return parsed.domain;
  }
  catch (err) {
    // TODO RadStr: Log error?
    return null;
  }
}



export function isFrontendAllowedForAuthentication(origin: string | undefined): boolean {
  if (origin === undefined || origin.length === 0) {
    return false;
  }

  const originAsDomain = getRegisteredDomain(origin);
  if (originAsDomain === null) {
    return false;
  }

  const allowedUrls = ["https://dataspecer.com", "http://localhost:5174"];      // TODO RadStr: Somehow put into configuration
  const allowedDomains = allowedUrls                                    // TODO RadStr: Compute this only once
    .map(allowedURL => getRegisteredDomain(allowedURL))
    .filter(allowedDomain => allowedDomain !== null);

  return allowedDomains.includes(originAsDomain);
}


/**
 * Method to correctly set cors options based on origin of request {@link request}.
 */
export function corsOriginHandler(request: express.Request, callback: (err: Error | null, options?: CorsOptions | undefined) => void): void {
  // Based on https://expressjs.com/en/resources/middleware/cors.html - concretely the "Customizing CORS Settings Dynamically per Request"
  let corsOptions: CorsOptions;
  const requestOrigin = request.get("Origin");
  // TODO RadStr: We can do even more strict credential checking - that is if it is not redirected from the allowed frontend, don't allow access to the auth part.
  //              Right now user can set authentication from not allowed frontends (if he somehow accesses the not shown buttons for authentication),
  //              but he can not get any data from it to show on frontend ever. This happens because the auth part can be on different url than the frontend
  if (isFrontendAllowedForAuthentication(requestOrigin)) {
    corsOptions = {
      origin: requestOrigin,  // Allow only a specific origin
      credentials: true,      // Enable cookies and credentials, that is enable authentication
    };
  }
  else {
    corsOptions = { origin: "*" };   // Allow all origins for other routes but without credentials
  }

  callback(null, corsOptions);
}
