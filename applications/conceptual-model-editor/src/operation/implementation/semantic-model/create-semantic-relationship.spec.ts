import { describe, expect, test } from "vitest";
import { SemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";

import { cmeOperations } from "../../operations";
import {
  createClass,
  createOperationTestContext,
  run,
} from "../operation-test-utilities";

describe("createSemanticRelationship", () => {

  test("Relationship is created with domain, range and cardinalities.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const b = await createClass(context, "b");

    const result = await run(context, cmeOperations.createSemanticRelationship.create(context.createContext, {
      semanticModel: context.semanticModel.getId(),
      iri: "http://example.com/a-b",
      name: { en: "a to b" },
      description: null,
      domain: a,
      domainCardinality: [0, 1],
      range: b,
      rangeCardinality: [1, null],
      externalDocumentationUrl: null,
      order: null,
    }));

    expect(result.created).toBe(result.args.identifier);
    const entity = context.semanticModel.getEntities()[result.created] as SemanticModelRelationship;
    const [domain, range] = entity.ends;
    expect(domain).toMatchObject({ concept: a, cardinality: [0, 1] });
    // The name and IRI are stored on the range end.
    expect(range).toMatchObject({
      concept: b,
      cardinality: [1, null],
      iri: "http://example.com/a-b",
      name: { en: "a to b" },
    });
  });

});
