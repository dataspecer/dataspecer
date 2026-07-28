import type { DataSpecification } from '@dataspecer/specification/specification';
import { BaseResource, Package } from "@dataspecer/core-v2/project";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-browser";
import type { ModelIdentifier } from "@dataspecer/core/model";
import { createManagerModelStore, type DefaultFrontendModelStore } from "@dataspecer/model-store/implementation";
import type { ProjectModelEntity } from "@dataspecer/project-model";
import { getDataSpecification } from "@dataspecer/specification/specification";
import { Box, CircularProgress, Container, Typography } from "@mui/material";
import { createContext, FC, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { BackendConnectorContext } from "../../../application";
import { DocumentationSpecification } from "./documentation-specification";

export const SpecificationContext = createContext<DataSpecification & Package>(null);

export const AllSpecificationsContext = createContext<Record<string, BaseResource>>(null);

/**
 * Lightweight model store used by the manager to read and directly mutate the
 * package and artifact configuration blobs, without needing the heavier
 * semantic/structure/visual models used by the structure editor.
 */
export const ManagerModelStoreContext = createContext<DefaultFrontendModelStore>(null);
export const PROJECT_MODEL_ID: ModelIdentifier = "_project_model";

/**
 * There could be more types of specifications. This component decides which one
 * to use.
 */
export const Specification: FC = () => {
  const { t } = useTranslation("ui");
  const [searchParams] = useSearchParams();
  const dataSpecificationIri = searchParams.get("dataSpecificationIri");
  const backendConnector = useContext(BackendConnectorContext);

  const connector = useContext(BackendConnectorContext);

  const [specification, updateSpecification] = useState<DataSpecification & Package>(null);

  const [modelStore, setModelStore] = useState<DefaultFrontendModelStore>(null);

  useEffect(() => {
    (async () => {
      const modelStore = createManagerModelStore({
        projectId: dataSpecificationIri,
        backendUrl: import.meta.env.VITE_BACKEND,
        httpFetch,
      });

      await modelStore.initialize();
      await modelStore.waitForModelsToLoad();

      // Autosave: persist changed models to the backend after every fully
      // executed operation (commit, undo, redo).
      modelStore.subscribeToTransactionCommit(() => {
        modelStore.saveByOverride().catch(error => console.error("Failed to save models.", error));
      });


      setModelStore(modelStore);

      const reloadSpecification = () => {
        const allEntities = modelStore.getAllEntities();
        const projectModel = allEntities[PROJECT_MODEL_ID] as EntityRecord<ProjectModelEntity>;
        const rootModel = allEntities[dataSpecificationIri as string] || null;

        const dataSpecification = getDataSpecification(dataSpecificationIri, projectModel, rootModel);
        updateSpecification(dataSpecification);
      };
      reloadSpecification();
      modelStore.subscribeToEntityChanges(reloadSpecification);
    })();
  }, [dataSpecificationIri, updateSpecification, backendConnector]);

  const [allSpecifications, setAllSpecifications] = useState<Record<string, BaseResource>>(null);
  useEffect(() => {
    connector
      .getPackage("http://dataspecer.com/packages/local-root")
      .then((result) => setAllSpecifications(Object.fromEntries(result.subResources.map((resource) => [resource.iri, resource]))));
  }, [connector]);

  if (specification && allSpecifications && modelStore) {
    return (
      <SpecificationContext.Provider value={specification}>
        <ManagerModelStoreContext.Provider value={modelStore}>
          <AllSpecificationsContext.Provider value={allSpecifications}>
            <DocumentationSpecification />
          </AllSpecificationsContext.Provider>
        </ManagerModelStoreContext.Provider>
      </SpecificationContext.Provider>
    );
  } else {
    return <Container>
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="50vh" gap={2}>
      <CircularProgress />
      <Typography variant="h6" color="textSecondary">
        {t("loading specification")}
      </Typography>
    </Box>
  </Container>;
  }
};
