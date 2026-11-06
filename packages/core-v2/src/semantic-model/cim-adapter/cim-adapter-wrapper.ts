import type { EntityRecord } from "@dataspecer/core/entity-model";
import type { SearchQueryEntity } from "../async-queryable/queries.ts";
import type { SemanticModelEntity } from "../concepts/concepts.ts";
import type { CimAdapter } from "./cim-adapter.ts";

/** Resolves semantic model query identifiers through a CIM adapter. */
export class CimAdapterWrapper {
  constructor(private readonly cimAdapter: CimAdapter) {}

  async query(queryIri: string): Promise<EntityRecord> {
    let entities: SemanticModelEntity[];
    if (queryIri.startsWith("surroundings:")) {
      entities = await this.cimAdapter.getSurroundings(queryIri.substring("surroundings:".length));
    } else if (queryIri.startsWith("search:")) {
      const classes = await this.cimAdapter.search(queryIri.substring("search:".length));
      const searchResult: SearchQueryEntity = {
        id: queryIri,
        type: ["search-results"],
        order: classes.map(cls => cls.id),
      };
      return {
        ...Object.fromEntries(classes.map(entity => [entity.id, entity])),
        [queryIri]: searchResult,
      };
    } else if (queryIri.startsWith("class:")) {
      entities = await this.cimAdapter.getClass(queryIri.substring("class:".length));
    } else if (queryIri.startsWith("hierarchy:")) {
      entities = await this.cimAdapter.getFullHierarchy(queryIri.substring("hierarchy:".length));
    } else {
      throw new Error(`Query ${queryIri} is not supported.`);
    }
    return Object.fromEntries(entities.map(entity => [entity.id, entity]));
  }
}
