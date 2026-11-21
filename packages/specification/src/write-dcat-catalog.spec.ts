import * as N3 from "n3";
import { expect, test } from "vitest";
import { CONTROLLED_VOCABULARY_MODEL } from "@dataspecer/core-v2/model/known-models";
import { controlledVocabularyCatalogIri, controlledVocabularyDatasetIri, DEFAULT_CONTROLLED_VOCABULARY } from "@dataspecer/controlled-vocabulary-model";
import type { ProjectModelEntity } from "@dataspecer/core/project-model";
import { writeDcatCatalog } from "./specification.ts";

const BASE_IRI = "http://example.com/";
const DCAT_DATASET = "http://www.w3.org/ns/dcat#dataset";

test("The standalone catalog names each dataset by the catalog of the package owning the vocabulary.", async () => {
  const rootCatalogIri = controlledVocabularyCatalogIri(BASE_IRI, "root");
  const nestedCatalogIri = controlledVocabularyCatalogIri(BASE_IRI, "nested");

  const projectModel = {
    "cv-root": { id: "cv-root", modelType: CONTROLLED_VOCABULARY_MODEL },
    "cv-nested": { id: "cv-nested", modelType: CONTROLLED_VOCABULARY_MODEL },
  } as unknown as Record<string, ProjectModelEntity>;
  // Neither vocabulary has an IRI of its own yet, so dataset IRIs are minted.
  const allModels = {
    "cv-root": { "cv-root": { ...DEFAULT_CONTROLLED_VOCABULARY, id: "cv-root" } },
    "cv-nested": { "cv-nested": { ...DEFAULT_CONTROLLED_VOCABULARY, id: "cv-nested" } },
  };
  const catalogIris = new Map([
    ["cv-root", rootCatalogIri],
    ["cv-nested", nestedCatalogIri],
  ]);

  let written = "";
  const wrote = await writeDcatCatalog(
    projectModel, allModels,
    async (_path: string, data: string) => { written = data; },
    "controlled_vocabulary_catalog.ttl",
    rootCatalogIri,
    catalogIris,
  );

  expect(wrote).toBe(true);
  const datasets = new N3.Parser().parse(written)
    .filter((quad) => quad.subject.value === rootCatalogIri && quad.predicate.value === DCAT_DATASET)
    .map((quad) => quad.object.value);
  // The same IRIs class profile assignments reference.
  expect(datasets.sort()).toStrictEqual([
    controlledVocabularyDatasetIri(rootCatalogIri, "cv-root"),
    controlledVocabularyDatasetIri(nestedCatalogIri, "cv-nested"),
  ].sort());
});
