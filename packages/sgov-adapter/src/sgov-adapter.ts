import jsStringEscape from "js-string-escape";
import search from "./queries/search.sparql.ts";
import getClass from "./queries/get-class.sparql.ts";
import getSurroundingsAttributes from "./queries/get-surroundings-attributes.sparql.ts";
import getSurroundingsInwardsRelations from "./queries/get-surroundings-inwards-relations.sparql.ts";
import getSurroundingsOutwardsRelations from "./queries/get-surroundings-outwards-relations.sparql.ts";
import getSurroundingsParent from "./queries/get-surroundings-parent.sparql.ts";
import getSurroundingsComplexAttributes from "./queries/get-surroundings-complex-attributes.sparql.ts";
import getHierarchy from "./queries/get-hierarchy.sparql.ts";
import getGroup from "./queries/get-group.sparql.ts";
import type { CimAdapter } from "@dataspecer/core-v2/semantic-model/cim-adapter";
import { isSemanticModelClass, type SemanticModelClass, type SemanticModelEntity } from "@dataspecer/core-v2/semantic-model/concepts";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import { SparqlQueryRdfSource } from "@dataspecer/core/io/rdf/sparql/sparql-query-rdf-source";
import { HttpFetch } from "@dataspecer/core/io/fetch/fetch-api";
import { RdfSource, RdfSourceWrap } from "@dataspecer/core/core/adapter/rdf";
import {
  isSgovClass,
  loadSgovClass,
  loadSgovGeneralizations,
} from "./entity-adapters/sgov-class-adapter.ts";
import { FederatedSource } from "@dataspecer/core/io/rdf/federated/federated-rdf-source";
import { RDFS, SKOS } from "./sgov-vocabulary.ts";
import {
  isSgovAssociation,
  loadSgovAssociation,
} from "./entity-adapters/sgov-association-adapter.ts";
import {
  isSgovAttribute,
  loadSgovAttribute,
} from "./entity-adapters/sgov-attribute-adapter.ts";

const getSurroundings = [
  getSurroundingsAttributes,
  getSurroundingsInwardsRelations,
  getSurroundingsOutwardsRelations,
  getSurroundingsParent,
  getSurroundingsComplexAttributes,
];

const searchQuery = (searchString: string) => search({query: `"${jsStringEscape(searchString)}"`});

const getClassQuery = (cimIri: string) => getClass({node: `<${cimIri}>`});

const getHierarchyQuery = (cimIri: string) => getHierarchy({node: `<${cimIri}>`});

const getGroupQuery = (cimIri: string) => getGroup({node: `<${cimIri}>`});

const getSurroundingsQueries = (cimIri: string) => getSurroundings.map(q => q({node: `<${cimIri}>`}));

const IRI_REGEXP = new RegExp("^https?://");

/**
 * Adapter for SGOV (Semantic Government Vocabulary) CIM type.
 *  - https://slovník.gov.cz/sparql
 */
export class SgovAdapter implements CimAdapter {
  protected readonly endpoint: string;
  protected readonly httpFetch: HttpFetch;

  protected resourceGroupCache = new Map<string, string[]>();

  constructor(endpoint: string, httpFetch: HttpFetch) {
    this.endpoint = endpoint;
    this.httpFetch = httpFetch;
  }

  async search(searchString: string): Promise<SemanticModelClass[]> {
    const source = new SparqlQueryRdfSource(
      this.httpFetch,
      this.endpoint,
      searchQuery(searchString)
    );
    await source.query();

    const results = await source.property(
      "__search_results",
      "__has_search_result"
    );

    const resultsWithOrder: { sort: number; cls: SemanticModelClass }[] = [];
    for (const result of results) {
      const resultWrap = RdfSourceWrap.forIri(result.value, source);
      await this.cacheResourceGroup(resultWrap);
      resultsWithOrder.push({
        sort: Number((await resultWrap.property("__order"))[0].value),
        cls: await loadSgovClass(resultWrap),
      });
    }
    let sorted = resultsWithOrder.sort((a, b) => a.sort - b.sort).map((p) => p.cls);

    if (IRI_REGEXP.test(searchString)) {
      const classByIri = (await this.getClass(searchString)).filter(isSemanticModelClass);
      sorted = [...classByIri, ...sorted];
    }

    return sorted;
  }

  async getClass(cimIri: string): Promise<SemanticModelEntity[]> {
    const source = new SparqlQueryRdfSource(
      this.httpFetch,
      this.endpoint,
      getClassQuery(cimIri)
    );
    await source.query();
    const entity = RdfSourceWrap.forIri(cimIri, source);

    if (!(await isSgovClass(entity))) {
      return [];
    }
    await this.cacheResourceGroup(RdfSourceWrap.forIri(cimIri, source));
    return [await loadSgovClass(entity), ...await loadSgovGeneralizations(entity)];
  }

  async getSurroundings(cimIri: string): Promise<SemanticModelEntity[]> {
    const sources = getSurroundingsQueries(cimIri).map(
      (query) => new SparqlQueryRdfSource(this.httpFetch, this.endpoint, query)
    );

    await Promise.all(sources.map((q) => q.query()));
    const source = FederatedSource.createExhaustive(sources);
    const entities = await this.loadSemanticEntitiesGraphFromEntity(cimIri, source);
    for (const entity of await this.getClass(cimIri)) {
      entities[entity.id] = entity;
    }
    return Object.values(entities);
  }

  /**
   * Returns full known hierarchy structure - containing all ancestors and
   * descendants of the given class.
   * @param cimIri class CIM IRI
   */
  public async getFullHierarchy(cimIri: string): Promise<SemanticModelEntity[]> {
    const source = new SparqlQueryRdfSource(
      this.httpFetch,
      this.endpoint,
      getHierarchyQuery(cimIri)
    );
    await source.query();
    return Object.values(await this.loadSemanticEntitiesGraphFromEntity(cimIri, source));
  }

  /**
   * Returns a glossary info for the resource.
   * @param cimIri
   */
  public async getResourceGroup(cimIri: string): Promise<string[]> {
    if (this.resourceGroupCache.has(cimIri)) {
      return this.resourceGroupCache.get(cimIri);
    } else {
      const source = new SparqlQueryRdfSource(
        this.httpFetch,
        this.endpoint,
        getGroupQuery(cimIri)
      );
      await source.query();
      return await this.cacheResourceGroup(
        RdfSourceWrap.forIri(cimIri, source)
      );
    }
  }

  /**
   * Takes an RdfSource and CIM iri of a class. From the class it loads
   * everything accessible (associations, attributes and parents) and
   * returns all the entities.
   */
  protected async loadSemanticEntitiesGraphFromEntity(
    rootClassCimIri: string,
    source: RdfSource
  ): Promise<EntityRecord<SemanticModelEntity>> {
    const entities: EntityRecord<SemanticModelEntity> = {};

    const classesProcessed = new Set<string>();
    const associationsProcessed = new Set<string>();

    // Reverse lookup for classes that are descendants of the given class.
    const descendants = [rootClassCimIri];
    let processedDescendant = 0;
    while (processedDescendant < descendants.length) {
      const descendant = descendants[processedDescendant];
      const res = await source.reverseProperty(RDFS.subClassOf, descendant);
      for (const r of res) {
        if (!descendants.includes(r.value)) {
          descendants.push(r.value);
        }
      }
      processedDescendant++;
    }

    // List of CIM iris to process
    let processQueue: string[] = [rootClassCimIri, ...descendants];
    while (processQueue.length) {
      const processedCimIri = processQueue.pop();
      if (!processedCimIri || classesProcessed.has(processedCimIri)) {
        continue;
      }
      classesProcessed.add(processedCimIri);

      // Class itself

      const rdfClassWrap = RdfSourceWrap.forIri(processedCimIri, source);
      const generalizations = await loadSgovGeneralizations(rdfClassWrap);
      if (processedCimIri !== "http://www.w3.org/2002/07/owl#Thing") {
        const cls = await loadSgovClass(rdfClassWrap);
        entities[cls.id] = cls;
        for (const generalization of generalizations) {
          entities[generalization.id] = generalization;
        }
      }

      // Some classes may be empty because of simplification of SPARQL queries.
      // Therefore, we need to check, if it is actually a class and containing
      // a group information.
      if (await isSgovClass(rdfClassWrap)) {
        await this.cacheResourceGroup(rdfClassWrap);
      }

      // Process associations for the class and add class from the other side
      // of the association to `processQueue`

      const associations = [
        ...(await rdfClassWrap.reverseNodes(RDFS.domain)),
        ...(await rdfClassWrap.reverseNodes(RDFS.range)),
      ];
      for (const cimAssociationIri of associations) {
        const entity = RdfSourceWrap.forIri(cimAssociationIri, source);
        if (
          associationsProcessed.has(cimAssociationIri) ||
          !(await isSgovAssociation(entity))
        ) {
          continue;
        }
        associationsProcessed.add(cimAssociationIri);

        const association = await loadSgovAssociation(entity, source);
        entities[association.id] = association;

        // Add linked classes to the processQueue

        for (const end of association.ends) {
          if (end.concept !== null) {
            processQueue.push(end.concept);
          }
        }
      }

      // Process attributes for the current class

      const attributes = await rdfClassWrap.reverseNodes(RDFS.domain);
      for (const cimAttributeIri of attributes) {
        const entity = RdfSourceWrap.forIri(cimAttributeIri, source);
        if (!(await isSgovAttribute(entity))) {
          continue;
        }
        const attribute = await loadSgovAttribute(entity);
        entities[attribute.id] = attribute;
      }

      // Process class hierarchy

      processQueue = [
        ...processQueue,
        ...generalizations.map(generalization => generalization.parent),
      ];
    }

    return entities;
  }

  protected async cacheResourceGroup(entity: RdfSourceWrap): Promise<string[]> {
    const groups = await entity.nodes(SKOS.inScheme);
    this.resourceGroupCache.set(entity.iri, groups);
    return groups;
  }
}
