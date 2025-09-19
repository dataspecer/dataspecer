import { DialogApiContextType } from "@/dialog/dialog-service";
import {
  createPerformLayoutDialog,
  createPerformLayoutDialogState,
} from "@/dialog/layout/create-perform-layout-dialog";
import { PerformLayoutDialogState } from "@/dialog/layout/perform-layout-controller";
import { layoutActiveVisualModelAction } from "./layout-visual-model";
import { ClassesContextType } from "@/context/classes-context";
import { UseNotificationServiceWriterType } from "@/notification/notification-service-context";
import { UseDiagramType } from "@/diagram/diagram-hook";
import { ModelGraphContextType } from "@/context/model-context";
import { WritableVisualModel } from "@dataspecer/visual-model";
import { LayoutConfigurationContextType } from "@/context/layout-configuration-context";

/**
 * Open layout visual model dialog. On confirm the visual model is layouted.
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
    const newConfiguration = { ...layoutConfigurationContext.layoutConfiguration };
    newConfiguration.chosenMainAlgorithm = state.chosenAlgorithm;
    newConfiguration.main = state.configurations;
    layoutActiveVisualModelAction(notifications, classes, diagram, graph, visualModel, newConfiguration);
    layoutConfigurationContext.setLayoutConfiguration(newConfiguration);
  }

  const state = createPerformLayoutDialogState(
    layoutConfigurationContext.layoutConfiguration.chosenMainAlgorithm,
    layoutConfigurationContext.layoutConfiguration.main);
  dialogs?.openDialog(createPerformLayoutDialog(state, onConfirm));
}
