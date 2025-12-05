import { test, describe, expect } from "vitest";

import {
  createDefaultProfileModelBuilder,
  createWritableInMemoryProfileModel,
} from "@dataspecer/profile-model";
import {
  createDefaultSemanticModelBuilder,
  SemanticModelGeneralization,
} from "@dataspecer/semantic-model";
import {
  createDefaultProfilesExecutor,
} from "./profile-entities";

describe("profileModelExecutor", () => {

  test("Default implementation test.", async () => {
    const semanticModel = createDefaultSemanticModelBuilder({
      baseIdentifier: "semantic-",
      baseIri: "http://semantic/"
    });
    const human = semanticModel.class({ id: "human" });
    const think = semanticModel.class({ id: "think" });
    const own = human.property({ id: "own", range: think });
    const profileModel = createDefaultProfileModelBuilder({
      baseIdentifier: "profile-",
      baseIri: "http://profile/"
    });
    const citizen = profileModel.class({ id: "citizen" }).profile(human);
    //
    const targetModel = createWritableInMemoryProfileModel({
      identifier: "output-",
      baseIri: "http://output/"
    });
    //
    const result = await createDefaultProfilesExecutor({
      semanticModels: [semanticModel.build()],
      profileModels: [profileModel.build(), targetModel],
      visualModels: [],
    }, {
      type: "profile-entities-operation",
      entities: [
        human.identifier, think.identifier, own.identifier,
        citizen.identifier,
      ],
      profileModel: targetModel.getId(),
    });
    // We just check the numbers here.
    expect(result.classProfiles.length).toBe(3);
    expect(result.relationshipProfiles.length).toBe(1);
    expect(result.generalizationProfiles.length).toBe(0);
  });

  test("Issue #1354", async () => {
    const semanticModel = createDefaultSemanticModelBuilder({
      baseIdentifier: "semantic-",
      baseIri: "http://semantic/"
    });
    const human = semanticModel.class({ id: "human" });
    const person = semanticModel.class({ id: "person" });
    const personIsHuman = person.specializationOf({ parent: human });
    //
    const targetModel = createWritableInMemoryProfileModel({
      identifier: "output-",
      baseIri: "http://output/"
    });
    //
    const result = await createDefaultProfilesExecutor({
      semanticModels: [semanticModel.build()],
      profileModels: [targetModel],
      visualModels: [],
    }, {
      type: "profile-entities-operation",
      entities: [human.identifier, person.identifier, personIsHuman.identifier],
      profileModel: targetModel.getId(),
    });
    // We just check the numbers here.
    expect(result.classProfiles.length).toBe(2);
    expect(result.generalizationProfiles.length).toBe(1);
    // And not the generalization must have different ends.
    const entity = targetModel.getEntities()[result.generalizationProfiles[0]];
    expect(entity).toBeDefined();
    const generalization = entity as SemanticModelGeneralization;
    expect(generalization.child).not.toBe(generalization.parent);
  });

});
