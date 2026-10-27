import { Parser } from "n3";
import { RdfQuad } from "../rdf-api.ts";

export async function parseRdfQuadsWithN3(content: string): Promise<RdfQuad[]> {
  return new Parser().parse(content);
}
