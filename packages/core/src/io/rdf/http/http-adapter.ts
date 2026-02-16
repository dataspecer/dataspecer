import { HttpFetch } from "../../fetch/fetch-api.ts";
import { RdfQuad } from "../../../core/adapter/rdf/index.ts";
import { parseRdfQuadsWithJsonLd } from "../jsonld/jsonld-adapter.ts";
import { parseRdfQuadsWithN3 } from "../n3/n3-adapter.ts";
import {parseRdfXml} from "../xml/rdfxml-adapter.ts";

enum MimeType {
  JsonLd = "application/ld+json",
  NQuads = "application/n-quads",
  Turtle = "text/turtle",
  TriG = "application/trig",
  NTriples = "application/n-triples",
  RdfXML = "application/rdf+xml",
}

export async function fetchRdfQuads(
  httpFetch: HttpFetch,
  url: string,
  asMimeType?: string,
): Promise<RdfQuad[]> {
  const options = {
    headers: {
      Accept: supportedTypes().join(","),
    },
  };
  const response = await httpFetch(url, options);
  const contentType = getContentType(response);

  let targetMimeType = asMimeType ?? contentType;
  const content = await response.text();

  if (!supportedTypes().includes(targetMimeType as MimeType)) {
    targetMimeType = guessMimeType(content);
  }

  switch (targetMimeType) {
    case MimeType.JsonLd:
      return await parseRdfQuadsWithJsonLd(content);
    case MimeType.NQuads:
    case MimeType.Turtle:
    case MimeType.TriG:
    case MimeType.NTriples:
      return await parseRdfQuadsWithN3(content);
    case MimeType.RdfXML:
      return await parseRdfXml(content);
    default:
      throw new Error(`Unsupported format '${contentType}'`);
  }
}

function supportedTypes() {
  return [
    MimeType.JsonLd,
    MimeType.NQuads,
    MimeType.Turtle,
    MimeType.TriG,
    MimeType.NTriples,
    MimeType.RdfXML,
  ];
}

function guessMimeType(content: string): MimeType {
  if (/^\s*\{/.test(content)) {
    return MimeType.JsonLd;
  }
  if (/^\s*</.test(content)) {
    return MimeType.RdfXML;
  }

  // Wild guess
  return MimeType.Turtle;
}

function getContentType(response): string {
  if (!response.headers.has("content-type")) {
    //throw Error("Missing 'content-type' header.");
    return MimeType.Turtle; // Fallback to default
  }
  const value = response.headers.get("content-type").toLowerCase();
  const index = value.indexOf(";");
  return index === -1 ? value : value.substr(0, index);
}
