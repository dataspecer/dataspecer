import { Button, DialogActions, Grid } from "@mui/material";
import React, { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { DataPsmClass } from "@dataspecer/core/data-psm/model";
import { useDataPsmAndInterpretedPim } from "../../../hooks/use-data-psm-and-interpreted-pim";
import { PimClass } from "@dataspecer/core/pim/model";
import { ConfigurationContext } from "../../App";
import { dialog } from "../../../dialog";
import { DialogContent, DialogTitle } from "../../detail/common";
import { AddInterpretedSurroundingDialogProperties } from "../default/add-interpreted-surroundings-dialog";
import {
    WdEntityId,
    isWikidataAdapter,
    wdIriToNumId,
} from "@dataspecer/wikidata-experimental-adapter";
import { QueryClientProvider } from "react-query";
import { WikidataAdapterContext } from "../../wikidata/wikidata-adapter-context";
import { queryClient } from "./contexts/react-query-context";
import { WikidataAncestorsSelectorPanel } from "./wikidata-ancestors-selector-panel/wikidata-ancestors-selector-panel";
import { useWdGetSurroundings } from "./hooks/use-wd-get-surroundings";
import { WikidataLoading } from "./helpers/wikidata-loading";
import { WikidataLoadingError } from "./helpers/wikidata-loading-error";
import { WdPropertySelectionContext } from "./contexts/wd-property-selection-context";
import { useWdPropertySelection } from "./hooks/use-wd-property-selection";
import { ReadOnlyMemoryStore } from "@dataspecer/core/core";
import { transformSelectedSurroundings } from "./property-selection-record/transform-selected-surroundings";
import { WikidataPropertiesPanel } from "./wikidata-properties-panel/wikidata-properties-panel";
import { SemanticModelClass, SemanticModelEntity } from "@dataspecer/core-v2/semantic-model/concepts";
import { PrefixIriProvider } from "@dataspecer/core/cim";
import { transformCoreResources } from "@dataspecer/core-v2/semantic-model/v1-adapters";

const identityIriProvider = new PrefixIriProvider();

interface WikidataAddInterpretedSurroundingDialogContentProps
    extends AddInterpretedSurroundingDialogProperties {
    pimClass: SemanticModelClass;
    dataPsmClass: DataPsmClass;
    wdRootClassId: WdEntityId;
}

export const WikidataAddInterpretedSurroundingsDialog: React.FC<AddInterpretedSurroundingDialogProperties> =
    dialog({ fullWidth: true, maxWidth: "xl", PaperProps: { sx: { height: "90%" } } }, (props) => {
        // @ts-ignore
        const { sourceSemanticModel } = React.useContext(ConfigurationContext);
        const { pimResource: pimClass, dataPsmResource: dataPsmClass } =
            useDataPsmAndInterpretedPim<DataPsmClass, SemanticModelClass>(props.dataPsmClassIri);
        const cimClassIri = pimClass?.iri;

        // @ts-ignore
        const unwrappedAdapter = sourceSemanticModel?.model?.cimAdapter ?? null;

        const selected = (operation: {
            resourcesToAdd: [string, boolean][],
            sourcePimModel: SemanticModelEntity[],
            forDataPsmClass: DataPsmClass,
        }) => {
            // @ts-ignore
            const pimResources = operation.sourcePimModel.resources;
            props.selected({
                resourcesToAdd: operation.resourcesToAdd,
                forDataPsmClass: operation.forDataPsmClass,
                // @ts-ignore
                sourcePimModel: Object.values(transformCoreResources(pimResources)) as SemanticModelEntity[],
            });
        };

        if (props.isOpen && cimClassIri) {
            return (
                <WikidataAdapterContext.Provider
                    value={{ iriProvider: identityIriProvider, wdAdapter: unwrappedAdapter }}
                >
                    <QueryClientProvider client={queryClient}>
                        <WikidataAddInterpretedSurroundingsDialogContent
                            {...props}
                            selected={selected}
                            pimClass={pimClass}
                            dataPsmClass={dataPsmClass}
                            wdRootClassId={wdIriToNumId(pimClass.iri)}
                        />
                    </QueryClientProvider>
                </WikidataAdapterContext.Provider>
            );
        }

        return null;
    });

const WikidataAddInterpretedSurroundingsDialogContent: React.FC<
    WikidataAddInterpretedSurroundingDialogContentProps
> = ({ isOpen, close, selected, pimClass, dataPsmClass, wdRootClassId }) => {
    const { t } = useTranslation("interpretedSurrounding");
    const adapterContext = useContext(WikidataAdapterContext);
    const propertyWdSelectionContextValue = useWdPropertySelection();
    const [selectedWdClassId, setSelectedWdClassId] = useState<WdEntityId>(wdRootClassId);
    const {
        wdClassSurroundings: rootWdClassSurroundings,
        isLoading,
        isError,
    } = useWdGetSurroundings(wdRootClassId);

    return (
        <WdPropertySelectionContext.Provider value={propertyWdSelectionContextValue}>
            <DialogTitle id='customized-dialog-title' close={close}>
                {t("title")}
            </DialogTitle>
            <DialogContent dividers>
                {isLoading && <WikidataLoading />}
                {isError && (
                    <WikidataLoadingError
                        errorMessage={t("no ancestors no associations no attributes")}
                    />
                )}
                {!isLoading && !isError && (
                    <Grid container spacing={3}>
                        <Grid
                            item
                            xs={3}
                            sx={{ borderRight: (theme) => "1px solid " + theme.palette.divider }}
                            >
                            <WikidataAncestorsSelectorPanel
                                rootWdClassSurroundings={rootWdClassSurroundings}
                                selectedWdClassId={selectedWdClassId}
                                setSelectedWdClassId={setSelectedWdClassId}
                                />
                        </Grid>
                        <Grid item xs={9}>
                            <WikidataPropertiesPanel
                                key={selectedWdClassId.toString()}
                                selectedWdClassId={selectedWdClassId}
                                rootWdClassSurroundings={rootWdClassSurroundings}
                                />
                        </Grid>
                    </Grid>
                )}
            </DialogContent>
            <DialogActions>
                <Button
                    onClick={async () => {
                        const [resourcesToAdd, resources] = transformSelectedSurroundings(
                            propertyWdSelectionContextValue.wdPropertySelectionRecords, adapterContext, rootWdClassSurroundings);
                            selected({
                                resourcesToAdd,
                                // @ts-ignore
                                sourcePimModel: ReadOnlyMemoryStore.create(resources),
                                forDataPsmClass: dataPsmClass
                            })
                            close();
                        }}
                    disabled={propertyWdSelectionContextValue.wdPropertySelectionRecords.length === 0}
                    >
                    {t("confirm button")}
                </Button>
                <Button color="error" onClick={close}>{t("close button")}</Button>
            </DialogActions>
        </WdPropertySelectionContext.Provider>
    );
};

