import type { CachedSubgraph } from "@dataspecer/core-v2/semantic-model/concepts";
import { wrapCimAdapter } from "@dataspecer/core-v2/semantic-model/simplified";
import { PrefixIriProvider } from "@dataspecer/core/cim/prefix-iri-provider";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-browser";
import { SgovAdapter } from "@dataspecer/sgov-adapter";

/**
 * There are legacy models we call CIM. These models operate differently because
 * they are too big. Currently the only supported CIM adapter is the sgov adapter.
 */
export function getProvidedSourceSemanticModel(cimAdaptersConfiguration: CachedSubgraph) {
  const iriProvider = new PrefixIriProvider();

  if (cimAdaptersConfiguration.provider === "sgov") {
    const cimAdapter = new SgovAdapter(cimAdaptersConfiguration.endpoint, httpFetch); // "https://slovník.gov.cz/sparql"
    cimAdapter.setIriProvider(iriProvider);
    return wrapCimAdapter(cimAdapter);
  }

  throw new Error("Unsupported vocabulary source provider: " + cimAdaptersConfiguration.provider);
}
