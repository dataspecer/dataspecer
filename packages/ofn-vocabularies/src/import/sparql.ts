import { Parser, Store } from "n3";

export interface SparqlQueryOptions {
  sparqlEndpoint: string;
  fetchImplementation: typeof fetch;
}

export async function executeSparqlConstructQuery(options: SparqlQueryOptions, query: string): Promise<Store> {
  const response = await options.fetchImplementation(options.sparqlEndpoint, {
    method: "POST",
    headers: {
      Accept: "text/turtle",
      "Content-Type": "application/sparql-query",
    },
    body: query,
  });

  if (!response.ok) {
    throw new Error(`SPARQL endpoint returned ${response.status} ${response.statusText}`);
  }

  return new Store(new Parser({ format: "Turtle" }).parse(await response.text()));
}
