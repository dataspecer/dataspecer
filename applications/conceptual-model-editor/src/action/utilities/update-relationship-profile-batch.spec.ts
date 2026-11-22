import { describe, expect, test } from "vitest";
import { isSemanticModelGeneralization } from "@dataspecer/core-v2/semantic-model/concepts";
import { SemanticModelRelationshipProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";

import {
  createCreateRelationshipProfileBatch,
  createUpdateRelationshipProfileBatch,
} from "./update-relationship-profile-batch";
import { CmeRelationshipProfileMandatoryLevel, NewCmeSpecialization } from "../../dataspecer/cme-model/model";
import { cmeOperations } from "../../operation";
import {
  createClass,
  createClassProfile,
  createGeneralization,
  createOperationTestContext,
  createRelationship,
  OperationTestContext,
  run,
} from "../../operation/implementation/operation-test-utilities";

type DialogState = Parameters<typeof createUpdateRelationshipProfileBatch>[2];

describe("createUpdateRelationshipProfileBatch", () => {

  test("Overridden values are stored, the others are taken from the profiled entity.", () => {
    const context = createOperationTestContext();
    const model = context.semanticModel.getId();
    const state = createState(model, {
      overrideName: true, overrideDescription: false, overrideUsageNote: true,
      overrideDomainCardinality: false, overrideRangeCardinality: true,
      order: "",
      specializations: [specialization("parent", null)],
    });

    const batch = createUpdateRelationshipProfileBatch(context.createContext, "entity", state, state);

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
      usageNoteSource: null,
      domain: "domain",
      domainCardinality: null,
      range: "range",
      rangeCardinality: [1, null],
      externalDocumentationUrl: "http://example.com/doc",
      mandatoryLevel: CmeRelationshipProfileMandatoryLevel.Mandatory,
      order: null,
    }, {
      entity: "entity",
      model,
      previous: [{ iri: null, specializationOf: "parent", generalization: null }],
      next: [{ iri: null, specializationOf: "parent", generalization: null }],
    }]);
  });

  test("Undefined mandatory level is stored as null.", () => {
    const context = createOperationTestContext();
    const state = createState(context.semanticModel.getId(), { mandatoryLevel: "undefined" });

    const batch = createUpdateRelationshipProfileBatch(context.createContext, "entity", state, state);

    expect(batch.operations[0].mandatoryLevel).toBeNull();
  });

  test("Executed batch updates the profile and its specializations.", async () => {
    const context = createOperationTestContext();
    const model = context.semanticModel.getId();
    const a = await createClass(context, "a");
    const b = await createClass(context, "b");
    const ab = await createRelationship(context, a, b, "a-b");
    const profileA = await createClassProfile(context, a);
    const profileB = await createClassProfile(context, b);
    const profile = await createRelationshipProfile(context, ab, profileA, profileB);
    const other = await createRelationshipProfile(context, ab, profileA, profileB);
    const dropped = await createRelationshipProfile(context, ab, profileA, profileB);
    const droppedGeneralization = await createGeneralization(context, profile, dropped);
    const initial = createState(model, {
      specializations: [specialization(dropped, { identifier: droppedGeneralization, model })],
    });
    const state = createState(model, {
      profiles: [{ identifier: ab }], domain: { identifier: profileA }, range: { identifier: profileB },
      overrideName: true, overrideRangeCardinality: true, order: "2",
      specializations: [specialization(other, null)],
    });

    const outcome = await context.executor.execute(
      createUpdateRelationshipProfileBatch(context.createContext, profile, initial, state));

    expect(outcome.exception).toBeUndefined();
    const entity = context.semanticModel.getEntities()[profile] as SemanticModelRelationshipProfile;
    expect(entity.ends[1]).toMatchObject({
      iri: "http://example.com/p", name: { en: "Name" }, concept: profileB, cardinality: [1, null],
      tags: [CmeRelationshipProfileMandatoryLevel.Mandatory], order: "2",
    });
    expect(parentsOf(context, profile)).toEqual([other]);
  });

});

describe("createCreateRelationshipProfileBatch", () => {

  test("Given ends replace the domain and range of the state.", async () => {
    const context = createOperationTestContext();
    const model = context.semanticModel.getId();
    const a = await createClass(context, "a");
    const b = await createClass(context, "b");
    const ab = await createRelationship(context, a, b, "a-b");
    const profileA = await createClassProfile(context, a);
    const profileB = await createClassProfile(context, b);
    const state = createState(model, { profiles: [{ identifier: ab }] });

    const { batch, created } = createCreateRelationshipProfileBatch(
      context.createContext, state, { domain: profileA, range: profileB });
    const outcome = await context.executor.execute(batch);

    expect(outcome.exception).toBeUndefined();
    const entity = context.semanticModel.getEntities()[created.identifier] as SemanticModelRelationshipProfile;
    expect(entity.ends[0].concept).toBe(profileA);
    expect(entity.ends[1]).toMatchObject({
      concept: profileB, profiling: [ab], tags: [CmeRelationshipProfileMandatoryLevel.Mandatory],
    });
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
    domain: { identifier: "domain" },
    overrideDomainCardinality: false,
    domainCardinality: { cardinality: [0, 1] },
    range: { identifier: "range" },
    overrideRangeCardinality: false,
    rangeCardinality: { cardinality: [1, null] },
    externalDocumentationUrl: "http://example.com/doc",
    availableMandatoryLevels: [
      { value: "undefined", cme: null },
      { value: "mandatory", cme: CmeRelationshipProfileMandatoryLevel.Mandatory },
    ],
    mandatoryLevel: "mandatory",
    order: "",
    specializations: [],
    ...overrides,
  } as unknown as DialogState;
}

function specialization(
  parent: string,
  generalization: { identifier: string, model: string } | null,
): NewCmeSpecialization {
  return {
    iri: null,
    specializationOf: { identifier: parent, model: "" },
    ...(generalization === null ? {} : { generalization }),
  };
}

async function createRelationshipProfile(
  context: OperationTestContext, profileOf: string, domain: string, range: string,
): Promise<string> {
  const result = await run(context, cmeOperations.createProfileRelationship.create(context.createContext, {
    profileModel: context.semanticModel.getId(),
    profileOf: [profileOf],
    iri: null,
    name: null,
    nameSource: profileOf,
    description: null,
    descriptionSource: profileOf,
    usageNote: null,
    usageNoteSource: null,
    domain,
    domainCardinality: null,
    range,
    rangeCardinality: null,
    externalDocumentationUrl: null,
    mandatoryLevel: null,
    order: null,
  }));
  return result.created;
}

function parentsOf(context: OperationTestContext, child: string): string[] {
  return Object.values(context.semanticModel.getEntities())
    .filter(isSemanticModelGeneralization)
    .filter(item => item.child === child)
    .map(item => item.parent);
}
