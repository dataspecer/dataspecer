import { ExtendedSemanticModelRelationship } from '@dataspecer/core-v2/semantic-model/concepts';
import { DataPsmAssociationEnd } from "@dataspecer/core/data-psm/model";
import { useFederatedObservableStore } from "@dataspecer/federated-observable-store-react/store";
import AutorenewIcon from '@mui/icons-material/Autorenew';
import { MenuItem } from "@mui/material";
import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { UseDialogOpenFunction } from "../../../dialog";
import { useAsyncMemo } from "../../../hooks/use-async-memo";
import { useDataPsmAndInterpretedPim } from "../../../hooks/use-data-psm-and-interpreted-pim";
import { ReplaceDataPsmAssociationEndWithReference } from "../../../operations/replace-data-psm-association-end-with-reference";
import { findSchemasToReference, getConceptIdentity } from "../../../utils/structure-references";
import { ReplaceWithReferenceDialog } from "./replace-with-reference-dialog";

export const ReplaceAssociationEndWithReference: React.FC<{dataPsmAssociationEnd: string, open: UseDialogOpenFunction<typeof ReplaceWithReferenceDialog>}> = ({dataPsmAssociationEnd, open}) => {
    const store = useFederatedObservableStore();
    const {t} = useTranslation("psm");

    const {relationshipEnd} = useDataPsmAndInterpretedPim<DataPsmAssociationEnd, ExtendedSemanticModelRelationship>(dataPsmAssociationEnd);

    // The association may be replaced by structures of the class it points to.
    const concept = relationshipEnd?.concept ?? null;

    // Computed outside of the render as the whole store needs to be searched.
    const [availableReferences] = useAsyncMemo(async () => findSchemasToReference(store, getConceptIdentity(store, concept)), [store, concept], []);

    const selected = useCallback((dataPsmSchemaIri: string) => {
        const op = new ReplaceDataPsmAssociationEndWithReference(dataPsmAssociationEnd, dataPsmSchemaIri);
        store.executeComplexOperation(op);
    }, [dataPsmAssociationEnd, store]);

    return <>
        {availableReferences.length > 0 &&
            <MenuItem
                onClick={() => open({roots: availableReferences, onSelect: selected})}
                title={t("replace with reference.title")}
            ><AutorenewIcon /></MenuItem>
        }
    </>
}
