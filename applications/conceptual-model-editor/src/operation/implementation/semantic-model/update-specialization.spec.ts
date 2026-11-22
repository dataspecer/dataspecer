import { describe, expect, test } from "vitest";
import {
  isSemanticModelGeneralization,
} from "@dataspecer/core-v2/semantic-model/concepts";

import { cmeOperations } from "../../operations";
import {
  createClass,
  createGeneralization,
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

  test("Created and removed generalizations are prepared before execution.", async () => {
    const context = createOperationTestContext();
    const model = context.semanticModel.getId();
    const child = await createClass(context, "child");
    const kept = await createClass(context, "kept");
    const dropped = await createClass(context, "dropped");
    const added = await createClass(context, "added");
    const keptGeneralization = await createGeneralization(context, child, kept);
    const droppedGeneralization = await createGeneralization(context, child, dropped);
    const keptSpecialization = {
      iri: null, specializationOf: kept, generalization: { identifier: keptGeneralization, model },
    };

    const args = cmeOperations.updateSpecialization.create(context.createContext, {
      entity: child,
      model,
      previous: [keptSpecialization, {
        iri: null, specializationOf: dropped, generalization: { identifier: droppedGeneralization, model },
      }],
      next: [keptSpecialization, { iri: "added-iri", specializationOf: added, generalization: null }],
    });
    const result = await run(context, args);

    expect(args.created).toEqual([{
      identifier: expect.any(String), model, iri: "added-iri", child, parent: added,
    }]);
    expect(args.removed).toEqual([{ identifier: droppedGeneralization, model }]);
    expect(result.created).toEqual(args.created);
    const entities = context.semanticModel.getEntities();
    expect(entities[args.created[0].identifier]).toMatchObject({ child, parent: added, iri: "added-iri" });
    expect(entities[droppedGeneralization]).toBeUndefined();
    expect(entities[keptGeneralization]).toBeDefined();
  });

});
