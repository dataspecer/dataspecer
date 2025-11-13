import type { dsvMetadataWellKnown } from "./well-known.ts";

export const mimeToIriMap: { [mime in typeof dsvMetadataWellKnown.formatMime[keyof typeof dsvMetadataWellKnown.formatMime]]: string } = {
  "text/turtle": "http://publications.europa.eu/resource/authority/file-type/RDF_TURTLE",
  "image/svg+xml": "http://publications.europa.eu/resource/authority/file-type/SVG",
  "text/html": "http://publications.europa.eu/resource/authority/file-type/HTML",

  "application/schema+json": "http://publications.europa.eu/resource/authority/file-type/JSON", // todo
  "application/ld+json": "http://publications.europa.eu/resource/authority/file-type/JSON_LD",
};
