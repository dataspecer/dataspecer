import { wrapCimAdapter } from "@dataspecer/core-v2/semantic-model/simplified";
import { PrefixIriProvider } from "@dataspecer/core/cim/prefix-iri-provider";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-browser";
import { SgovAdapter } from "@dataspecer/sgov-adapter";

/**
 * There are legacy models we call CIM. These models operate differently because
 * they are too big. Currently the only supported CIM adapter is the sgov adapter.
 */
export function getProvidedSourceSemanticModel(cimAdaptersConfiguration: string[]) {
  const iriProvider = new PrefixIriProvider();

  if (cimAdaptersConfiguration.length === 0 || (cimAdaptersConfiguration.length === 1 && cimAdaptersConfiguration[0] === "https://dataspecer.com/adapters/sgov")) {
    const cimAdapter = new SgovAdapter("https://slovník.gov.cz/sparql", httpFetch);
    cimAdapter.setIriProvider(iriProvider);
    return wrapCimAdapter(cimAdapter);
  }

  throw new Error("Unsupported CIM adapter configuration: " + JSON.stringify(cimAdaptersConfiguration));
}
