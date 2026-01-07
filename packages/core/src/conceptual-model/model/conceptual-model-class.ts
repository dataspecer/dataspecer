import { ConceptualModelProperty } from "./conceptual-model-property.ts";
import { LanguageString } from "../../core/index.ts";

export class ConceptualModelClass {
  pimIri: string | null = null;

  /**
   * @deprecated use {@link iris} instead
   */
  cimIri: string | null = null;

  iris: string[] = [];

  humanLabel: LanguageString | null = null;

  humanDescription: LanguageString | null = null;

  humanUsageNote: LanguageString | null = null;

  isCodelist = false;

  codelistUrl: string[] = [];

  extends: ConceptualModelClass[] = [];

  properties: ConceptualModelProperty[] = [];

  regex: string | null = null;

  example: unknown[] | null = null;

  objectExample: unknown[] | null = null;

  static getAllExtends(cls: ConceptualModelClass): ConceptualModelClass[] {
    const result = new Set<ConceptualModelClass>();
    const queue = [...cls.extends];
    while (queue.length > 0) {
      const current = queue.pop()!;
      if (!result.has(current)) {
        result.add(current);
        queue.push(...current.extends);
      }
    }
    return [...result];
  }
}
