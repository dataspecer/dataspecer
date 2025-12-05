import React, {memo, useCallback, useMemo} from "react";
import {useResource} from "@dataspecer/federated-observable-store-react/use-resource";
import {DataPsmOr} from "@dataspecer/core/data-psm/model";
import {Collapse} from "@mui/material";
import {TransitionGroup} from "react-transition-group";
import {DataPsmObjectType, ORContext} from "../data-psm-row";
import {DataPsmDeleteButton} from "../class/DataPsmDeleteButton";
import {useFederatedObservableStore} from "@dataspecer/federated-observable-store-react/store";
import {DeleteChoice} from "../../../operations/delete-choice";
import { ReplaceClassWithReference } from "../references/replace-class-with-referemce";

/**
 * Renders OR choices as a subtree and adds delete operation for each choice.
 *
 * (This component only renders OR as is, not inheritance OR)
 */
export const DataPsmOrSubtree: React.FC<{iri: string, isOpen: boolean}> = memo(({iri, isOpen}) => {
  const {resource} = useResource<DataPsmOr>(iri);

  const context = useMemo(() => ({
    contextType: "or",
    parentDataPsmOrIri: iri,
  } as ORContext), [iri]);

  const store = useFederatedObservableStore();

  const deleteChoice = useCallback((partIri: string) =>
    store.executeComplexOperation(new DeleteChoice(iri, partIri)), [store, iri]);

  return <Collapse in={isOpen} unmountOnExit>
    <ul>
      {resource &&
      <TransitionGroup exit={false}>
        {resource.dataPsmChoices.map(choiceIri => <Collapse key={choiceIri}>
          <DataPsmObjectType iri={choiceIri} {...context} menu={[
            <DataPsmDeleteButton onClick={() => deleteChoice(choiceIri)} />,
            <ReplaceClassWithReference structuralClassId={choiceIri} owningStructuralEntityId={iri} />
          ]} />
        </Collapse>)}
      </TransitionGroup>
      }
    </ul>
  </Collapse>;
});
