import { createReadStream } from "fs";
import minipassFetch from "minipass-fetch";
import { FetchOptions, FetchResponse, HttpFetch } from "./fetch-api.ts";

export const httpFetch: HttpFetch = function fetch(
  url: string,
  options: FetchOptions
): Promise<FetchResponse> {
  console.log("fetch: ", url);
  if (url.startsWith("file://")) {
    const path = url.match(/file:\/\/(.+)/)[1];
    const stream = createReadStream(path);
    const headers = {
      "content-type": getFileContentType(path.substr(path.lastIndexOf("."))),
    };
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return new minipassFetch.Response(stream, { headers: headers });
  } else {
    return minipassFetch(url, options);
  }
};

function getFileContentType(extension: string): string | undefined {
  extension = extension.substr(1).toLowerCase();
  switch (extension) {
    case "jsonld":
      return "application/ld+json";
    case "trig":
      return "application/trig";
    case "ttl":
      return "text/turtle";
    case "n3":
      return "application/n-triples";
    case "nq":
      return "application/n-quads";
    case "json":
      return "application/json";
    default:
      return undefined;
  }
}
