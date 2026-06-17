import { isSemanticModelClass, SemanticModelClass, SemanticModelEntity } from "@dataspecer/core-v2/semantic-model/concepts";
import { StoreContext, useFederatedObservableStore } from "@dataspecer/federated-observable-store-react/store";
import { Alert, Box, Button, DialogActions, DialogContent, DialogTitle, ListItem } from "@mui/material";
import React, { memo } from "react";
import { useTranslation } from "react-i18next";
import { dialog, useDialog } from "../../../dialog";
import { useAsyncMemo } from "../../../hooks/use-async-memo";
import { useDataPsmAndInterpretedPim } from "../../../hooks/use-data-psm-and-interpreted-pim";
import { useNewFederatedObservableStoreFromSemanticEntities } from "../../../hooks/use-new-federated-observable-store-from-semantic-entities";
import { AddSpecialization } from "../../../operations/add-specialization";
import { ExternalEntityWrapped } from "@dataspecer/core-v2/hierarchical-semantic-aggregator";
import { isAncestorOf } from "../../../utils/is-ancestor-of";
import { ConfigurationContext } from "../../App";
import { PimClassDetailDialog } from "../../detail/pim-class-detail-dialog";
import { Item } from "../replace-along-inheritance/item";

export const AddSpecializationDialog = dialog<{
  // For which PSM entity is the action performed
  dataPsmClassIri: string;
  // Whether the parent is already wrapped in OR - then it is the IRI of the OR
  wrappedOrIri?: string;
}>(
  { maxWidth: "md", fullWidth: true },
  memo(({ dataPsmClassIri, close, wrappedOrIri }) => {
    const { t } = useTranslation("psm");

    const store = useFederatedObservableStore();

    const { pimResource } = useDataPsmAndInterpretedPim(dataPsmClassIri);
    const semanticClassId = pimResource?.id;

    const { operationContext, semanticModelAggregator } = React.useContext(ConfigurationContext);
    const [fullInheritance] = useAsyncMemo(async () => (semanticClassId ? await semanticModelAggregator.getHierarchyForLookup(semanticClassId) : null), [semanticClassId]);

    const PimClassDetail = useDialog(PimClassDetailDialog);

    const [descendants] = useAsyncMemo(
      async () => {
        if (!fullInheritance || !semanticClassId) {
          return [];
        }

        const middleClassIri = semanticClassId;

        const descendants: ExternalEntityWrapped<SemanticModelClass>[] = [];

        const unwrappedFullInheritance = fullInheritance.map((entity) => entity.aggregatedEntity);
        for (const resource of fullInheritance.filter(((entity) => isSemanticModelClass(entity.aggregatedEntity)) as (
          entity
        ) => entity is ExternalEntityWrapped<SemanticModelEntity>)) {
          if (isAncestorOf(unwrappedFullInheritance, middleClassIri, resource.aggregatedEntity.id)) {
            descendants.push(resource as ExternalEntityWrapped<SemanticModelClass>);
          }
        }

        return descendants;
      },
      [fullInheritance],
      []
    ) as [ExternalEntityWrapped<SemanticModelClass>[], boolean];

    const onSelected = async (selected: ExternalEntityWrapped<SemanticModelClass>) => {
      if (!fullInheritance) {
        return;
      }

      const transformedEntity = await semanticModelAggregator.externalEntityToLocalForHierarchyExtension(pimResource.id, selected, false, fullInheritance);

      const operation = new AddSpecialization(dataPsmClassIri, wrappedOrIri, transformedEntity.aggregatedEntity.id);
      operation.setContext(operationContext);
      operation.setSemanticStore(semanticModelAggregator);
      await store.executeComplexOperation(operation);
      close();
    };

    const fullInheritanceEntities = React.useMemo(() => fullInheritance?.map(entity => entity.aggregatedEntity as SemanticModelEntity), [fullInheritance]);
    const newStore = useNewFederatedObservableStoreFromSemanticEntities(fullInheritanceEntities);

    return (
      <>
        <DialogTitle>{t("add specialization.title")}</DialogTitle>
        <DialogContent>
          <Alert severity="info">{t("add specialization.help")}</Alert>
          <Box sx={{ maxHeight: 400, overflow: "auto", mt: 3 }}>
            {descendants.map((resource) => (
              <Item semanticModelClass={resource} onClick={() => onSelected(resource)} onInfo={() => PimClassDetail.open({ iri: resource.aggregatedEntity.id })} />
            ))}
            {descendants.length === 0 && (
              <ListItem disabled>
                <i>{t("specialization.no-descendants")}</i>
              </ListItem>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>{t("cancel")}</Button>
        </DialogActions>
        <StoreContext.Provider value={newStore}>
          <PimClassDetail.Component />
        </StoreContext.Provider>
      </>
    );
  })
);
