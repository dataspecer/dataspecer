import {
  CONTROLLED_VOCABULARY_ASSIGNMENT,
  ControlledVocabularyAssignment,
  SEMANTIC_MODEL_CLASS_PROFILE,
  SemanticModelClassProfile,
} from "./concepts/index.ts";

/**
 * Class profile for tests. Everything is empty unless overridden.
 * Builders from the profile-model package cannot be used in this package,
 * as that package depends on this one.
 */
export function classProfileFixture(
  overrides: Partial<SemanticModelClassProfile> = {},
): SemanticModelClassProfile {
  return {
    id: "1",
    type: [SEMANTIC_MODEL_CLASS_PROFILE],
    iri: ":1",
    name: null,
    nameFromProfiled: null,
    description: null,
    descriptionFromProfiled: null,
    profiling: [],
    usageNote: null,
    usageNoteFromProfiled: null,
    externalDocumentationUrl: null,
    tags: [],
    controlledVocabularies: [],
    ...overrides,
  };
}

/**
 * Controlled vocabulary assignment for tests.
 */
export function assignmentFixture(
  overrides: Partial<ControlledVocabularyAssignment> = {},
): ControlledVocabularyAssignment {
  return {
    id: "cv-1",
    type: [CONTROLLED_VOCABULARY_ASSIGNMENT],
    classProfile: "ancestor",
    vocabulary: "voc-1",
    qualifier: "must",
    iri: null,
    replaces: null,
    ...overrides,
  };
}
