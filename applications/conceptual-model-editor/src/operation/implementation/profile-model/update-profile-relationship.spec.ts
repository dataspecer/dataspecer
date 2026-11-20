import { describe, expect, test } from "vitest";
import {
  SemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";

import { cmeOperations } from "../../operations";
import {
  createClass,
  createClassProfile,
  createOperationTestContext,
  createRelationship,
  run,
} from "../operation-test-utilities";

describe("updateProfileRelationship", () => {

  test("Ends and mandatory level are replaced.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const b = await createClass(context, "b");
    const ab = await createRelationship(context, a, b, "a-b");
    const profileA = await createClassProfile(context, a);
    const profileB = await createClassProfile(context, b);
    const values = {
      profileModel: context.semanticModel.getId(),
      profileOf: [ab],
      iri: null,
      name: null,
      nameSource: ab,
      description: null,
      descriptionSource: ab,
      usageNote: null,
      usageNoteSource: null,
      domain: profileA,
      domainCardinality: null,
      range: profileB,
      rangeCardinality: null,
      externalDocumentationUrl: null,
      mandatoryLevel: "mandatory",
      order: null,
    };
    const created = await run(context, cmeOperations.createProfileRelationship.create(
      context.createContext, values));

    await run(context, cmeOperations.updateProfileRelationship.create(context.createContext, {
      ...values,
      entity: created.created,
      range: profileA,
      rangeCardinality: [0, 1],
      mandatoryLevel: null,
    }));

    const entity = context.semanticModel.getEntities()[created.created] as SemanticModelRelationshipProfile;
    expect(entity.ends[1]).toMatchObject({
      concept: profileA,
      cardinality: [0, 1],
      tags: [],
    });
  });

});
