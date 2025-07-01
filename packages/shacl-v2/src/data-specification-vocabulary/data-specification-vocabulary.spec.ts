import { describe, test, expect } from "vitest";
import { createDefaultSemanticModelBuilder } from "../semantic-model/index.ts";
import { createDefaultProfileModelBuilder } from "../profile-model/profile-model-builder.ts";
import { createContext, entityListContainerToConceptualModel, isObjectPropertyProfile, ObjectPropertyProfile } from "@dataspecer/data-specification-vocabulary";

describe("entityListContainerToConceptualModel", () => {

  test("Conversion test I.", () => {
    const vocabulary = createDefaultSemanticModelBuilder(
      "http://example.com/vocabulary#");
    const object = vocabulary.class({ iri: "object" });
    const human = vocabulary.class({ iri: "human" });
    const has = human.property({
      iri: "has",
      name: { "en": "has" },
      range: object,
    });

    const profile = createDefaultProfileModelBuilder(
      "http://example.com/profile#");
    const objectProfile = profile.class({ iri: "object" })
      .reuseName(object);
    const humanProfile = profile.class({ iri: "human" })
      .reuseName(human);
    profile.property({ iri: "has" })
      .reuseName(has)
      .domain(humanProfile)
      .range(objectProfile);

    const context = createContext([{
      baseIri: "",
      entities: Object.values(vocabulary.build().getEntities()),
    }, {
      baseIri: "",
      entities: Object.values(profile.build().getEntities()),
    }]);

    const actual = entityListContainerToConceptualModel("", {
      baseIri: "",
      entities: Object.values(profile.build().getEntities()),
    }, context);

    // There should be two profiles.
    expect(actual.profiles.length)
      .toBe(2);

    const property = actual.profiles[1]?.properties[0] as ObjectPropertyProfile;
    expect(isObjectPropertyProfile(property))
      .toBeTruthy();

    expect(property.rangeClassIri[0])
      .toStrictEqual("http://example.com/profile#object");
  });

});
