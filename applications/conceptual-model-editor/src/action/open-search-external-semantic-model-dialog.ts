import { DialogApiContextType } from "../dialog/dialog-service";
import { ModelGraphContextType } from "../context/model-context";
import {
  createSearchExternalSemanticDialog,
  createSearchExternalSemanticModelState,
  SearchExternalSemanticModelState,
} from "../dialog/external-semantic-model";
import { ModelDsIdentifier } from "../dataspecer/entity-model";
import {
  UseNotificationServiceWriterType,
} from "../notification/notification-service-context";
import { ExternalSemanticModel } from "@dataspecer/core-v2/semantic-model/simplified";
import { createLogger } from "../application";

const LOG = createLogger(import.meta.url);

export function openSearchExternalSemanticModelDialogAction(
  notifications: UseNotificationServiceWriterType,
  dialogs: DialogApiContextType,
  graph: ModelGraphContextType,
  modelIdentifier: ModelDsIdentifier,
) {
  const initialState = createSearchExternalSemanticModelState();

  const model = graph.models.get(modelIdentifier);
  if (model === undefined || !(model instanceof ExternalSemanticModel)) {
    notifications.error("Invalid model to search.");
    return;
  }

  const onConfirm = (nextState: SearchExternalSemanticModelState) => {

    model.search(nextState.search).then(async found => {
      for (const item of found) {
        // To be sgov compatible we need require items to have IRIs.
        if (item.iri === null) {
          continue;
        }
        await model.allowClass(item.iri);
      }
    }).catch(error => {
      notifications.error("Can not add all entities, see logs for more details.");
      LOG.error("Can not add entities from an external model.", { error })
    });
  };

  dialogs.openDialog(createSearchExternalSemanticDialog(initialState, onConfirm));
}
