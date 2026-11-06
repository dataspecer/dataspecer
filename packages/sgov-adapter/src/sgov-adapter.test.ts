import { describe, expect, it, vi } from "vitest";
import { isSemanticModelClass, isSemanticModelGeneralization, isSemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import { CimAdapterWrapper } from "@dataspecer/core-v2/semantic-model/cim-adapter";
import { SgovAdapter } from "./sgov-adapter.ts";
import { createSgovModel } from "./sgov-model.ts";

const root = "https://example.com/Root";
const parent = "https://example.com/Parent";
const linked = "https://example.com/Linked";
const prefixes = `
  @prefix ex: <https://example.com/> .
  @prefix z: <https://slovník.gov.cz/základní/pojem/> .
  @prefix skos: <http://www.w3.org/2004/02/skos/core#> .
  @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
  @prefix owl: <http://www.w3.org/2002/07/owl#> .
`;
const classRdf = `
  ex:Root a z:typ-objektu ; skos:prefLabel "Root"@en, "Kořen"@cs ;
    skos:definition "A root class"@en ; rdfs:subClassOf ex:Parent ;
    skos:inScheme ex:Glossary ; <__is_ciselnik> "1" .
`;
const graphRdf = `
  ex:Root a z:typ-objektu ; rdfs:subClassOf ex:Parent .
  ex:Parent a z:typ-objektu ; rdfs:subClassOf ex:Root ; skos:prefLabel "Parent"@en .
  ex:Child a z:typ-objektu ; rdfs:subClassOf ex:Root .
  ex:Linked a z:typ-objektu ; skos:prefLabel "Linked"@en .
  ex:Relation a z:typ-vztahu ; rdfs:domain ex:Root ; rdfs:range ex:Linked ;
    skos:prefLabel "related to"@en ; skos:definition "The relation"@en ;
    <__domain_cardinality> ex:DomainCardinality ; <__range_cardinality> ex:RangeCardinality .
  ex:DomainCardinality owl:minQualifiedCardinality 1 ; owl:maxQualifiedCardinality 2 .
  ex:RangeCardinality owl:minQualifiedCardinality 3 ; owl:maxQualifiedCardinality 4 .
  ex:DefaultRelation a z:typ-vztahu ; rdfs:domain ex:Linked ; rdfs:range ex:Root .
  ex:MissingRange a z:typ-vztahu ; rdfs:domain ex:Root .
  ex:Attribute a z:typ-vlastnosti ; rdfs:domain ex:Root ;
    skos:prefLabel "name"@en ; owl:minQualifiedCardinality 1 ; owl:maxQualifiedCardinality 1 .
  ex:DefaultAttribute a z:typ-vlastnosti ; rdfs:domain ex:Root .
`;

function rdfResponse(rdf: string) {
  return new Response(prefixes + rdf, { headers: { "Content-Type": "text/turtle" } });
}

describe("semantic SGOV entities", () => {
  it("returns class metadata and direct generalizations with stable identifiers", async () => {
    const fetch = vi.fn(async () => rdfResponse(classRdf));
    const adapter = new SgovAdapter("https://example.com/sparql", fetch);
    const entities = await adapter.getClass(root);
    expect(entities).toEqual([
      {
        id: root, iri: root, type: ["class"],
        name: { en: "Root", cs: "Kořen" }, description: { en: "A root class" },
        nameProperty: null, descriptionProperty: null, isCodelist: true, codelistUrl: [],
      },
      {
        id: "https://dataspecer.com/semantic-models/generalizationfromIri=https%3A%2F%2Fexample.com%2FRoot&toIri=https%3A%2F%2Fexample.com%2FParent",
        iri: null, type: ["generalization"], child: root, parent,
      },
    ]);
    expect(await adapter.getResourceGroup(root)).toEqual(["https://example.com/Glossary"]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("returns no entities for a missing class", async () => {
    const adapter = new SgovAdapter("https://example.com/sparql", async () => rdfResponse(""));
    expect(await adapter.getClass(root)).toEqual([]);
    expect(await new CimAdapterWrapper(adapter).query("class:" + root)).toEqual({});
  });

  it("constructs relationships, traverses cycles, deduplicates entities and enriches the root", async () => {
    const fetch = vi.fn(async (url: string) => {
      const query = new URL(url).searchParams.get("query")!;
      return rdfResponse(query.includes("FILTER (?node =") ? classRdf : graphRdf);
    });
    const adapter = new SgovAdapter("https://example.com/sparql", fetch);
    const entities = await adapter.getSurroundings(root);
    expect(await adapter.getResourceGroup(root)).toEqual(["https://example.com/Glossary"]);
    expect(fetch).toHaveBeenCalledTimes(6);
    expect(new Set(entities.map(entity => entity.id)).size).toBe(entities.length);
    expect(entities.filter(isSemanticModelClass).map(entity => entity.id).sort()).toEqual([
      "https://example.com/Child", linked, parent, root,
    ]);
    expect(entities.find(entity => entity.id === root)).toMatchObject({ name: { en: "Root", cs: "Kořen" } });
    expect(entities.filter(isSemanticModelGeneralization)).toHaveLength(3);

    const relationships = entities.filter(isSemanticModelRelationship);
    const relation = relationships.find(entity => entity.id === "https://example.com/Relation")!;
    expect(relation).toMatchObject({
      iri: null, name: { en: "related to" }, description: { en: "The relation" },
      ends: [
        { concept: root, iri: null, cardinality: [1, 2], name: {}, description: {} },
        { concept: linked, iri: relation.id, cardinality: [3, 4], name: { en: "related to" }, description: { en: "The relation" } },
      ],
    });
    const defaultRelation = relationships.find(entity => entity.id.endsWith("/DefaultRelation"))!;
    expect(defaultRelation.ends[0].cardinality).toBeUndefined();
    expect(defaultRelation.ends[1].cardinality).toEqual([0, null]);
    expect(relationships.find(entity => entity.id.endsWith("/MissingRange"))!.ends[1].concept).toBeNull();
    expect(relationships.find(entity => entity.id.endsWith("/Attribute"))).toMatchObject({
      iri: null, name: {}, description: {},
      ends: [
        { concept: root, iri: null, cardinality: [0, null] },
        { concept: "http://www.w3.org/2000/01/rdf-schema#Literal", iri: "https://example.com/Attribute", name: { en: "name" }, cardinality: [1, 1] },
      ],
    });
    expect(relationships.find(entity => entity.id.endsWith("/DefaultAttribute"))!.ends[1].cardinality).toEqual([0, null]);
  });

  it("returns ancestors and descendants while excluding owl:Thing entities", async () => {
    const adapter = new SgovAdapter("https://example.com/sparql", async () => rdfResponse(
      graphRdf + classRdf + "ex:Parent rdfs:subClassOf owl:Thing .",
    ));
    const entities = await adapter.getFullHierarchy(root);
    expect(entities.filter(isSemanticModelClass).map(entity => entity.id)).toEqual(expect.arrayContaining([
      root, parent, "https://example.com/Child",
    ]));
    expect(entities.some(entity => entity.id === "http://www.w3.org/2002/07/owl#Thing")).toBe(false);
    expect(entities.filter(isSemanticModelGeneralization)).toEqual(expect.arrayContaining([
      expect.objectContaining({ child: "https://example.com/Child", parent: root }),
      expect.objectContaining({ child: root, parent }),
    ]));
  });

  it("preserves search ranking, prepends an IRI match, and caches groups", async () => {
    const fetch = vi.fn(async (url: string) => rdfResponse(new URL(url).searchParams.get("query")!.includes("__search_results") ? `
      <__search_results> <__has_search_result> ex:Parent, ex:Linked .
      ex:Parent <__order> 20 ; skos:prefLabel "Parent"@en ; skos:inScheme ex:Glossary .
      ex:Linked <__order> 10 ; skos:prefLabel "Linked"@en .
    ` : classRdf));
    const adapter = new SgovAdapter("https://example.com/sparql", fetch);
    expect((await adapter.search("class")).map(entity => entity.id)).toEqual([linked, parent]);
    expect(await adapter.getResourceGroup(parent)).toEqual(["https://example.com/Glossary"]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect((await adapter.search(root)).map(entity => entity.id)).toEqual([root, linked, parent]);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("fetches and caches groups including empty results", async () => {
    const fetch = vi.fn(async () => rdfResponse(""));
    const adapter = new SgovAdapter("https://example.com/sparql", fetch);
    expect(await adapter.getResourceGroup(root)).toEqual([]);
    expect(await adapter.getResourceGroup(root)).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("forwards the endpoint and ID through createSgovModel", async () => {
    const fetch = vi.fn(async (_url: string) => rdfResponse(classRdf));
    const model = createSgovModel("https://custom.example/sparql", fetch, "model-id");
    await model.allowClass(root);
    expect(model.getId()).toBe("model-id");
    expect(model.getEntities()[root]).toMatchObject({ id: root, type: ["class"] });
    expect(Object.values(model.getEntities()).filter(isSemanticModelGeneralization)).toHaveLength(1);
    expect(fetch.mock.calls[0][0]).toMatch(/^https:\/\/custom.example\/sparql\?/);
  });
});
