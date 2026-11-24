import { describe, expect, it } from "vitest";
import { SEMANTIC_MODEL_CLASS, type SemanticModelClass } from "@dataspecer/core-v2/semantic-model/concepts";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import { isVisualNode } from "@dataspecer/visual-model";
import { getDefaultUserGivenAlgorithmConfigurationsFull, performLayoutOfSemanticModel } from "./index.ts";

describe("concurrent semantic model layout", () => {
  it.each(["elk_stress", "elk_force"] as const)("keeps %s results in their own model", async (algorithm) => {
    const models: EntityRecord<SemanticModelClass>[] = ["first", "second", "third"].map((modelId) =>
      Object.fromEntries(["a", "b"].map((suffix) => {
        const id = `${modelId}-${suffix}`;
        return [id, {
          id,
          type: [SEMANTIC_MODEL_CLASS],
          iri: `https://example.com/${id}`,
          name: { en: id },
          description: {},
        } satisfies SemanticModelClass];
      })),
    );

    const results = await Promise.allSettled(models.map((model, index) => {
      const configuration = getDefaultUserGivenAlgorithmConfigurationsFull();
      configuration.chosenMainAlgorithm = algorithm;
      configuration.main.elk_stress.interactive = false;
      configuration.main.elk_stress.number_of_new_algorithm_runs = 1;
      configuration.main.elk_stress.run_node_overlap_removal_after = true;
      // Multiple force runs prepare before the main loop and run without preparing again.
      configuration.main.elk_force.number_of_new_algorithm_runs = 2;
      return performLayoutOfSemanticModel(model, `model-${index}`, configuration, {
        getWidth: () => 120,
        getHeight: () => 60,
      });
    }));

    for (const [index, result] of results.entries()) {
      if (result.status === "rejected") throw result.reason;
      const nodes = Object.values(result.value).map(({ visualEntity }) => visualEntity).filter(isVisualNode);
      expect(nodes.map((node) => node.representedEntity).sort()).toEqual(Object.keys(models[index]).sort());
      for (const node of nodes) {
        expect(node.model).toBe(`model-${index}`);
        expect(Number.isFinite(node.position.x)).toBe(true);
        expect(Number.isFinite(node.position.y)).toBe(true);
      }
    }
  });
});
