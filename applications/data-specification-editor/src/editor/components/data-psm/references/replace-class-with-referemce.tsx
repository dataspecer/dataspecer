import { DataPsmClass } from "@dataspecer/core/data-psm/model/data-psm-class";
import { useFederatedObservableStore } from "@dataspecer/federated-observable-store-react/store";
import { useResource } from "@dataspecer/federated-observable-store-react/use-resource";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import { MenuItem } from "@mui/material";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { useDialog } from "../../../dialog";
import { useAsyncMemo } from "../../../hooks/use-async-memo";
import { ReplaceStructuralClassWithReference } from "../../../operations/replace-structural-class-with-reference";
import { findSchemasToReference, getConceptIdentity } from "../../../utils/structure-references";
import { ReplaceWithReferenceDialog } from "./replace-with-reference-dialog";

interface ReplaceClassWithReferenceProps {
  /**
   * Class id to be potentially replaced with a reference.
   */
  structuralClassId: string;

  /**
   * Owning entity such as OR or AssociationEnd.
   */
  owningStructuralEntityId: string;
}

/**
 * For given structural class it creates a menu button to replace it with a reference.
 * It is expected to be used inside OR block.
 * It only provides the replacement for the same conceptual class.
 */
export const ReplaceClassWithReference: FC<ReplaceClassWithReferenceProps> = (props) => {
  const store = useFederatedObservableStore();
  const { t } = useTranslation("psm");

  const { resource } = useResource<DataPsmClass>(props.structuralClassId);
  const interpretation = resource?.dataPsmInterpretation;

  // Computed outside of the render as the whole store needs to be searched.
  const [availableClassesForReferencing] = useAsyncMemo(async () => findSchemasToReference(store, getConceptIdentity(store, interpretation)), [store, interpretation], []);

  const execute = (dataPsmSchemaIri: string) => {
    const op = new ReplaceStructuralClassWithReference(props.structuralClassId, props.owningStructuralEntityId, dataPsmSchemaIri);
    store.executeComplexOperation(op);
  };

  const ReplaceDialog = useDialog(ReplaceWithReferenceDialog);

  return (
    <>
      {availableClassesForReferencing.length > 0 && (
        <MenuItem
          onClick={() =>
            ReplaceDialog.open({
              roots: availableClassesForReferencing,
              onSelect: execute,
            })
          }
          title={t("replace with reference.title")}
        >
          <AutorenewIcon />
        </MenuItem>
      )}
      <ReplaceDialog.Component />
    </>
  );
};
