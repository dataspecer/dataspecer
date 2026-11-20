import { describe, expect, test } from "vitest";
import {
  ControlledVocabularyAssignment,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";

import { cmeOperations } from "../../operations";
import {
  createClass,
  createClassProfile,
  createOperationTestContext,
  run,
} from "../operation-test-utilities";

describe("updateControlledVocabularyAssignments", () => {

  test("Assignments are created, modified, removed and kept.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const profile = await createClassProfile(context, a);
    const update = (
      previous: Parameters<typeof cmeOperations.updateControlledVocabularyAssignments.create>[1]["previous"],
      next: typeof previous,
    ) => run(context, cmeOperations.updateControlledVocabularyAssignments.create(context.createContext, {
      profileModel: context.semanticModel.getId(),
      entity: profile,
      previous,
      next,
    }));
    const own = (assignment: string | null, vocabulary: string, qualifier: "must" | "may") =>
      ({ assignment, vocabulary, qualifier, replaces: null });
    // Start with three assignments.
    const initial = await update([], [
      own(null, "kept", "must"), own(null, "modified", "must"), own(null, "removed", "must")]);
    const [kept, modified, removed] = initial.created;

    const result = await update(
      [own(kept, "kept", "must"), own(modified, "modified", "must"), own(removed, "removed", "must")],
      [own(kept, "kept", "must"), own(modified, "modified", "may"), own(null, "added", "may")]);

    const entities = context.semanticModel.getEntities();
    const assignment = (identifier: string) => entities[identifier] as ControlledVocabularyAssignment;
    expect(result.removed).toEqual([removed]);
    expect(result.created).toHaveLength(1);
    expect(entities[removed]).toBeUndefined();
    expect(assignment(kept)).toMatchObject({ vocabulary: "kept", qualifier: "must", classProfile: profile });
    expect(assignment(modified)).toMatchObject({ vocabulary: "modified", qualifier: "may" });
    expect(assignment(result.created[0])).toMatchObject({ vocabulary: "added", qualifier: "may" });
  });

});
