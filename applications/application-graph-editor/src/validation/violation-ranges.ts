import { findNodeAtLocation, parseTree, type JSONPath } from "jsonc-parser";
import type { Violation } from "@dataspecer/app-generator/graph";

export interface ViolationRange {
  start: number;
  end: number;
  message: string;
  code: string;
}

function toJsonPath(path: string): JSONPath {
  return path
    .split("/")
    .filter((segment) => segment !== "")
    .map((segment) => (/^\d+$/.test(segment) ? Number(segment) : segment));
}

/**
 * Maps violations onto text offsets in the serialized graph, so the JSON editor can underline
 * the offending parts. Violation paths use the JSON pointer format, for example
 * "/nodes/1/aggregateIri". Violations without a path or with a path the text does not contain
 * are skipped.
 */
export function violationRanges(text: string, violations: Violation[]): ViolationRange[] {
  const tree = parseTree(text);
  if (!tree) {
    return [];
  }

  return violations.flatMap((violation) => {
    if (!violation.path) {
      return [];
    }
    const node = findNodeAtLocation(tree, toJsonPath(violation.path));
    if (!node) {
      return [];
    }
    return [
      {
        start: node.offset,
        end: node.offset + node.length,
        message: violation.message,
        code: violation.code,
      },
    ];
  });
}
