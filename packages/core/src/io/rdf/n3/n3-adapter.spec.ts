import { parseRdfQuadsWithN3 } from "./n3-adapter.ts";
import { RdfNode } from "../rdf-api.ts";
import { DataFactory } from "n3";

test("Load sample TRIG.", async () => {
  const input = `
  PREFIX c: <http://example.org/cartoons#>
  c:Tom a c:Cat.
  c:Jerry a c:Mouse;
  c:smarterThan c:Tom.
  <a> <b> "Some text \\"in quotes\\" and \\\\ backslash."@en .
  <c> <d> 42 .`;
  const actual = await parseRdfQuadsWithN3(input);
  const expected = [
    {
      subject: RdfNode.namedNode("http://example.org/cartoons#Tom"),
      predicate: RdfNode.namedNode(
        "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
      ),
      object: RdfNode.namedNode("http://example.org/cartoons#Cat"),
      graph: RdfNode.defaultGraph(),
    },
    {
      subject: RdfNode.namedNode("http://example.org/cartoons#Jerry"),
      predicate: RdfNode.namedNode(
        "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
      ),
      object: RdfNode.namedNode("http://example.org/cartoons#Mouse"),
      graph: RdfNode.defaultGraph(),
    },
    {
      subject: RdfNode.namedNode("http://example.org/cartoons#Jerry"),
      predicate: RdfNode.namedNode("http://example.org/cartoons#smarterThan"),
      object: RdfNode.namedNode("http://example.org/cartoons#Tom"),
      graph: RdfNode.defaultGraph(),
    },
    {
      subject: RdfNode.namedNode("a"),
      predicate: RdfNode.namedNode("b"),
      object: DataFactory.literal('Some text "in quotes" and \\ backslash.', "en"),
      graph: RdfNode.defaultGraph(),
    },
    {
      subject: RdfNode.namedNode("c"),
      predicate: RdfNode.namedNode("d"),
      object: DataFactory.literal("42", RdfNode.namedNode("http://www.w3.org/2001/XMLSchema#integer")),
      graph: RdfNode.defaultGraph(),
    },
  ];
  expect(actual).toHaveLength(expected.length);
  expected.forEach((quad, index) => {
    expect(actual[index].equals(DataFactory.quad(quad.subject, quad.predicate, quad.object, quad.graph))).toBe(true);
  });
});
