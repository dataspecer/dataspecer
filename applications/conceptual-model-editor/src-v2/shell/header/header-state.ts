import { ModelIdentifier } from "@dataspecer/core/model";
import { CmePackageEvent } from "../../features/package-model";
import { Language } from "../../infrastructure/i18n";
import { LanguageString } from "../../shared/types";

export interface HeaderState {

  /**
   * Current language.
   */
  language: Language;

  /**
   * Current package label.
   */
  packageLabel: LanguageString;

  visualModels: VisualModel[];

}

interface VisualModel {

  id: ModelIdentifier;

  label: LanguageString;

}

export function createEmptyHeaderState(): HeaderState {
  return {
    language: "en",
    packageLabel: {},
    visualModels: [],
  }
}

/**
 * Given previous state and change return a new state.
 */
export function updateHeaderStateWithCmePackage(
  previous: HeaderState, change: CmePackageEvent,
): HeaderState {
  return {
    ...previous,
    packageLabel: change.package.label,
    visualModels: change.visualModels.map(item => ({
      id: item.id,
      label: item.label,
    }))
  };
}
