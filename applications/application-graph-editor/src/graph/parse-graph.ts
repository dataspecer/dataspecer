import { validateGraphSyntax, type ApplicationGraph } from '@dataspecer/app-generator/graph';
import { errorMessage } from '@/utils/error-message.ts';
import { countNoun } from '@/utils/count-noun.ts';

export type GraphCheckResult = { graph: ApplicationGraph } | { error: string };

/**
 * Checks that already parsed JSON is a syntactically valid graph. Every way a graph enters the
 * editor (stored blob, import, JSON panel) goes through this gate. Structural and semantic
 * violations are allowed through, because the problems panel reports them.
 */
export function checkGraph(data: unknown): GraphCheckResult {
  const syntax = validateGraphSyntax(data);
  if (!syntax.valid || !syntax.graph) {
    const first = syntax.violations[0];
    return {
      error:
        `Not a valid application graph ` +
        `(${countNoun(syntax.violations.length, 'syntax violation')}, first: ${first.message})`,
    };
  }
  return { graph: syntax.graph };
}

/** Parses graph JSON from an import or the JSON panel. */
export function parseGraph(text: string): GraphCheckResult {
  try {
    return checkGraph(JSON.parse(text));
  } catch (caught) {
    return {
      error: `Not valid JSON: ${errorMessage(caught)}`,
    };
  }
}
