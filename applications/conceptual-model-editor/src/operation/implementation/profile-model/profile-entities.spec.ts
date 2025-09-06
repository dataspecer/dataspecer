import { test, describe, expect } from "vitest";

import {
  createDefaultProfileModelBuilder,
  createWritableInMemoryProfileModel,
} from "@dataspecer/profile-model";
import {
  createDefaultSemanticModelBuilder,
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

});
