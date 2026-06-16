import { LanguageString, CoreOperation } from "../../core/index.ts";
import { generateEntityId } from "../../entity-model/entity.ts";

export class DataPsmCreate extends CoreOperation {
  /**
   * IRI of the newly created object, generated up-front so that callers can
   * use it without depending on the (deprecated) return value of applyOperation.
   */
  dataPsmNewIri: string | null = generateEntityId();

  dataPsmInterpretation: string | null = null;

  dataPsmTechnicalLabel: string | null = null;

  dataPsmHumanLabel: LanguageString | null = null;

  dataPsmHumanDescription: LanguageString | null = null;

  protected constructor() {
    super();
  }
}
