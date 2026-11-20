import { describe, expect, test } from "vitest";
import {
  isSemanticModelGeneralization,
} from "@dataspecer/core-v2/semantic-model/concepts";

import { cmeOperations } from "../../operations";
import {
  createClass,
  createOperationTestContext,
  run,
} from "../operation-test-utilities";

describe("updateSpecialization", () => {

  test("Update specialization creates and removes generalizations.", async () => {
    const context = createOperationTestContext();
    const child = await createClass(context, "child");
    const first = await createClass(context, "first");
    const second = await createClass(context, "second");

    const created = await run(context, cmeOperations.updateSpecialization.create(context.createContext, {
      entity: child,
      model: context.semanticModel.getId(),
      previous: [],
      next: [
        { iri: null, specializationOf: first, generalization: null },
        { iri: null, specializationOf: second, generalization: null },
      ],
    }));
    expect(created.created.length).toBe(2);
    expect(created.removed.length).toBe(0);

    const firstGeneralization = created.created[0];
    const removed = await run(context, cmeOperations.updateSpecialization.create(context.createContext, {
      entity: child,
      model: context.semanticModel.getId(),
      previous: created.created.map(item => ({
        iri: null,
        specializationOf: item.parent,
        generalization: { identifier: item.identifier, model: item.model },
      })),
      next: [{
        iri: null,
        specializationOf: first,
        generalization: {
          identifier: firstGeneralization.identifier,
          model: firstGeneralization.model,
        },
      }],
    }));
    expect(removed.created.length).toBe(0);
    expect(removed.removed.length).toBe(1);

    const generalizations = Object.values(context.semanticModel.getEntities())
      .filter(isSemanticModelGeneralization);
    expect(generalizations.length).toBe(1);
    expect(generalizations[0].parent).toBe(first);
  });

});
