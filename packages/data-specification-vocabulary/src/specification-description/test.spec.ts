import { JsonLdStringToDSVMetadata } from "./from-rdf.ts";
import type { VocabularySpecificationDocument } from "./model.ts";
import { DSVMetadataToJsonLdString } from "./to-rdf.ts";
import { dsvMetadataWellKnown } from "./well-known.ts";

const documentRoot = "http://example.org/resource/2";
const specification = {
  iri: "http://example.org/specification/1",
  types: ["VocabularySpecificationDocument"],

  title: { en: "Test Specification" },
  description: { en: "A specification for testing purposes." },

  isProfileOf: [
    {
      url: "http://example.org/specification/base",
    },
  ],

  resources: [
    {
      iri: "http://example.org/resource/1",
      url: "http://example.org/resource/1/download",

      formatMime: dsvMetadataWellKnown.formatMime.turtle,
      role: dsvMetadataWellKnown.role.vocabulary,

      conformsTo: ["http://example.org/standard/1", "http://example.org/standard/2"],

      // Additional types
      additionalRdfTypes: ["http://example.org/AdditionalType1", "http://example.org/AdditionalType2"],
    },
    {
      iri: documentRoot,
      url: "http://example.org/resource/2/download",

      formatMime: dsvMetadataWellKnown.formatMime.html,
      role: dsvMetadataWellKnown.role.specification,

      additionalRdfTypes: [],
      conformsTo: [],
    },
  ],
} satisfies VocabularySpecificationDocument;

test("Roundtrip DSV Metadata to JSON-LD and back", async () => {
  const specifications = [specification];

  const outputString = await DSVMetadataToJsonLdString(specifications, {
    rootHtmlDocumentIri: documentRoot,
  });
  const generatedSpecifications = await JsonLdStringToDSVMetadata(outputString, { baseIri: "http://example.org/" });

  expect(generatedSpecifications).toEqual(specifications);
});

test("https://github.com/dataspecer/dataspecer/issues/1366", async () => {
  const spec = structuredClone(specification);

  spec.resources[0].role = "http://www.w3.org/ns/dx/prof/role/Vocabulary";

  const specifications = [spec];

  const outputString = await DSVMetadataToJsonLdString(specifications, {
    rootHtmlDocumentIri: documentRoot,
  });

  const outputJson = JSON.parse(outputString);

  // hasArtifact

  const hasArtifact = "http://example.com/usingHasArtifactDirectly";

  outputJson.inSpecificationOf[0].isProfileOf.push({
    hasArtifact: hasArtifact,
  });

  const generatedSpecifications = await JsonLdStringToDSVMetadata(JSON.stringify(outputJson), { baseIri: "http://example.org/" });

  expect(generatedSpecifications[0].isProfileOf[1].url).toEqual(hasArtifact);

  expect(generatedSpecifications[0].resources[0].role).toStrictEqual(dsvMetadataWellKnown.role.vocabulary);
});
