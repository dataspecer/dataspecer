import { expect, test } from "vitest";
import {
  controlledVocabularyModelEntitiesToSerialization,
  serializationToControlledVocabularyModelEntities,
} from "./serialization.ts";
import { DEFAULT_CONTROLLED_VOCABULARY, type ControlledVocabulary } from "./concepts/controlled-vocabulary.ts";

test("Missing data yields the default vocabulary.", () => {
  const entities = serializationToControlledVocabularyModelEntities("cv-1", null);
  expect(entities["cv-1"]).toStrictEqual({
    ...DEFAULT_CONTROLLED_VOCABULARY,
    id: "cv-1",
    type: ["controlled-vocabulary"],
  });
});

test("Reads empty strings stored for optional fields as null.", () => {
  const entities = serializationToControlledVocabularyModelEntities("cv-1", {
    title: "Legacy",
    pattern: "",
    references: "http://example.com/scheme",
    documentation: "",
    distribution: { downloadUrl: "", accessUrl: "http://example.com/access" },
    iri: null,
  });
  const entity = entities["cv-1"] as ControlledVocabulary;
  expect(entity.pattern).toBeNull();
  expect(entity.documentation).toBeNull();
  expect(entity.distribution).toStrictEqual({
    downloadUrl: null,
    accessUrl: "http://example.com/access",
  });
  // Stored before conformsToSkos existed.
  expect(entity.conformsToSkos).toBe(true);
  expect(entity.references).toBe("http://example.com/scheme");
});

test("Keeps filled optional fields and round-trips through the serialization.", () => {
  const original = serializationToControlledVocabularyModelEntities("cv-1", {
    title: "Filled",
    pattern: "^http://example\\.com/.*$",
    references: "http://example.com/scheme",
    conformsToSkos: false,
    documentation: "http://example.com/docs",
    distribution: { downloadUrl: "http://example.com/file.rdf", accessUrl: "http://example.com/access" },
    iri: null,
  });
  const serialized = controlledVocabularyModelEntitiesToSerialization("cv-1", original);
  const restored = serializationToControlledVocabularyModelEntities("cv-1", serialized);
  expect(restored).toStrictEqual(original);
  const entity = restored["cv-1"] as ControlledVocabulary;
  expect(entity.pattern).toBe("^http://example\\.com/.*$");
  expect(entity.conformsToSkos).toBe(false);
  expect(entity.distribution).toStrictEqual({ downloadUrl: "http://example.com/file.rdf", accessUrl: "http://example.com/access" });
});
