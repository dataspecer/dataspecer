import { describe, expect, test } from "vitest";
import { isSemanticModelGeneralization } from "@dataspecer/core-v2/semantic-model/concepts";
import { ControlledVocabularyAssignment } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { isVisualProfileRelationship } from "@dataspecer/visual-model";

import { createCreateClassProfileBatch, createUpdateClassProfileBatch } from "./update-class-profile-batch";
import { CmeClassProfileRole } from "../../dataspecer/cme-model/model";
import { VocabularyItemState } from "../../dialog/controlled-vocabularies";
import {
  addNode,
  createClass,
  createClassProfile,
  createOperationTestContext,
  OperationTestContext,
} from "../../operation/implementation/operation-test-utilities";

type DialogState = Parameters<typeof createUpdateClassProfileBatch>[3];

describe("createUpdateClassProfileBatch", () => {

  test("Dialog state is mapped to the operation arguments.", () => {
    const context = createOperationTestContext();
    const model = context.semanticModel.getId();
    const state = createState(model, {
      overrideName: true, role: "main", externalDocumentationUrl: "", order: "",
      controlledVocabularies: { items: [vocabulary("own", null), vocabulary("inherited", "inherited-assignment")] },
    });

    const batch = createUpdateClassProfileBatch(context.createContext, null, "entity", state, state);

    expect(batch.operations).toMatchObject([{
      profileModel: model,
      entity: "entity",
      profileOf: ["profiled"],
      iri: "http://example.com/p",
      name: { en: "Name" },
      nameSource: null,
      description: { en: "Description" },
      descriptionSource: "description-source",
      usageNote: { en: "Usage" },
      usageNoteSource: "usage-note-source",
      // Empty values are stored as null, as in the legacy adapter.
      externalDocumentationUrl: null,
      tags: [CmeClassProfileRole.Main],
      order: null,
    }, {
      entity: "entity", model, previous: [], next: [],
    }, {
      profileModel: model,
      entity: "entity",
      // The inherited row without an override is not persisted.
      next: [{ assignment: null, vocabulary: "own", qualifier: "must", replaces: null }],
    }]);
    // There is no visual model, so the "profile of" edges are not touched.
    expect(batch.operations.length).toBe(3);
  });

  test("Executed batch updates the profile and the \"profile of\" edges.", async () => {
    const context = createOperationTestContext();
    const model = context.semanticModel.getId();
    const a = await createClass(context, "a");
    const b = await createClass(context, "b");
    const profile = await createClassProfile(context, a);
    const profileNode = addNode(context, profile);
    const bNode = addNode(context, b);
    const initial = createState(model, { profiles: [{ identifier: a }] });
    const state = createState(model, {
      profiles: [{ identifier: a }, { identifier: b }], overrideName: true, role: "undefined", order: "3",
      controlledVocabularies: { items: [vocabulary("own", null)] },
    });

    const outcome = await context.executor.execute(createUpdateClassProfileBatch(
      context.createContext, context.visualModel, profile, initial, state));

    expect(outcome.exception).toBeUndefined();
    expect(context.semanticModel.getEntities()[profile]).toMatchObject({
      profiling: [a, b], name: { en: "Name" }, tags: [], order: "3",
    });
    expect(assignmentsOf(context, profile)).toEqual(["own"]);
    const edges = [...context.visualModel.getVisualEntities().values()].filter(isVisualProfileRelationship);
    expect(edges).toMatchObject([{ entity: profile, visualSource: profileNode, visualTarget: bNode }]);
  });

});

describe("createCreateClassProfileBatch", () => {

  test("Executed batch creates the profile, its specializations and vocabularies.", async () => {
    const context = createOperationTestContext();
    const model = context.semanticModel.getId();
    const a = await createClass(context, "a");
    const parent = await createClassProfile(context, a);
    const state = createState(model, {
      profiles: [{ identifier: a }], role: "supportive",
      specializations: [{ iri: null, specializationOf: { identifier: parent, model } }],
      controlledVocabularies: { items: [vocabulary("own", null)] },
    });

    const { batch, created } = createCreateClassProfileBatch(context.createContext, state);
    const outcome = await context.executor.execute(batch);

    expect(outcome.exception).toBeUndefined();
    expect(created.model).toBe(model);
    expect(context.semanticModel.getEntities()[created.identifier]).toMatchObject({
      profiling: [a], tags: [CmeClassProfileRole.Supportive],
    });
    const parents = Object.values(context.semanticModel.getEntities())
      .filter(isSemanticModelGeneralization)
      .filter(item => item.child === created.identifier)
      .map(item => item.parent);
    expect(parents).toEqual([parent]);
    expect(assignmentsOf(context, created.identifier)).toEqual(["own"]);
  });

});

/**
 * Only the fields the batch reads, the rest of the dialog state is not used.
 */
function createState(
  model: string,
  overrides: Partial<Record<keyof DialogState, unknown>>,
): DialogState {
  return {
    model: { identifier: model },
    profiles: [{ identifier: "profiled" }],
    iri: "http://example.com/p",
    name: { en: "Name" },
    overrideName: false,
    nameSource: { identifier: "name-source" },
    description: { en: "Description" },
    overrideDescription: false,
    descriptionSource: { identifier: "description-source" },
    usageNote: { en: "Usage" },
    overrideUsageNote: false,
    usageNoteSource: { identifier: "usage-note-source" },
    externalDocumentationUrl: "http://example.com/doc",
    availableRoles: [
      { value: "undefined", cme: null },
      { value: "main", cme: CmeClassProfileRole.Main },
      { value: "supportive", cme: CmeClassProfileRole.Supportive },
    ],
    role: "undefined",
    order: "",
    specializations: [],
    controlledVocabularies: { items: [] },
    ...overrides,
  } as unknown as DialogState;
}

/**
 * @param inheritedAssignment When not null, the row is inherited and not overridden.
 */
function vocabulary(identifier: string, inheritedAssignment: string | null): VocabularyItemState {
  return {
    id: identifier,
    entityId: null,
    vocabulary: { state: "found", vocabulary: { id: identifier } },
    qualifier: "must",
    inherited: inheritedAssignment === null ? null : {
      assignmentId: inheritedAssignment, overrideEnabled: false,
    },
  } as unknown as VocabularyItemState;
}

function assignmentsOf(context: OperationTestContext, classProfile: string): string[] {
  return Object.values(context.semanticModel.getEntities())
    .filter(item => (item as ControlledVocabularyAssignment).classProfile === classProfile)
    .map(item => (item as ControlledVocabularyAssignment).vocabulary);
}
