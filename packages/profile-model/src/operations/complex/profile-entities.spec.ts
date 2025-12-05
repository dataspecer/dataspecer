import { createDefaultSemanticModelBuilder } from "@dataspecer/semantic-model";
import { describe, test } from "vitest";
import { createWritableInMemoryProfileModel, ProfileRelationship } from "../../index.ts";
import { profileEntities } from "./profile-entities.ts";

describe("profileEntities", () => {

  test("Profile vocabulary.", async () => {
    const semantic = createDefaultSemanticModelBuilder({
      baseIdentifier: "semantic",
      baseIri: "http://semantic/"
    });
    const human = semantic.class({ iri: "human" });
    const person = semantic.class({ iri: "person" });
    person.specializationOf({ parent: human });
    const animal = semantic.class({ iri: "animal" });
    person.property({ range: animal, iri: "takesCareOf" });

    const profileModel = createWritableInMemoryProfileModel({
      identifier: "profile",
      baseIri: "http://profile/",
    });

    const result = await profileEntities(
      { targetModel: profileModel },
      { entities: Object.values(semantic.build().getEntities()) },
    );

    // Check we have created the expected number of entities.
    expect(result.classes.length).toBe(3);
    expect(result.relationships.length).toBe(1);
    expect(result.generalizations.length).toBe(1);

  });

  /**
   * When we do not have information about the end, only and identifier
   * we just copy the identifier.
   */
  test("Profile a relation with missing ends representation.", async () => {
    const semantic = createDefaultSemanticModelBuilder({
      baseIdentifier: "semantic",
      baseIri: "http://semantic/"
    });

    const url = semantic.property({ iri: "url" });
    url.domain({ identifier: "url-domain" });
    url.range({ identifier: "url-range" });

    const profileModel = createWritableInMemoryProfileModel({
      identifier: "profile",
      baseIri: "http://profile/",
    });

    const result = await profileEntities(
      { targetModel: profileModel },
      { entities: Object.values(semantic.build().getEntities()) },
    );

    // Check we have created the expected number of entities.
    expect(result.classes.length).toBe(0);
    expect(result.relationships.length).toBe(1);
    expect(result.generalizations.length).toBe(0);


    const entityProfile = profileModel.getEntities()[result.relationships[0]];
    expect(entityProfile).not.toBeUndefined();

    // Check that the relation has same end.
    const urlProfile = entityProfile as ProfileRelationship;
    expect(urlProfile.ends[0].concept).toBe("url-domain");
    expect(urlProfile.ends[1].concept).toBe("url-range");


  });

});
