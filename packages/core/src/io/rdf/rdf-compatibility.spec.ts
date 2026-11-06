import { DataFactory, Store } from "n3";
import { RdfNode, RdfObject, RdfQuad } from "./rdf-api.ts";
import { parseRdfQuadsWithJsonLd } from "./jsonld/jsonld-adapter.ts";
import { parseRdfQuadsWithN3 } from "./n3/n3-adapter.ts";
import { parseRdfXml } from "./xml/rdfxml-adapter.ts";
import { RdfMemorySource } from "./rdf-memory-source.ts";

const { namedNode, blankNode, literal, quad } = DataFactory;

test.each([
  {
    format: "Turtle",
    parse: parseRdfQuadsWithN3,
    content: '<urn:s> <urn:p> <urn:o>, "plain", "text"@EN .',
  },
  {
    format: "JSON-LD",
    parse: parseRdfQuadsWithJsonLd,
    content: JSON.stringify({
      "@id": "urn:s",
      "urn:p": [{ "@id": "urn:o" }, { "@value": "plain" }, { "@value": "text", "@language": "EN" }],
    }),
  },
  {
    format: "RDF/XML",
    parse: parseRdfXml,
    content: `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:ex="urn:">
      <rdf:Description rdf:about="urn:s">
        <ex:p rdf:resource="urn:o" />
        <ex:p>plain</ex:p>
        <ex:p xml:lang="EN">text</ex:p>
      </rdf:Description>
    </rdf:RDF>`,
  },
])("$format produces interoperable RDF/JS quads", async ({ parse, content }) => {
  const actual = await parse(content);
  const expected = [namedNode("urn:o"), literal("plain"), literal("text", "en")]
    .map(object => quad(namedNode("urn:s"), namedNode("urn:p"), object));

  expect(actual).toHaveLength(expected.length);
  const store = new Store(actual);
  for (const expectedQuad of expected) {
    expect(store.has(expectedQuad)).toBe(true);
    const match = actual.find(value => value.equals(expectedQuad));
    expect(match).toBeDefined();
    expect(expectedQuad.equals(match)).toBe(true);
    expect(match.termType).toBe("Quad");
    expect(match.value).toBe("");
    expect(match.graph.equals(RdfNode.defaultGraph())).toBe(true);
    expect(match.equals(null)).toBe(false);
    expect(match.equals(undefined)).toBe(false);
    if (RdfObject.isLiteral(match.object)) {
      expect(match.object.datatype.termType).toBe("NamedNode");
      expect(match.object.equals(literal("different"))).toBe(false);
      expect(match.object.equals(literal(match.object.value, "cs"))).toBe(false);
    }
  }
});

test("node factories and guards support RDF/JS terms", () => {
  const node = RdfNode.namedNode("urn:s");
  expect(node.equals(namedNode("urn:s"))).toBe(true);
  expect(node.equals(blankNode("urn:s"))).toBe(false);
  expect(node.equals(null)).toBe(false);
  expect(node.equals(undefined)).toBe(false);
  expect(RdfNode.defaultGraph().value).toBe("");
  expect(RdfObject.isNode(node)).toBe(true);
  expect(RdfObject.isNode(blankNode("b"))).toBe(true);
  expect(RdfObject.isNotNode(literal("value"))).toBe(true);
  expect(RdfObject.isLiteral(node)).toBe(false);
});

class ScopedRdfSource extends RdfMemorySource {
  static scope(quads: RdfQuad[], prefix: string): RdfQuad[] {
    return this.prefixBlankNodes(quads, prefix);
  }
}

test("blank-node scoping preserves equality, graph names, nested quads and original terms", () => {
  const blank = blankNode("shared");
  const predicate = namedNode("urn:p");
  const nested = quad(blank, predicate, blank);
  const original = [quad(blank, predicate, blank, blank), quad(nested, predicate, literal("text"))];
  const first = ScopedRdfSource.scope(original, "https://example.com/first");
  const second = ScopedRdfSource.scope(original, "https://example.com/second");

  expect(first[0].subject.value).not.toBe(second[0].subject.value);
  expect(first[0].subject.value.startsWith("_:")).toBe(false);
  expect(first[0].subject.equals(first[0].object)).toBe(true);
  expect(first[0].subject.equals(first[0].graph)).toBe(true);
  expect(first[0].equals(quad(first[0].subject, predicate, first[0].object, first[0].graph))).toBe(true);
  expect(first[1].subject.equals(quad(first[0].subject, predicate, first[0].object))).toBe(true);
  expect(new Store([...first, ...second]).size).toBe(4);
  expect(blank.value).toBe("shared");
  expect(original[0].subject).toBe(blank);
  expect(nested.subject).toBe(blank);
});

test("N3 parsing rejects invalid RDF", async () => {
  await expect(parseRdfQuadsWithN3("invalid turtle")).rejects.toThrow();
});

test("directional literals retain their direction and datatype through parsing and scoping", async () => {
  const parsed = await parseRdfQuadsWithN3('<urn:s> <urn:p> "text"@ar--rtl, "text"@ar--ltr .');
  const scoped = ScopedRdfSource.scope(parsed, "https://example.com/vocabulary");
  const object = scoped[0].object;
  expect(RdfObject.isLiteral(object)).toBe(true);
  if (!RdfObject.isLiteral(object)) {
    throw new Error("Expected a literal.");
  }
  expect(object.language).toBe("ar");
  expect(object.direction).toBe("rtl");
  expect(object.datatype.value).toBe("http://www.w3.org/1999/02/22-rdf-syntax-ns#dirLangString");
  expect(object.equals(parsed[0].object)).toBe(true);
  expect(object.equals(scoped[1].object)).toBe(false);
});
