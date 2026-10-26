import { describe, test, expect } from "vitest";

import { createDefaultSemanticModelBuilder } from "@dataspecer/semantic-model";
import { createDefaultProfileModelBuilder } from "@dataspecer/profile-model";

import { mergeEntityListContainers, toEntityListContainer } from "./entity-list-container-builder.ts";

describe("toEntityListContainer", () => {

  test("Converts a built SemanticModel's baseIri and entities into an EntityListContainer.", () => {
    const vocabulary = createDefaultSemanticModelBuilder({
      baseIdentifier: "v#",
      baseIri: "http://example.com/vocabulary#",
    });
    const person = vocabulary.class({ iri: "person" });

    const actual = toEntityListContainer(vocabulary.build());

    expect(actual.baseIri).toBe("http://example.com/vocabulary#");
    expect(actual.entities).toHaveLength(1);
    expect(actual.entities[0]).toMatchObject({ id: person.identifier, iri: "person" });
  });

  test("Works with a built ProfileModel too.", () => {
    const profile = createDefaultProfileModelBuilder({
      baseIdentifier: "p#",
      baseIri: "http://example.com/profile#",
    });
    profile.class({ iri: "person" });

    const actual = toEntityListContainer(profile.build());

    expect(actual.baseIri).toBe("http://example.com/profile#");
    expect(actual.entities).toHaveLength(1);
  });

});

describe("mergeEntityListContainers", () => {

  test("Concatenates entities under the first container's baseIri.", () => {
    const vocabulary = createDefaultSemanticModelBuilder({
      baseIdentifier: "v#",
      baseIri: "http://example.com/shared#",
    });
    vocabulary.class({ iri: "person" });

    const profile = createDefaultProfileModelBuilder({
      baseIdentifier: "p#",
      baseIri: "http://example.com/shared#",
    });
    profile.class({ iri: "personProfile" });

    const actual = mergeEntityListContainers(
      toEntityListContainer(vocabulary.build()),
      toEntityListContainer(profile.build()),
    );

    expect(actual.baseIri).toBe("http://example.com/shared#");
    expect(actual.entities).toHaveLength(2);
    expect(actual.entities.map(item => (item as any).iri)).toStrictEqual(["person", "personProfile"]);
  });

  test("Returns an empty container with a null baseIri when called with no arguments.", () => {
    expect(mergeEntityListContainers()).toStrictEqual({ baseIri: null, entities: [] });
  });

});
