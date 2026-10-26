import { listOfnVocabularies } from "@dataspecer/ofn-vocabularies";
import { asyncHandler } from "../utils/async-handler.ts";
import { OFN_SPARQL_ENDPOINT } from "../utils/ofn-vocabularies.ts";

export const getOfnVocabularies = asyncHandler(async (_request, response) => {
  response.json(await listOfnVocabularies({ sparqlEndpoint: OFN_SPARQL_ENDPOINT, fetchImplementation: fetch }));
});
