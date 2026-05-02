import { isSemanticModelClass, SemanticModelClass, SemanticModelEntity } from "@dataspecer/core-v2/semantic-model/concepts";
import { StoreContext, useFederatedObservableStore } from "@dataspecer/federated-observable-store-react/store";
import { Alert, Box, Button, DialogActions, DialogContent, DialogTitle, Grid, ListItem, Typography } from "@mui/material";
import React, { memo } from "react";
import { useTranslation } from "react-i18next";
import { dialog, useDialog } from "../../../dialog";
import { useAsyncMemo } from "../../../hooks/use-async-memo";
import { useDataPsmAndInterpretedPim } from "../../../hooks/use-data-psm-and-interpreted-pim";
import { useNewFederatedObservableStoreFromSemanticEntities } from "../../../hooks/use-new-federated-observable-store-from-semantic-entities";
import { ReplaceAlongInheritance } from "../../../operations/replace-along-inheritance";
import { ExternalEntityWrapped } from "@dataspecer/core-v2/hierarchical-semantic-aggregator";
import { isAncestorOf } from "../../../utils/is-ancestor-of";
import { ConfigurationContext } from "../../App";
import { PimClassDetailDialog } from "../../detail/pim-class-detail-dialog";
import { Item } from "./item";

/**
 * This dialog prompts the user to select one class, descendant or ancestor of
 * the selected class, that will replace the selected class.
 *
 * The component itself has already the logic to replace the selected class.
 * The caller is responsible only to show the dialog with the correct selected
 * class.
 */
export const ReplaceAlongInheritanceDialog = dialog<{
    // Data Psm class IRI that is going to be replaced by another class.
    dataPsmClassIri: string,
}>({maxWidth: "md", fullWidth: true}, memo(({dataPsmClassIri, close}) => {
    const {t} = useTranslation("psm");

    const store = useFederatedObservableStore();

    const {pimResource} = useDataPsmAndInterpretedPim(dataPsmClassIri);
    const semanticEntityId = pimResource?.id;
    const cimIri = pimResource?.iri;

    const {operationContext, semanticModelAggregator} = React.useContext(ConfigurationContext);
    const [fullInheritance] = useAsyncMemo(async () => cimIri ? await semanticModelAggregator.getHierarchyForLookup(pimResource.id) : null, [cimIri]);

    // @ts-ignore
    const previewStore = useNewFederatedObservableStoreFromSemanticEntities(fullInheritance);

    const PimClassDetail = useDialog(PimClassDetailDialog);

    const [[ancestors, descendants]] = useAsyncMemo(async () => {
        if (!fullInheritance || !semanticEntityId) {
            return [[],[]];
        }

        const middleClassIri = semanticEntityId;

        const ancestors: ExternalEntityWrapped<SemanticModelClass>[] = [];
        const descendants: ExternalEntityWrapped<SemanticModelClass>[] = [];

        const unwrappedFullInheritance = fullInheritance.map((entity) => entity.aggregatedEntity);
        const resources = fullInheritance.filter(((entity) => isSemanticModelClass(entity.aggregatedEntity)) as (entity) => entity is ExternalEntityWrapped<SemanticModelEntity>);
        for (const resource of resources) {
            if (isAncestorOf(unwrappedFullInheritance, middleClassIri, resource.aggregatedEntity.id)) {
                descendants.push(resource as ExternalEntityWrapped<SemanticModelClass>);
            } else if (isAncestorOf(unwrappedFullInheritance, resource.aggregatedEntity.id, middleClassIri)) {
                ancestors.push(resource as ExternalEntityWrapped<SemanticModelClass>);
            }
        }

        return [ancestors, descendants];
    }, [fullInheritance, semanticEntityId], [[],[]]) as [[ExternalEntityWrapped<SemanticModelClass>[], ExternalEntityWrapped<SemanticModelClass>[]], boolean];

    console.log(ancestors, descendants);

    const onSelected = async (selectedResource: ExternalEntityWrapped<SemanticModelClass>, isMoreGeneral: boolean) => {
        if (!fullInheritance) {
            return;
        }

        const resource = await semanticModelAggregator.externalEntityToLocalForHierarchyExtension(pimResource.id, selectedResource, isMoreGeneral, fullInheritance);

        const replaceOperation = new ReplaceAlongInheritance(
            dataPsmClassIri,
            resource.aggregatedEntity.id,
        );
        replaceOperation.setContext(operationContext);
        replaceOperation.setSemanticStore(semanticModelAggregator);
        store.executeComplexOperation(replaceOperation);
        close();
    };

    return <>
        <StoreContext.Provider value={previewStore}>
            <DialogTitle>
                {t("replace along inheritance.title")}
            </DialogTitle>
            <DialogContent>
                <Alert severity="info">{t("replace along inheritance.help")}</Alert>
                <Grid container spacing={3} sx={{mt: 0}}>
                    <Grid item xs={6}>
                        <Typography variant="h5" gutterBottom component="div">
                            {t("generalization.title")}
                        </Typography>

                        <Box style={{maxHeight: 400, overflow: 'auto'}}>
                            {ancestors.map(resource => <Item
                                semanticModelClass={resource}
                                onClick={() => onSelected(resource, true)}
                                onInfo={() => PimClassDetail.open({iri: resource.aggregatedEntity.id})}
                            />)}
                            {ancestors.length === 0 &&
                                <ListItem disabled>
                                    {t("generalization.no-ancestors")}
                                </ListItem>
                            }
                        </Box>
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="h5" gutterBottom component="div">
                            {t("specialization.title")}
                        </Typography>

                        <Box style={{maxHeight: 400, overflow: 'auto'}}>
                            {descendants.map(resource => <Item
                                semanticModelClass={resource}
                                onClick={() => onSelected(resource, false)}
                                onInfo={() => PimClassDetail.open({iri: resource.aggregatedEntity.id})}
                            />)}
                            {descendants.length === 0 &&
                                <ListItem disabled>
                                    <i>{t("specialization.no-descendants")}</i>
                                </ListItem>
                            }
                        </Box>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={close}>{t("cancel")}</Button>
            </DialogActions>
            <PimClassDetail.Component />
        </StoreContext.Provider>
    </>
}));
