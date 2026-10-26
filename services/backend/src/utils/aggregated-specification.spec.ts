import { CONTROLLED_VOCABULARY_MODEL, LOCAL_PACKAGE, LOCAL_SEMANTIC_MODEL } from "@dataspecer/core-v2/model/known-models";
import { CONTROLLED_VOCABULARY_ASSIGNMENT, SEMANTIC_MODEL_CLASS_PROFILE } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import { PROJECT_MODEL_MODEL_ENTITY } from "@dataspecer/core/project-model";
import { PROJECT_MODEL_ID } from "../models/model-id.ts";
import { getSpecificationFromModels } from "./aggregated-specification.ts";

function packageEntity(id: string, subModels: string[]) {
  return {
    id,
    type: [PROJECT_MODEL_MODEL_ENTITY],
    label: {},
    description: {},
    modelType: LOCAL_PACKAGE,
    subModels,
    projectId: "root",
    reusedProjects: [],
  };
}

function resourceEntity(id: string, modelType: string) {
  return { id, type: [PROJECT_MODEL_MODEL_ENTITY], label: {}, description: {}, modelType, projectId: "root" };
}

/**
 * A semantic model of the given identifier and its entities.
 */
function semanticModel(id: string, entities: object[]): EntityRecord {
  return Object.fromEntries([
    { id, type: [LOCAL_SEMANTIC_MODEL], baseIri: "http://example.com/" },
    ...entities,
  ].map((entity) => [(entity as { id: string }).id, entity])) as EntityRecord;
}

function classProfile(id: string, overrides: object = {}) {
  return {
    id,
    type: [SEMANTIC_MODEL_CLASS_PROFILE],
    iri: `:${id}`,
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

function assignment(id: string, classProfileId: string, vocabulary: string) {
  return {
    id,
    type: [CONTROLLED_VOCABULARY_ASSIGNMENT],
    classProfile: classProfileId,
    vocabulary,
    qualifier: "must",
    iri: null,
    replaces: null,
  };
}

function vocabularyModel(id: string): EntityRecord {
  return {
    [id]: {
      id,
      type: ["controlled-vocabulary"],
      title: { en: id },
      pattern: null,
      references: "http://example.com/scheme",
      conformsToSkos: true,
      documentation: null,
      distribution: { downloadUrl: null, accessUrl: "http://example.com/distribution" },
      iri: null,
    },
  } as unknown as EntityRecord;
}

/**
 * The project is a package with its own profile and one nested package with
 * another profile of a vocabulary. Each of the packages has a controlled
 * vocabulary, unless asked not to.
 */
function createModels(withControlledVocabularies: boolean = true): Record<string, EntityRecord> {
  const rootCv = withControlledVocabularies ? ["root-cv"] : [];
  const parentCv = withControlledVocabularies ? ["parent-cv"] : [];
  return {
    [PROJECT_MODEL_ID]: Object.fromEntries([
      packageEntity("root", ["root/profile", ...rootCv, "root/parent"]),
      resourceEntity("root/profile", LOCAL_SEMANTIC_MODEL),
      ...rootCv.map((id) => resourceEntity(id, CONTROLLED_VOCABULARY_MODEL)),
      packageEntity("root/parent", ["root/parent/profile", "root/parent/vocabulary", ...parentCv]),
      resourceEntity("root/parent/profile", LOCAL_SEMANTIC_MODEL),
      resourceEntity("root/parent/vocabulary", LOCAL_SEMANTIC_MODEL),
      ...parentCv.map((id) => resourceEntity(id, CONTROLLED_VOCABULARY_MODEL)),
    ].map((entity) => [entity.id, entity])) as unknown as EntityRecord,
    "root": { root: { id: "root" } } as unknown as EntityRecord,
    "root/parent": { "root/parent": { id: "root/parent" } } as unknown as EntityRecord,
    "root/profile": semanticModel("root/profile", [
      classProfile("child", { profiling: ["parent"], controlledVocabularies: ["child-assignment"] }),
      assignment("child-assignment", "child", "root-cv"),
    ]),
    "root/parent/profile": semanticModel("root/parent/profile", [
      classProfile("parent", { controlledVocabularies: ["parent-assignment"] }),
      assignment("parent-assignment", "parent", "parent-cv"),
      // The assignment of a class profile that nothing in the root profiles.
      classProfile("unrelated", { controlledVocabularies: ["unrelated-assignment"] }),
      assignment("unrelated-assignment", "unrelated", "parent-cv"),
    ]),
    // The profile needs a model to profile, even if it profiles nothing.
    "root/parent/vocabulary": semanticModel("root/parent/vocabulary", []),
    ...Object.fromEntries([...rootCv, ...parentCv].map((id) => [id, vocabularyModel(id)])),
  };
}

describe("getSpecificationFromModels", () => {

  it("Provides the assignments next to the class profiles that list them.", () => {
    const { aggregatedSemanticModel } = getSpecificationFromModels("root", createModels());
    const ids = aggregatedSemanticModel.map((entity) => entity.id);
    expect(ids).toContain("child");
    expect(ids).toContain("child-assignment");
  });

  it("Provides every assignment that a class profile lists, also the one from a nested package.", () => {
    const { aggregatedSemanticModel } = getSpecificationFromModels("root", createModels());
    const ids = new Set(aggregatedSemanticModel.map((entity) => entity.id));
    const child = aggregatedSemanticModel.find((entity) => entity.id === "child") as unknown as { controlledVocabularies: string[] };

    expect(child.controlledVocabularies).toContain("parent-assignment");
    for (const assignmentId of child.controlledVocabularies) {
      expect(ids).toContain(assignmentId);
    }
  });

  it("Does not provide assignments that no returned class profile lists.", () => {
    const { aggregatedSemanticModel } = getSpecificationFromModels("root", createModels());
    expect(aggregatedSemanticModel.map((entity) => entity.id)).not.toContain("unrelated-assignment");
  });

  it("Provides the vocabularies of the project and of its nested packages.", () => {
    const { controlledVocabularies } = getSpecificationFromModels("root", createModels());
    expect(controlledVocabularies.map((vocabulary) => vocabulary.id).sort()).toStrictEqual(["parent-cv", "root-cv"]);
  });

  it("Provides the vocabulary of every returned assignment.", () => {
    const { aggregatedSemanticModel, controlledVocabularies } = getSpecificationFromModels("root", createModels());
    const vocabularyIds = new Set(controlledVocabularies.map((vocabulary) => vocabulary.id));
    for (const entity of aggregatedSemanticModel) {
      if ((entity.type as string[]).includes(CONTROLLED_VOCABULARY_ASSIGNMENT)) {
        expect(vocabularyIds).toContain((entity as unknown as { vocabulary: string }).vocabulary);
      }
    }
  });

  it("Provides no vocabularies for a project without any.", () => {
    expect(getSpecificationFromModels("root", createModels(false)).controlledVocabularies).toStrictEqual([]);
  });

});
