import {
  Operation,
  type ApplicationGraph,
  type ApplicationNode,
  type SpecificationMetadata,
} from "@dataspecer/app-generator/graph";
import { nextNodeId } from "./mutations.ts";


export function nodeBlockedReason(metadata: SpecificationMetadata | null): string | null {
  if (metadata === null) {
    return "Aggregate metadata is unavailable, so a new node would have no aggregate to point at.";
  }
  if (metadata.aggregates.length === 0) {
    return "The data specification has no aggregates to build a page from.";
  }
  return null;
}

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
