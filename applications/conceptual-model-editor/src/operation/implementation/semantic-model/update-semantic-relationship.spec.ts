import { describe, expect, test } from "vitest";
import { SemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";

import { cmeOperations } from "../../operations";
import {
  createClass,
  createOperationTestContext,
  createRelationship,
  run,
} from "../operation-test-utilities";

describe("updateSemanticRelationship", () => {

  test("Values, ends and cardinalities are replaced.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const b = await createClass(context, "b");
    const c = await createClass(context, "c");
    const relationship = await createRelationship(context, a, b, "a-b");

    await run(context, cmeOperations.updateSemanticRelationship.create(context.createContext, {
      semanticModel: context.semanticModel.getId(),
      entity: relationship,
      iri: "http://example.com/c-a",
      name: { en: "c to a" },
      description: null,
      domain: c,
      domainCardinality: [1, 1],
      range: a,
      rangeCardinality: [0, null],
      externalDocumentationUrl: null,
      order: null,
    }));

    const entity = context.semanticModel.getEntities()[relationship] as SemanticModelRelationship;
    const [domain, range] = entity.ends;
    expect(domain).toMatchObject({ concept: c, cardinality: [1, 1] });
    expect(range).toMatchObject({
      concept: a,
      cardinality: [0, null],
      iri: "http://example.com/c-a",
      name: { en: "c to a" },
    });
  });

});
