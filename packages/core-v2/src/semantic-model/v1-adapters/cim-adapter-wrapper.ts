import {CimAdapter} from "@dataspecer/core/cim/cim-adapter";
import {AsyncQueryableEntityModel, AsyncQueryableObservableEntityModel} from "../../entity-model/async-queryable/model.ts";
import {Entities} from "../../entity-model/entity.ts";
import {SearchQueryEntity} from "../async-queryable/queries.ts";
import {transformCoreResources, transformPimClass} from "./transform-core-resources.ts";


/**
 * Adapter from {@link CimAdapter} from core version 1 to the {@link AsyncQueryableObservableEntityModel} from core version 2.
 */
export class CimAdapterWrapper implements AsyncQueryableEntityModel {
    private cimAdapter: CimAdapter;

    constructor(cimAdapter: CimAdapter) {
        this.cimAdapter = cimAdapter;
    }

    async query(queryIri: string): Promise<Entities> {
        if (queryIri.startsWith("surroundings:")) {
            const iri = queryIri.substring("surroundings:".length);
            const reader = await this.cimAdapter.getSurroundings(iri);
            // todo hotfix to include the class itself
            const cls = await this.cimAdapter.getClass(iri);
            return  transformCoreResources({...(reader as any).resources, [iri]: cls});
        }
        if (queryIri.startsWith("search:")) {
            const searchQuery = queryIri.substring("search:".length);
            const result = await this.cimAdapter.search(searchQuery);
            const searchResult = {
                id: queryIri,
                type: ["search-results"],
                order: result.map(cls => cls.iri),
            } as SearchQueryEntity;
            return {
                [queryIri]: searchResult,
                ...transformCoreResources(Object.fromEntries(result.map(r => [r.iri, r]))),
            }
        }
        if (queryIri.startsWith("class:")) {
            const iri = queryIri.substring("class:".length);
            const pimClass = await this.cimAdapter.getClass(iri);
            if (pimClass) {
                return transformPimClass(pimClass);
            } else {
                return {};
            }
        }
        if (queryIri.startsWith("hierarchy:")) {
            const iri = queryIri.substring("hierarchy:".length);
            const reader = await this.cimAdapter.getFullHierarchy(iri);
            return transformCoreResources((reader as any).resources);
        }
        throw new Error(`Query ${queryIri} is not supported.`);
    }
}
