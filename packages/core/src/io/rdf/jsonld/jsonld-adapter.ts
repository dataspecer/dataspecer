import * as jsonld from "jsonld";
import { RdfQuad } from "../../../core/adapter/rdf/index.ts";
import { parseRdfQuadsWithN3 } from "../n3/n3-adapter.ts";

export async function parseRdfQuadsWithJsonLd(
  content: string
): Promise<RdfQuad[]> {
  const contentAsJson = JSON.parse(content) as jsonld.JsonLdDocument;
  const options: jsonld.Options.ToRdf = {
    format: "application/n-quads",
    documentLoader: async (url) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const loader = jsonld.documentLoaders.node();
      // Encode the URL to allow for national characters.
      return await loader(encodeURI(url));
    },
  };
  const nquads = await jsonld.toRDF(contentAsJson, options);
  if (typeof nquads !== "string") {
    throw new Error("Expected JSON-LD conversion to produce N-Quads.");
  }
  return parseRdfQuadsWithN3(nquads);
}
