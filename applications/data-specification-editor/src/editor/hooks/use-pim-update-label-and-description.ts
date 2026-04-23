import {useDialog} from "./use-dialog";
import {LabelDescriptionEditor} from "../components/helper/LabelDescriptionEditor";
import {useCallback} from "react";
import {SetPimLabelAndDescription} from "../operations/set-pim-label-and-description";
import {useFederatedObservableStore} from "@dataspecer/federated-observable-store-react/store";
import { NamedThing, SemanticModelEntity } from "@dataspecer/core-v2/semantic-model/concepts";

export const usePimUpdateLabelAndDescription = (pimResource: SemanticModelEntity & NamedThing) => {
  const store = useFederatedObservableStore();
  const updateLabels = useDialog(LabelDescriptionEditor, ["data", "update"], {data: {label: {}, description: {}}, update: () => {}});
  const open = useCallback(() => {
    updateLabels.open({
      data: {
        label: pimResource.name ?? {},
        description: pimResource.description ?? {},
      },
      update: data => {
        store.executeComplexOperation(new SetPimLabelAndDescription(pimResource.iri as string, data.label, data.description));
      },
    });
  }, [pimResource.name, pimResource.description]);

  return {
    Component: updateLabels.Component,
    open,
  }
};
