import { DialogApiContextType } from "@/dialog/dialog-service";
import { createPerformLayoutDialog, createPerformLayoutDialogState } from "@/dialog/layout/create-perform-layout-dialog";
import { PerformLayoutDialogState } from "@/dialog/layout/perform-layout-controller";
import { layoutActiveVisualModelAction } from "./layout-visual-model";
import { getDefaultUserGivenAlgorithmConfigurationsFull } from "@dataspecer/layout";
import { ClassesContextType } from "@/context/classes-context";
import { UseNotificationServiceWriterType } from "@/notification/notification-service-context";
import { UseDiagramType } from "@/diagram/diagram-hook";
import { ModelGraphContextType } from "@/context/model-context";
import { WritableVisualModel } from "@dataspecer/core-v2/visual-model";
import { LayoutConfigurationContextType } from "@/context/layout-configuration-context";

/**
 * Open and handle create class dialog.
 */
export function openLayoutVisualModelDialogAction(
  notifications: UseNotificationServiceWriterType,
  dialogs: DialogApiContextType,
  classes: ClassesContextType,
  diagram: UseDiagramType,
  graph: ModelGraphContextType,
  layoutConfigurationContext: LayoutConfigurationContextType,
  visualModel: WritableVisualModel,
) {
  const onConfirm = (state: PerformLayoutDialogState) => {
    layoutConfigurationContext.setLayoutConfiguration(previousConfiguration => {
      const newConfiguration = { ...previousConfiguration };
      newConfiguration.chosenMainAlgorithm = state.chosenAlgorithm;
      newConfiguration.main = state.configurations;
      layoutActiveVisualModelAction(notifications, classes, diagram, graph, visualModel, newConfiguration);
      return newConfiguration
    });
  }

  const state = createPerformLayoutDialogState(
    layoutConfigurationContext.layoutConfiguration.chosenMainAlgorithm,
    layoutConfigurationContext.layoutConfiguration.main);
  dialogs?.openDialog(createPerformLayoutDialog(state, onConfirm));
}
