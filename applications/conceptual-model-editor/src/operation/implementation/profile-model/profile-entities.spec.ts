import { describe, expect, test } from "vitest";
import {
  isSemanticModelClassProfile,
  isSemanticModelRelationshipProfile,
  SemanticModelClassProfile,
  SemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";

import { cmeOperations } from "../../operations";
import {
  addSemanticModel,
  createClass,
  createOperationTestContext,
  createRelationship,
  run,
} from "../operation-test-utilities";

describe("profileEntities", () => {

  // Known bug: the executor collects entities from both semanticModels and
  // profileModels, which the executor builds from the same models,
  // so every entity is profiled twice.
  // Remove "fails" once profile-entities.ts is fixed.
  test.fails("Classes and relationships get one profile each.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const b = await createClass(context, "b");
    const ab = await createRelationship(context, a, b, "a-b");
    const profileModel = addSemanticModel(context);

    const result = await run(context, cmeOperations.profileEntities.create(context.createContext, {
      entities: [a, b, ab],
      profileModel: profileModel.getId(),
    }));

    const entities = Object.values(profileModel.getEntities());
    const classProfiles = entities.filter(isSemanticModelClassProfile);
    const relationshipProfiles = entities.filter(isSemanticModelRelationshipProfile);
    expect(classProfiles).toHaveLength(2);
    expect(relationshipProfiles).toHaveLength(1);
    expect(result.classProfiles.sort()).toEqual(classProfiles.map(item => item.id).sort());
    expect(result.relationshipProfiles).toEqual([relationshipProfiles[0].id]);
  });

  test("Relationship profile connects the created class profiles.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const b = await createClass(context, "b");
    const ab = await createRelationship(context, a, b, "a-b");
    const profileModel = addSemanticModel(context);

    const result = await run(context, cmeOperations.profileEntities.create(context.createContext, {
      entities: [a, b, ab],
      profileModel: profileModel.getId(),
    }));

    const entities = profileModel.getEntities();
    const profileOf = (identifier: string) =>
      (entities[identifier] as SemanticModelClassProfile).profiling[0];
    const relationship = entities[result.relationshipProfiles[0]] as SemanticModelRelationshipProfile;
    expect(relationship.ends[1].profiling).toEqual([ab]);
    expect(profileOf(relationship.ends[0].concept)).toBe(a);
    expect(profileOf(relationship.ends[1].concept)).toBe(b);
  });

});
