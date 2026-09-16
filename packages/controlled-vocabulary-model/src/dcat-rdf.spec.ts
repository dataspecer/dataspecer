import * as N3 from "n3";
import { expect, test } from "vitest";
import {
  controlledVocabulariesToDcatCatalog,
  controlledVocabularyDatasetIri,
  parseControlledVocabularyCatalog,
  writeControlledVocabularyCatalogQuads,
} from "./dcat-rdf.ts";
import { DEFAULT_CONTROLLED_VOCABULARY, type ControlledVocabulary } from "./concepts/controlled-vocabulary.ts";

const CATALOG_IRI = "http://example.com/catalog";

function vocabulary(overrides: Partial<ControlledVocabulary> & { id: string }): ControlledVocabulary {
  return { ...DEFAULT_CONTROLLED_VOCABULARY, ...overrides };
}

function turtleToQuads(turtle: string): N3.Quad[] {
  return new N3.Parser().parse(turtle);
}

test("Round-trips controlled vocabularies with no prior iri through a DCAT catalog.", async () => {
  const original = [
    vocabulary({
      id: "voc-1",
      title: "Dublin Core",
      pattern: "^http://purl\\.org/dc/terms/.+$",
      references: "http://purl.org/dc/terms/",
      documentation: "https://www.dublincore.org/terms/",
      distribution: { downloadUrl: "https://www.dublincore.org/terms.rdf", accessUrl: "https://www.dublincore.org/terms.rdf" },
    }),
    vocabulary({
      id: "voc-2",
      title: "Geonames",
      pattern: "",
      references: "http://www.geonames.org/",
      documentation: "",
      distribution: { downloadUrl: "", accessUrl: "https://example.com/geonames" },
    }),
  ];

  const turtle = await controlledVocabulariesToDcatCatalog(CATALOG_IRI, original);
  const parsed = parseControlledVocabularyCatalog(turtleToQuads(turtle));

  expect(parsed).toHaveLength(original.length);
  for (const source of original) {
    const match = parsed.find((v) => v.references === source.references);
    expect(match).toBeDefined();
    expect(match!.title).toBe(source.title);
    expect(match!.pattern).toBe(source.pattern);
    expect(match!.documentation).toBe(source.documentation);
    expect(match!.distribution).toStrictEqual(source.distribution);
    // Freshly minted on parse - unrelated to the source id, but stable and non-empty.
    expect(match!.id).toBeTruthy();
    expect(match!.id).not.toBe(source.id);
    // No prior iri, so the writer mints the same deterministic dataset IRI
    // the parser then reads back as this vocabulary's own iri.
    expect(match!.iri).toBe(controlledVocabularyDatasetIri(CATALOG_IRI, source.id));
  }
});

test("A vocabulary with an existing iri keeps it through export instead of minting a new one.", async () => {
  const importedIri = "http://other-catalog.example.com/dataset/imported-cv";
  const original = vocabulary({
    id: "voc-imported",
    title: "Imported Vocabulary",
    references: "http://example.com/scheme",
    iri: importedIri,
  });

  const turtle = await controlledVocabulariesToDcatCatalog(CATALOG_IRI, [original]);
  const parsed = parseControlledVocabularyCatalog(turtleToQuads(turtle));

  expect(parsed).toHaveLength(1);
  expect(parsed[0]!.iri).toBe(importedIri);
});

test("writeControlledVocabularyCatalogQuads merges into an existing writer without disturbing its other triples.", async () => {
  const otherSubject = N3.DataFactory.namedNode("http://example.com/unrelated-subject");
  const otherPredicate = N3.DataFactory.namedNode("http://example.com/unrelated-predicate");
  const otherObject = N3.DataFactory.literal("unrelated value");

  const writer = new N3.Writer();
  writer.addQuad(otherSubject, otherPredicate, otherObject);

  const turtle = await new Promise<string>((resolve, reject) => {
    writeControlledVocabularyCatalogQuads(writer, CATALOG_IRI, [
      vocabulary({ id: "voc-1", title: "Dublin Core", references: "http://purl.org/dc/terms/" }),
    ]);
    writer.end((error, result) => (error ? reject(error) : resolve(result)));
  });

  const quads = turtleToQuads(turtle);
  const hasUnrelatedTriple = quads.some(
    (q) => q.subject.equals(otherSubject) && q.predicate.equals(otherPredicate) && q.object.equals(otherObject),
  );
  expect(hasUnrelatedTriple).toBe(true);

  const parsed = parseControlledVocabularyCatalog(quads);
  expect(parsed).toHaveLength(1);
  expect(parsed[0]!.title).toBe("Dublin Core");
});
