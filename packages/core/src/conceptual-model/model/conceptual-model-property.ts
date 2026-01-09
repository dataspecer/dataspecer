import { ConceptualModelType } from "./conceptual-model-type.ts";
import { LanguageString } from "../../core/index.ts";

export class ConceptualModelProperty {
  pimIri: string | null = null;

  /**
   * @deprecated use {@link iris} instead
   */
  cimIri: string | null = null;

  iris: string[] = [];

  humanLabel: LanguageString | null = null;

  humanDescription: LanguageString | null = null;

  humanUsageNote: LanguageString | null = null;

  cardinalityMin: number | null = null;

  cardinalityMax: number | null = null;

  dataTypes: ConceptualModelType[] = [];

  /**
   * Whether the given property represent association that is oriented and
   * points in other direction.
   */
  isReverse: boolean | null = null;
}
