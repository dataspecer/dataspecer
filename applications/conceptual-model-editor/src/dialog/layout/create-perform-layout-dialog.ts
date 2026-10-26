import { DialogWrapper } from "../../dialog/dialog-api";
import { PerformLayoutDialogState } from "./perform-layout-controller";
import {
  AlgorithmName,
  getDefaultUserGivenAlgorithmConfigurationsFull,
  UserGivenAlgorithmConfigurationsMap,
} from "@dataspecer/layout";
import { PerformLayoutDialog } from "./perform-layout-dialog";

export function createPerformLayoutDialogState(
  chosenAlgorithm: AlgorithmName,
  configurations: UserGivenAlgorithmConfigurationsMap | null,
): PerformLayoutDialogState {
  return {
    chosenAlgorithm: chosenAlgorithm ?? "elk_stress_advanced_using_clusters",
    configurations: configurations ?? getDefaultUserGivenAlgorithmConfigurationsFull().main,
  };
}

export const createPerformLayoutDialog = (
  state: PerformLayoutDialogState,
  onConfirm: ((state: PerformLayoutDialogState) => void) | null,
): DialogWrapper<PerformLayoutDialogState> => {
  return {
    label: "dialog.layout-visual-model.label-perform",
    component: PerformLayoutDialog,
    state,
    confirmLabel: "dialog.layout-visual-model.ok-perform",
    cancelLabel: "dialog.layout-visual-model.cancel",
    validate: () => true,
    onConfirm,
    onClose: null,
    dialogClassNames: "m-auto base-dialog z-30 flex flex-col min-h-[50%] w-[97%] p-1 xl:w-[50%] md:max-h-[95%] md:p-8"
  };
};
