import { CimAdapter, IriProvider } from "@dataspecer/core/cim";
import { HttpFetch } from "@dataspecer/core/io/fetch/fetch-api";
import { SimpleAsyncQueryableObservableEntityModel } from "../../entity-model/async-queryable/implementation.ts";
import { CimAdapterWrapper } from "../v1-adapters/cim-adapter-wrapper.ts";
import { ExternalSemanticModel } from "./external-semantic-model.ts";

class IdentityIriProvider implements IriProvider {
    cimToPim = (cimIri: string) => cimIri;
    pimToCim = (pimIri: string) => pimIri;
}

export function wrapCimAdapter(adapter: CimAdapter, id?: string) {
    adapter.setIriProvider(new IdentityIriProvider());
    const queryableWrapper = new CimAdapterWrapper(adapter);
    const observableWrapper = new SimpleAsyncQueryableObservableEntityModel(queryableWrapper);
    return new ExternalSemanticModel(queryableWrapper, observableWrapper, id);
}
