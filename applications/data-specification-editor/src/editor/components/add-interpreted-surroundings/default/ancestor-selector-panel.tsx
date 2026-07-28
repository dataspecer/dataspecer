import { isSemanticModelGeneralization, SemanticModelClass, SemanticModelEntity, SemanticModelGeneralization } from "@dataspecer/core-v2/semantic-model/concepts";
import { StoreContext } from "@dataspecer/federated-observable-store-react/store";
import InfoTwoToneIcon from '@mui/icons-material/InfoTwoTone';
import { IconButton, List, ListItem, ListItemText, Tooltip, Typography } from "@mui/material";
import React, { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAsyncMemo } from "../../../hooks/use-async-memo";
import { useDialog } from "../../../hooks/use-dialog";
import { useNewFederatedObservableStoreFromSemanticEntities } from "../../../hooks/use-new-federated-observable-store-from-semantic-entities";
import { ConfigurationContext } from "../../App";
import { PimClassDetailDialog } from "../../detail/pim-class-detail-dialog";
import { LanguageStringFallback, LanguageStringText } from "../../helper/LanguageStringComponents";
import { LoadingDialog } from "../../helper/LoadingDialog";
import { SlovnikGovCzGlossary } from "../../slovnik.gov.cz/SlovnikGovCzGlossary";
import { ExternalEntityWrapped } from "@dataspecer/core-v2/hierarchical-semantic-aggregator";
import { ExternalEntityBadge } from "../../entity-badge";

interface AncestorSelectorPanelParameters {
    forSemanticClassId: string,
    selectedAncestorCimIri: string | null,
    selectAncestorCimIri: (ancestorCimIri: string) => void,

    hierarchyStore: ExternalEntityWrapped[] | null;
    setHierarchyStore: (reader: ExternalEntityWrapped[]) => void;
}

const BFS = async (modelReader: ExternalEntityWrapped[], rootIri: string): Promise<ExternalEntityWrapped[]> => {
    const sorted: ExternalEntityWrapped[] = [];
    const queue: string[] = [rootIri];
    const visited = new Set<string>();

    while (queue.length > 0) {
        const processed = queue.shift();
        if (visited.has(processed)) {
            continue;
        }
        visited.add(processed);

        const resource = modelReader.find(e => e.aggregatedEntity.id === processed) as ExternalEntityWrapped<SemanticModelClass>;
        if (!resource) {
            // The given resource does not exist. This is not an error. It just means that some CIM adapters are missing.
            continue;
        }
        sorted.push(resource);
        modelReader.filter((e => isSemanticModelGeneralization(e.aggregatedEntity)) as (entity) => entity is ExternalEntityWrapped<SemanticModelGeneralization>)
            .filter(g => g.aggregatedEntity.child === processed).forEach(g => queue.push(g.aggregatedEntity.parent));
    }

    return sorted;
}

export const AncestorSelectorPanel: React.FC<AncestorSelectorPanelParameters> = ({forSemanticClassId, selectedAncestorCimIri, selectAncestorCimIri, hierarchyStore, setHierarchyStore}) => {
    const {t} = useTranslation("interpretedSurrounding");
    const {semanticModelAggregator} = React.useContext(ConfigurationContext);
    const [sorted, loading] = useAsyncMemo(async () => hierarchyStore ? await BFS(hierarchyStore, forSemanticClassId) : null, [hierarchyStore]);

    useEffect(() => {
        let isActive = true;
        semanticModelAggregator.getHierarchyForLookup(forSemanticClassId).then(s => isActive && setHierarchyStore(s));
        return () => {
            isActive = false;
        };
    }, [forSemanticClassId, setHierarchyStore]);

    const ClassDetailDialog = useDialog(PimClassDetailDialog, ["iri"]);

    const entities = useMemo(() => hierarchyStore?.map(wrap => wrap.aggregatedEntity as SemanticModelEntity) ?? null, [hierarchyStore]);
    const newStore = useNewFederatedObservableStoreFromSemanticEntities(entities);

    return <>
        <Typography variant="subtitle1" component="h2">{t('ancestors title')}</Typography>
        {(loading || hierarchyStore === null) ? <LoadingDialog /> :
            <List component="nav" aria-label="main mailbox folders" dense>
                {sorted && sorted.map((ancestor: ExternalEntityWrapped<SemanticModelClass>) =>
                    <Tooltip open={(ancestor.aggregatedEntity.description && Object.values(ancestor.aggregatedEntity.description).some(s => s.length > 0)) ? undefined : false} title={<LanguageStringText from={ancestor.aggregatedEntity.description} />} placement="left" key={ancestor.aggregatedEntity.iri}>
                        <ListItem button selected={ancestor.aggregatedEntity.iri === (selectedAncestorCimIri ?? forSemanticClassId)} onClick={() => ancestor.aggregatedEntity.id && selectAncestorCimIri(ancestor.aggregatedEntity.id)}>
                            <ListItemText
                                primary={<><LanguageStringFallback from={ancestor.aggregatedEntity.name} fallback={<i>unnamed</i>} /><ExternalEntityBadge entity={ancestor} /></>}
                                secondary={<SlovnikGovCzGlossary cimResourceIri={ancestor.aggregatedEntity.iri as string}/>}
                            />
                           <IconButton size="small" onClick={(event) => {ClassDetailDialog.open({iri: ancestor.aggregatedEntity.iri as string}); event.stopPropagation();}}><InfoTwoToneIcon fontSize="inherit" /></IconButton>
                        </ListItem>
                    </Tooltip>
                )}
            </List>
        }

        <StoreContext.Provider value={newStore}>
            <ClassDetailDialog.Component />
        </StoreContext.Provider>
    </>;
};
