import {
  Operation,
  type ApplicationGraph,
  type ApplicationNode,
  type SpecificationMetadata,
} from "@dataspecer/app-generator/graph";
import { nextNodeId } from "./mutations.ts";

/**
 * A node the user still has to configure. The first aggregate is a guess that keeps the node
 * valid enough to render, so the forms have something to show.
 */
export function newNode(
  graph: ApplicationGraph,
  metadata: SpecificationMetadata | null,
): ApplicationNode {
  const aggregate = metadata?.aggregates[0];
  const operation = Operation.ReadList;
  return {
    id: nextNodeId(graph, aggregate?.name ?? "node", operation),
    aggregateIri: aggregate?.iri ?? "",
    operation,
  };
}
