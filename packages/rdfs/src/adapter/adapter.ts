import type { LanguageString, NamedThing, SemanticModelClass, SemanticModelGeneralization, SemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import { SEMANTIC_MODEL_CLASS, SEMANTIC_MODEL_GENERALIZATION, SEMANTIC_MODEL_RELATIONSHIP } from "@dataspecer/core-v2/semantic-model/concepts";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import type { Store } from "n3";

const RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
const RDFS = "http://www.w3.org/2000/01/rdf-schema#";
const OWL = "http://www.w3.org/2002/07/owl#";
const SKOS = "http://www.w3.org/2004/02/skos/core#";
const SCHEMAORG = "https://schema.org/";

export interface RdfsSemanticModelAdapterOptions {
  classTypes: string[];
  propertyTypes: string[];

  namePredicates: string[];
  descriptionPredicates: string[];

  domainPredicate: string[];
  rangePredicate: string[];
}

const DefaultOptions: RdfsSemanticModelAdapterOptions = {
  classTypes: [RDFS + "Class", OWL + "Class"],
  propertyTypes: [RDF + "Property", OWL + "ObjectProperty", OWL + "DatatypeProperty"],

  namePredicates: [RDFS + "label", SKOS + "prefLabel"],
  descriptionPredicates: [RDFS + "comment", SKOS + "definition"],

  domainPredicate: [RDFS + "domain", SCHEMAORG + "domainIncludes"],
  rangePredicate: [RDFS + "range", SCHEMAORG + "rangeIncludes"],
};

/**
 * Adapter that can convert RDFS+OWL to the semantic model representation used
 * in Dataspecer.
 *
 * This implementation should replace both @dataspecer/sgov-adapter and
 * @dataspecer/rdfs-adapter which currently convert data to PIM model and then
 * @dataspecer/core-v2/semantic-model/v1-adapters needs to be used.
 *
 * Before you use this adapter instead of those above, please fix the missing
 * edge cases in its behavior.
 */
export class RdfsSemanticModelAdapter {
  protected options: RdfsSemanticModelAdapterOptions;

  constructor(
    private readonly store: Store,
    options: Partial<RdfsSemanticModelAdapterOptions> = {},
  ) {
    this.options = {
      ...DefaultOptions,
      ...options,
    };
  }

  /**
   * Deterministically obtain ID of SemanticModelGeneralization entity from IDs
   * of child and parent.
   */
  protected getGeneralizationId(fromIri: string, toIri: string): string {
    // `urn:dataspecer:rdfs:generalization:${hierarchy}:${encodeURIComponent(iri)}:${encodeURIComponent(parent)}`
    const url = new URLSearchParams({ fromIri, toIri });
    return "https://dataspecer.com/semantic-models/generalization" + url.toString();
  }

  getAllSemanticEntities(): EntityRecord<SemanticModelClass | SemanticModelRelationship | SemanticModelGeneralization> {
    // We omit blank nodes
    const iris = new Set<string>();
    for (const type of [...this.options.classTypes, ...this.options.propertyTypes]) {
      for (const subject of this.store.getSubjects(RDF + "type", type, null)) {
        if (subject.termType === "NamedNode") iris.add(subject.value);
      }
    }

    const entities: (SemanticModelClass | SemanticModelRelationship | SemanticModelGeneralization)[] = [];
    for (const iri of iris) {
      const entity = this.getClass(iri) ?? this.getRelationship(iri);
      if (!entity) continue;
      entities.push(entity);

      // Handle generalizations

      const hierarchy = entity.type[0] === SEMANTIC_MODEL_CLASS ? "subClassOf" : "subPropertyOf";
      for (const parent of this.getNamedValues(iri, RDFS + hierarchy)) {
        entities.push({
          id: this.getGeneralizationId(iri, parent),
          iri: null,
          type: [SEMANTIC_MODEL_GENERALIZATION],
          child: iri,
          parent,
        });
      }
      const unknownChildren = [...new Set(this.store.getSubjects(hierarchy, iri, null).map((term) => term.value)).difference(iris)];
      for (const child of unknownChildren) {
        entities.push({
          id: this.getGeneralizationId(child, iri),
          iri: null,
          type: [SEMANTIC_MODEL_GENERALIZATION],
          child,
          parent: iri,
        });
      }
    }

    const result: EntityRecord<SemanticModelClass | SemanticModelRelationship | SemanticModelGeneralization> = Object.create(null);
    for (const entity of entities) {
      if (Object.hasOwn(result, entity.id)) {
        throw new Error(`RDFS conversion produced duplicate entity ID: ${entity.id}`);
      }
      result[entity.id] = entity;
    }
    return result;
  }

  getClass(iri: string): SemanticModelClass | null {
    if (this.getEntityType(iri) !== SEMANTIC_MODEL_CLASS) return null;
    return {
      id: iri,
      iri,
      type: [SEMANTIC_MODEL_CLASS],
      ...this.getNamedThing(iri),
    };
  }

  getRelationship(iri: string): SemanticModelRelationship | null {
    if (this.getEntityType(iri) !== SEMANTIC_MODEL_RELATIONSHIP) return null;
    const isDatatypeProperty = this.getNamedValues(iri, RDF + "type").includes(OWL + "DatatypeProperty");
    return {
      id: iri,
      iri: null,
      type: [SEMANTIC_MODEL_RELATIONSHIP],
      name: {},
      description: {},
      nameProperty: null,
      descriptionProperty: null,
      ends: [
        {
          iri: null,
          concept: this.getEndpoint(iri, this.options.domainPredicate, OWL + "Thing"),
          name: {},
          description: {},
          nameProperty: null,
          descriptionProperty: null,
        },
        {
          iri,
          concept: this.getEndpoint(iri, this.options.rangePredicate, isDatatypeProperty ? RDFS + "Literal" : OWL + "Thing"),
          ...this.getNamedThing(iri),
        },
      ],
    };
  }

  private getEntityType(iri: string): typeof SEMANTIC_MODEL_CLASS | typeof SEMANTIC_MODEL_RELATIONSHIP | null {
    if (iri.startsWith("_:")) return null;
    const types = this.getNamedValues(iri, RDF + "type");
    const isClass = this.options.classTypes.some((type) => types.includes(type));
    const isProperty = this.options.propertyTypes.some((type) => types.includes(type));
    if (isClass && isProperty) {
      throw new Error(`RDFS resource ${iri} has conflicting class and property declarations.`);
    }
    return isClass ? SEMANTIC_MODEL_CLASS : isProperty ? SEMANTIC_MODEL_RELATIONSHIP : null;
  }

  private getNamedValues(iri: string, predicate: string | string[]): string[] {
    const predicateArray = typeof predicate === "string" ? [predicate] : predicate;
    const results = [];
    for (const p of predicateArray) {
      results.push(
        ...this.store
          .getObjects(iri, p, null)
          .filter((term) => term.termType === "NamedNode")
          .map((term) => term.value),
      );
    }
    return [...new Set(results)];
  }

  private getEndpoint(iri: string, predicates: string[], fallback: string): string {
    /**
     * @todo In old @dataspecer/rdfs-adapter every time we found multiple
     *  endpoints, we did union of them. Since we do not support union right
     *  now, we will fallback
     */
    const [first, ...discarded] = this.getNamedValues(iri, predicates);
    if (discarded.length > 0) {
      // TODO: Represent multiple domains and ranges without discarding concepts.
      console.warn(`RDFS property ${iri} has multiple ${predicates.join(" | ")} values; using ${first} and discarding ${discarded.join(", ")}.`);

      return fallback;
    }
    return first ?? fallback;
  }

  /**
   * Returns name and description that both class and property uses.
   */
  protected getNamedThing(classOrPropertyIri: string): NamedThing {
    const [name, nameProperty] = this.getLanguageStringFromFirst(classOrPropertyIri, this.options.namePredicates);
    const [description, descriptionProperty] = this.getLanguageStringFromFirst(classOrPropertyIri, this.options.descriptionPredicates);
    return { name, description, nameProperty, descriptionProperty };
  }

  /**
   * Constructs LanguageString from the first RDF property that matches
   * something, ignoring other properties in the list.
   * @returns [language string, that matching property]
   */
  protected getLanguageStringFromFirst(iri: string, predicates: readonly string[]): [LanguageString, string | null] {
    for (const predicate of predicates) {
      const translations = new Map<string, string>();
      for (const term of this.store.getObjects(iri, predicate, null)) {
        if (term.termType === "Literal" && !translations.has(term.language)) {
          translations.set(term.language, term.value);
        }
      }
      if (translations.size > 0) return [Object.fromEntries(translations), predicate];
    }
    return [{}, null];
  }
}

export function createRdfsSemanticModelAdapter(store: Store, options: Partial<RdfsSemanticModelAdapterOptions> = {}) {
  return new RdfsSemanticModelAdapter(store, options);
}
