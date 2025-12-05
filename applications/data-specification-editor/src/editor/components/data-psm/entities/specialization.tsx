import {Span, sxStyles} from "../styles";
import {DataPsmClassItem} from "./class";
import React, {memo, useCallback} from "react";
import {InheritanceOrTree} from "../common/use-inheritance-or";
import {RowSlots} from "../base-row";
import {useFederatedObservableStore} from "@dataspecer/federated-observable-store-react/store";
import {DeleteInheritanceOrSpecialization} from "../../../operations/delete-inheritance-or-specialization";
import {DataPsmDeleteButton} from "../class/DataPsmDeleteButton";
import {ObjectContext, ORContext} from "../data-psm-row";
import { ReplaceClassWithReference } from "../references/replace-class-with-referemce";

/**
 * Represents an object type PSM entity in OR under the inheritance view.
 */
export const DataPsmSpecializationItem: React.FC<{iri: string, inheritanceOrTree: InheritanceOrTree } & RowSlots & ObjectContext> = memo((props) => {
  const store = useFederatedObservableStore();

  const thisStartRow = <>
    <Span sx={sxStyles.or}>specialization</Span>
    {" "}
  </>;

  const startRow = props.startRow ? [thisStartRow, ...props.startRow] : [thisStartRow];

  const deleteSpecialization = useCallback(() => {
    store.executeComplexOperation(new DeleteInheritanceOrSpecialization((props as ORContext).parentDataPsmOrIri, props.iri))
  }, [store, props]);

  const thisMenu = <>
    <DataPsmDeleteButton onClick={deleteSpecialization} />
    <ReplaceClassWithReference structuralClassId={props.iri} owningStructuralEntityId={(props as ORContext).parentDataPsmOrIri} />
  </>;

  const menu = props.menu ? [thisMenu, ...props.menu] : [thisMenu];

  return <DataPsmClassItem
    {...props}
    startRow={startRow}
    menu={menu}
  />;
});
