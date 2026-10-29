import type { CimAdapter } from "../cim-adapter/index.ts";
import { SimpleAsyncQueryableObservableEntityModel } from "../../entity-model/async-queryable/implementation.ts";
import { CimAdapterWrapper } from "../cim-adapter/cim-adapter-wrapper.ts";
import { ExternalSemanticModel } from "./external-semantic-model.ts";

export function wrapCimAdapter(adapter: CimAdapter, id?: string) {
    const queryableWrapper = new CimAdapterWrapper(adapter);
    const observableWrapper = new SimpleAsyncQueryableObservableEntityModel(queryableWrapper);
    return new ExternalSemanticModel(queryableWrapper, observableWrapper, id);
}
