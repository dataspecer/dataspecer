import { generateOperationId, type Operation } from "../../operation/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

export class DataPsmSetRecommendedControlledVocabularyUsage implements Operation {
  static readonly TYPE = PSM.SET_RECOMMENDED_CONTROLLED_VOCABULARY_USAGE;

  id: string;

  type: string;

  entityId: string | null = null;

  /**
   * Whether data must contain a value from the recommended controlled vocabulary.
   * If set to null, the default value of the data specification is used.
   */
  requireRecommendedControlledVocabularyValue: boolean | null = null;

  /**
   * Whether data must not contain values from outside of the recommended controlled vocabulary.
   * If set to null, the default value of the data specification is used.
   */
  restrictToRecommendedControlledVocabulary: boolean | null = null;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmSetRecommendedControlledVocabularyUsage.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmSetRecommendedControlledVocabularyUsage {
    return operation?.type === DataPsmSetRecommendedControlledVocabularyUsage.TYPE;
  }
}
