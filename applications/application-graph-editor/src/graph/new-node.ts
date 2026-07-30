import {
  Operation,
  type ApplicationGraph,
  type ApplicationNode,
  type SpecificationMetadata,
} from "@dataspecer/app-generator/graph";
import { nextNodeId } from "./mutations.ts";


export function nodeBlockedReason(metadata: SpecificationMetadata | null): string | null {
  if (metadata === null) {
    return "The data structures are unavailable, so a new node would have nothing to point at.";
  }
  if (metadata.aggregates.length === 0) {
    return "The data specification has no data structures to build a node from.";
  }
  return null;
}

/**
 * A node the user still has to configure. When no data structure is chosen, the first one is a
 * guess that keeps the node renderable, so the forms have something to show.
 */
export function newNode(
  graph: ApplicationGraph,
  metadata: SpecificationMetadata | null,
  aggregateIri?: string,
): ApplicationNode {
  const aggregate =
    metadata?.aggregates.find((entry) => entry.iri === aggregateIri) ?? metadata?.aggregates[0];
  const operation = Operation.ReadList;
  return {
    id: nextNodeId(graph, aggregate?.name ?? "node", operation),
    aggregateIri: aggregate?.iri ?? "",
    operation,
  };
}
