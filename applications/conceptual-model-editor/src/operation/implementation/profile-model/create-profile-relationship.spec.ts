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

describe("createProfileRelationship", () => {

  test("Profile information and mandatory level are on the range end.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const b = await createClass(context, "b");
    const ab = await createRelationship(context, a, b, "a-b");
    const profileA = await createClassProfile(context, a);
    const profileB = await createClassProfile(context, b);

    const result = await run(context, cmeOperations.createProfileRelationship.create(context.createContext, {
      profileModel: context.semanticModel.getId(),
      profileOf: [ab],
      iri: "http://example.com/a-b-profile",
      name: null,
      nameSource: ab,
      description: null,
      descriptionSource: ab,
      usageNote: null,
      usageNoteSource: null,
      domain: profileA,
      domainCardinality: null,
      range: profileB,
      rangeCardinality: [1, 1],
      externalDocumentationUrl: "",
      mandatoryLevel: "mandatory",
      order: null,
    }));

    expect(result.created).toBe(result.args.identifier);
    const entity = context.semanticModel.getEntities()[result.created] as SemanticModelRelationshipProfile;
    const [domain, range] = entity.ends;
    expect(domain).toMatchObject({ concept: profileA, profiling: [], tags: [] });
    expect(range).toMatchObject({
      concept: profileB,
      cardinality: [1, 1],
      profiling: [ab],
      iri: "http://example.com/a-b-profile",
      nameFromProfiled: ab,
      tags: ["mandatory"],
      // Empty documentation URL is stored as null.
      externalDocumentationUrl: null,
    });
  });

});
