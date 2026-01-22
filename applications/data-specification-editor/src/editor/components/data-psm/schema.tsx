import { DataPsmClass, DataPsmSchema } from "@dataspecer/core/data-psm/model";
import { useFederatedObservableStore } from "@dataspecer/federated-observable-store-react/store";
import { useResource } from "@dataspecer/federated-observable-store-react/use-resource";
import { IconButton, Paper, Typography, useTheme } from "@mui/material";
import Skeleton from '@mui/material/Skeleton';
import React, { useCallback } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { useTranslation } from "react-i18next";
import { useDialog } from "../../dialog";
import { Icons, IconsTwoTone } from "../../icons";
import { SetOrder } from "../../operations/set-order";
import { EntityChainDetailDialog } from "../detail/entity-chain-detail-dialog";
import { LanguageStringFallback } from "../helper/LanguageStringComponents";
import { DataPsmSchemaRootItem } from "./entities/schema-root";

export const DataPsmSchemaItem: React.FC<{dataPsmSchemaIri: string}> = ({dataPsmSchemaIri}) => {
  const {resource: dataPsmSchema} = useResource<DataPsmSchema>(dataPsmSchemaIri);
  const readOnly = false;
  const store = useFederatedObservableStore();
  const theme = useTheme();
  
  // Use TwoTone icons in light mode, regular icons in dark mode
  const iconSet = theme.palette.mode === 'dark' ? Icons : IconsTwoTone;

  const DetailDialog = useDialog(EntityChainDetailDialog, ["iris"]);
  const openDetail = useCallback(() => DetailDialog.open({}), [DetailDialog]);

  /**
   * When moving items anywhere inside the panel of the current dataPsm schema.
   */
  const itemsDragged = useCallback(({draggableId, destination}: DropResult) => {
    if (destination) {
      const parent = destination.droppableId.split(" ")[0];
      const property = draggableId.split(" ")[0];
      store.executeComplexOperation(new SetOrder(parent, property, destination.index)).then();

      // ! We need to create an optimistic update to avoid flickering.
      const resource = store.readSync(parent) as DataPsmClass;
      const dataPsmParts: string[] = [];
      for (let i = 0; i < resource.dataPsmParts.length; i++) {
        if (dataPsmParts.length === destination.index) {
          dataPsmParts.push(property);
        }
        if (resource.dataPsmParts[i] !== property) {
          dataPsmParts.push(resource.dataPsmParts[i]);
        }
      }
      if (dataPsmParts.length === destination.index) {
        dataPsmParts.push(property);
      }
      store.doOptimisticUpdate(parent, {...resource, dataPsmParts} as DataPsmClass)
    }
  }, [store]);

  const {t} = useTranslation("psm");

  return <Paper style={{padding: "1rem", margin: "1rem 0"}}>
    {dataPsmSchema && <>
        <DetailDialog.Component iris={[dataPsmSchemaIri]} />
        <Typography variant="h5">
          <LanguageStringFallback from={dataPsmSchema.dataPsmHumanLabel} fallback={<i>{t("no label")}</i>}/>
          {readOnly ||
              <IconButton sx={{ml: .5}} onClick={openDetail}>
                <iconSet.Tree.Edit/>
              </IconButton>
          }
        </Typography>
        <LanguageStringFallback from={dataPsmSchema.dataPsmHumanDescription}>{text => <Typography color="textSecondary">{text}</Typography>}</LanguageStringFallback>
        <DragDropContext onDragEnd={itemsDragged}>
            <ul style={{paddingLeft: 0}}>
              {dataPsmSchema.dataPsmRoots.map((_, index) => <DataPsmSchemaRootItem iri={dataPsmSchema.iri} key={index} rootIndex={index} />)}
            </ul>
        </DragDropContext>
    </>}
    {!dataPsmSchema && <>
        <Typography variant="h5"><Skeleton /></Typography>
        <Typography color="textSecondary"><Skeleton /></Typography>
    </>}
  </Paper>
};
