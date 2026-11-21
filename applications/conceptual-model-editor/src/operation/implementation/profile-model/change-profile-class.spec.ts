import { describe, expect, test } from "vitest";
import { SemanticModelClassProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";

import { cmeOperations } from "../../operations";
import {
  createClass,
  createClassProfile,
  createOperationTestContext,
  run,
} from "../operation-test-utilities";

describe("changeProfileClass", () => {

  test("Only the given properties change.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const b = await createClass(context, "b");
    const profile = await createClassProfile(context, a);
    const before = context.semanticModel.getEntities()[profile] as SemanticModelClassProfile;

    // Append to profile of, as in open-create-connection.ts.
    await run(context, cmeOperations.changeProfileClass.create(context.createContext, {
      profileModel: context.semanticModel.getId(),
      entity: profile,
      changes: { profileOf: [a, b] },
    }));

    const after = context.semanticModel.getEntities()[profile] as SemanticModelClassProfile;
    expect(after.profiling).toEqual([a, b]);
    expect(after.nameFromProfiled).toBe(before.nameFromProfiled);
    expect(after.descriptionFromProfiled).toBe(before.descriptionFromProfiled);
    expect(after.tags).toEqual(before.tags);
  });

  test("Null clears a property.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const profile = await createClassProfile(context, a);

    await run(context, cmeOperations.changeProfileClass.create(context.createContext, {
      profileModel: context.semanticModel.getId(),
      entity: profile,
      changes: { nameSource: null, name: { en: "Own name" } },
    }));

    const after = context.semanticModel.getEntities()[profile] as SemanticModelClassProfile;
    expect(after.nameFromProfiled).toBeNull();
    expect(after.name).toEqual({ en: "Own name" });
    expect(after.profiling).toEqual([a]);
  });

});
