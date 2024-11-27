import React, {useContext, useEffect, useMemo, useState} from 'react';
import {AppBar, Box, Container, Divider, Link, Toolbar, Typography} from "@mui/material";
import {StoreContext, useNewFederatedObservableStore} from "@dataspecer/federated-observable-store-react/store";
import {StoreDescriptor} from "@dataspecer/backend-utils/store-descriptor";
import {useConstructedStoresFromDescriptors} from "./utils/use-stores-by-descriptors";
import {CoreResourceReader} from "@dataspecer/core/core";
import {AvailableTags, FilterContext} from "./routes/home/filter-by-tag-select";
import {useLocalStorage} from "./utils/use-local-storage";
import {BackendConnectorContext} from "../application";
import {Help} from "../components/help";
import {ReturnBackButton} from "../components/return-back/return-back-button";
import { DataSpecification, StructureEditorBackendService } from '../specification';

export const DataSpecificationsContext = React.createContext({
    dataSpecifications: {} as Record<string, DataSpecification>,
    setDataSpecifications: (dataSpecifications: Record<string, DataSpecification>) => {},
    rootDataSpecificationIris: [] as string[],
    setRootDataSpecificationIris: (rootDataSpecificationIris: string[]) => {},
});

export const ConstructedStoreCacheContext = React.createContext<Map<StoreDescriptor, CoreResourceReader>>(new Map());

async function getSpecifications(connector: StructureEditorBackendService): Promise<Record<string, DataSpecification>> {
    const pckg = await connector.getPackage("http://dataspecer.com/packages/local-root");
    const subResources = pckg.subResources!;
    const specifications = await Promise.all(subResources.map(s => connector.getDataSpecification(s.iri)));
    return Object.fromEntries(specifications.map(s => [s.id, s]));
}

function App(props: {children: React.ReactNode}) {
    /**
     * Cached data specifications. Not necessary all of them are shown on the front page.
     */
    const [dataSpecifications, setDataSpecifications] = useState<Record<string, DataSpecification>>({});

    /**
     * Specifications that are shown on the front page.
     */
    const [rootDataSpecificationIris, setRootDataSpecificationIris] = useState<string[]>([]);

    const connector = useContext(BackendConnectorContext);
    useEffect(() => {
        getSpecifications(connector).then(specifications => {
            setDataSpecifications(specifications);
            setRootDataSpecificationIris(Object.keys(specifications));
        });
    }, [connector]);

    // Create a root FederatedObservableStore and add all PIM stores to it.

    const store = useNewFederatedObservableStore();
    // const pimStoreDescriptors = useMemo(() => Object.values(dataSpecifications).reduce(
    //     (accumulator, currentValue) =>
    //         [...accumulator, ...currentValue.pimStores],
    //     [] as StoreDescriptor[],
    // ), [dataSpecifications]);

    useEffect(() => {
        (window as any).store = store;
    }, [store]);

    // Stores that are already constructed may be used for generators.
    const constructedStoreCache = useConstructedStoresFromDescriptors([], store);

    const dataSpecificationContext = useMemo(() => ({
        dataSpecifications,
        setDataSpecifications,
        rootDataSpecificationIris,
        setRootDataSpecificationIris,
    }), [
        dataSpecifications,
        setDataSpecifications,
        rootDataSpecificationIris,
        setRootDataSpecificationIris,
    ]);

    // Basic filtering

    const filter = useLocalStorage<string>("filter-by-tag", null);
    const tags = useMemo(() =>
        [...new Set(Object.values(dataSpecifications)
            .filter(ds => rootDataSpecificationIris.includes(ds.id as string))
            .reduce((previousValue, currentValue) => [...previousValue, ...currentValue.tags], [] as string[]))] as string[]
    , [dataSpecifications, rootDataSpecificationIris]);

    return (
            <DataSpecificationsContext.Provider value={dataSpecificationContext}>
                <StoreContext.Provider value={store}>
                    <ConstructedStoreCacheContext.Provider value={constructedStoreCache}>
                        <AvailableTags.Provider value={tags}>
                            <FilterContext.Provider value={filter}>
                                <AppBar position="static" sx={{background: "#3f51b5 linear-gradient(5deg, #5d2f86, #3f51b5);"}}>
                                    <Toolbar>
                                        <Typography variant="h6" component={Link} href={import.meta.env.VITE_MANAGER_URL + "/"} sx={{color: "white", textDecoration: "none", fontWeight: "normal"}}>
                                            <strong>Dataspecer</strong> specification manager
                                        </Typography>
                                        <ReturnBackButton />
                                        <Box display="flex" sx={{flexGrow: 1, gap: 4}} justifyContent="flex-end">
                                            <Help />
                                        </Box>
                                    </Toolbar>
                                </AppBar>
                                <Container>
                                    {props.children}
                                    <Divider style={{margin: "1rem 0 1rem 0"}} />
                                    {import.meta.env.VITE_DEBUG_VERSION !== undefined &&
                                        <>
                                            Version: <span>{import.meta.env.VITE_DEBUG_VERSION}</span>
                                        </>
                                    }
                                </Container>
                            </FilterContext.Provider>
                        </AvailableTags.Provider>
                    </ConstructedStoreCacheContext.Provider>
                </StoreContext.Provider>
            </DataSpecificationsContext.Provider>
    );
}

export default App;
