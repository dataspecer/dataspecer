import { describe, expect, test } from "vitest";
import { SemanticModelClassProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";

import { cmeOperations } from "../../operations";
import {
  createClass,
  createOperationTestContext,
  run,
} from "../operation-test-utilities";

describe("createProfileClass", () => {

  test("Profile is created with the given values.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");

    const result = await run(context, cmeOperations.createProfileClass.create(context.createContext, {
      profileModel: context.semanticModel.getId(),
      profileOf: [a],
      iri: "http://example.com/profile",
      name: null,
      nameSource: a,
      description: { en: "Own description" },
      descriptionSource: null,
      usageNote: { en: "Usage" },
      usageNoteSource: null,
      externalDocumentationUrl: null,
      tags: ["role"],
      order: "2",
    }));

    expect(result.created).toBe(result.args.identifier);
    const entity = context.semanticModel.getEntities()[result.created] as SemanticModelClassProfile;
    expect(entity).toMatchObject({
      profiling: [a],
      iri: "http://example.com/profile",
      nameFromProfiled: a,
      description: { en: "Own description" },
      descriptionFromProfiled: null,
      usageNote: { en: "Usage" },
      tags: ["role"],
      order: "2",
    });
  });

});
