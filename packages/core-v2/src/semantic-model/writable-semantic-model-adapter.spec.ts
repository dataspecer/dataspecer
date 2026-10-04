import { describe, expect, test } from "vitest";
import { serializationToSemanticModelEntities } from "./writable-semantic-model-adapter.ts";
import { CONTROLLED_VOCABULARY_ASSIGNMENT } from "./profile/concepts/index.ts";

function assignment(id: string, qualifier: string) {
  return {
    id,
    type: [CONTROLLED_VOCABULARY_ASSIGNMENT],
    classProfile: "profile",
    vocabulary: "vocabulary",
    qualifier,
    replaces: null,
    iri: null,
  };
}

describe("serializationToSemanticModelEntities", () => {

  test("Reads legacy uppercase qualifiers of assignments as the current ones.", () => {
    const entities = serializationToSemanticModelEntities({
      modelId: "model",
      entities: {
        a: assignment("a", "MUST"),
        b: assignment("b", "AT_LEAST_1"),
        c: assignment("c", "RECOMMENDED"),
        d: assignment("d", "MAY"),
      },
    }) as Record<string, any>;

    expect(entities["a"].qualifier).toBe("must");
    expect(entities["b"].qualifier).toBe("at-least-one");
    expect(entities["c"].qualifier).toBe("recommended");
    expect(entities["d"].qualifier).toBe("may");
    // Everything else about the entity stays.
    expect(entities["a"]).toStrictEqual({ ...assignment("a", "must") });
  });

  test("Keeps current qualifiers and other entities as they are.", () => {
    const other = { id: "other", type: ["class-profile"], qualifier: "MUST" };
    const current = assignment("current", "must");
    const entities = serializationToSemanticModelEntities({
      modelId: "model",
      entities: { current, other },
    });

    expect(entities["current"]).toBe(current);
    // Not an assignment, so it is not touched.
    expect(entities["other"]).toBe(other);
  });

  test("Works for a model without entities.", () => {
    const entities = serializationToSemanticModelEntities({ modelId: "model" });

    expect(Object.keys(entities)).toStrictEqual(["model"]);
  });

});
