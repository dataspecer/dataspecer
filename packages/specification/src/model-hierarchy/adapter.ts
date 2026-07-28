import { wrapCimAdapter } from "@dataspecer/core-v2/semantic-model/simplified";
import { PrefixIriProvider } from "@dataspecer/core/cim/prefix-iri-provider";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-browser";
import { RdfsFileAdapter } from "@dataspecer/rdfs-adapter";
import { SgovAdapter } from "@dataspecer/sgov-adapter";
import { WikidataAdapter } from "@dataspecer/wikidata-experimental-adapter";

const DEFAULT_CONFIG = [] as [];

export function getProvidedSourceSemanticModel(
  cimAdaptersConfiguration: any[] = DEFAULT_CONFIG
) {
  const iriProvider = new PrefixIriProvider();

  if (cimAdaptersConfiguration.length === 0 || (cimAdaptersConfiguration.length === 1 && cimAdaptersConfiguration[0] === "https://dataspecer.com/adapters/sgov")) {
    const cimAdapter = new SgovAdapter("https://slovník.gov.cz/sparql", httpFetch);
    cimAdapter.setIriProvider(iriProvider);
    return wrapCimAdapter(cimAdapter);
  }

  if (cimAdaptersConfiguration.length === 1 && cimAdaptersConfiguration[0] === "https://dataspecer.com/adapters/wikidata") {
    const cimAdapter = new WikidataAdapter(httpFetch, ""); // import.meta.env.VITE_WIKIDATA_ONTOLOGY_BACKEND
    cimAdapter.setIriProvider(iriProvider);
    return wrapCimAdapter(cimAdapter);
  }

  if (cimAdaptersConfiguration.length === 1 && cimAdaptersConfiguration[0] === "https://dataspecer.com/adapters/sgov-en") {
    const cimAdapter = new SgovAdapter("https://er2023.dataspecer.com/sparql", httpFetch);
    cimAdapter.setIriProvider(iriProvider);
    return wrapCimAdapter(cimAdapter);
  }

  if (cimAdaptersConfiguration.every((url) => url.startsWith("rdfs:"))) {
    const cimAdapter = new RdfsFileAdapter(cimAdaptersConfiguration.map(url => url.substring("rdfs:".length)), httpFetch);
    cimAdapter.setIriProvider(iriProvider);
    return wrapCimAdapter(cimAdapter);
  }

  throw new Error("Unsupported CIM adapter configuration: " + JSON.stringify(cimAdaptersConfiguration));
}