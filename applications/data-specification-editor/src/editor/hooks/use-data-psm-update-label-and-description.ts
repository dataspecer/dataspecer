import {DataPsmResource} from "@dataspecer/core/data-psm/model";
import {useDialog} from "./use-dialog";
import {LabelDescriptionEditor} from "../components/helper/LabelDescriptionEditor";
import {useCallback, useContext} from "react";
import {SetDataPsmLabelAndDescription} from "../operations/set-data-psm-label-and-description";
import {useFederatedObservableStore} from "@dataspecer/federated-observable-store-react/store";

export const useDataPsmUpdateLabelAndDescription = (dataPsmResource: DataPsmResource) => {
  const store = useFederatedObservableStore();
  const updateLabels = useDialog(LabelDescriptionEditor, ["data", "update"], {data: {label: {}, description: {}}, update: () => {}});
  const open = useCallback(() => {
    updateLabels.open({
      data: {
        label: dataPsmResource.dataPsmHumanLabel ?? {},
        description: dataPsmResource.dataPsmHumanDescription ?? {},
      },
      update: data => {
        store.executeComplexOperation(new SetDataPsmLabelAndDescription(dataPsmResource.iri as string, data.label, data.description));
      },
    });
  }, [dataPsmResource.dataPsmHumanLabel, dataPsmResource.dataPsmHumanDescription]);

  return {
    Component: updateLabels.Component,
    open,
  }
};
