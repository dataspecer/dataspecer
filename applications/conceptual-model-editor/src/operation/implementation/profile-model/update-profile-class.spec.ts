import { describe, expect, test } from "vitest";
import { SemanticModelClassProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";

import { cmeOperations } from "../../operations";
import {
  createClass,
  createClassProfile,
  createOperationTestContext,
  run,
} from "../operation-test-utilities";

describe("updateProfileClass", () => {

  test("All values are replaced.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const b = await createClass(context, "b");
    const profile = await createClassProfile(context, a);

    await run(context, cmeOperations.updateProfileClass.create(context.createContext, {
      profileModel: context.semanticModel.getId(),
      entity: profile,
      profileOf: [b],
      iri: "http://example.com/next",
      name: { en: "Own name" },
      nameSource: null,
      description: null,
      descriptionSource: b,
      usageNote: null,
      usageNoteSource: null,
      externalDocumentationUrl: "http://example.com/doc",
      tags: ["role"],
      order: "3",
    }));

    const entity = context.semanticModel.getEntities()[profile] as SemanticModelClassProfile;
    expect(entity).toMatchObject({
      profiling: [b],
      iri: "http://example.com/next",
      name: { en: "Own name" },
      nameFromProfiled: null,
      descriptionFromProfiled: b,
      externalDocumentationUrl: "http://example.com/doc",
      tags: ["role"],
      order: "3",
    });
  });

});
