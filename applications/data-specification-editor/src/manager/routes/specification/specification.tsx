import type { EntityRecord } from "@dataspecer/core/entity-model";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-browser";
import type { ModelIdentifier } from "@dataspecer/core/model";
import { createManagerModelStore, type DefaultFrontendModelStore } from "@dataspecer/model-store/implementation";
import { ModelStoreContext } from "@dataspecer/model-store/react";
import { type ProjectModelEntity } from "@dataspecer/project-model";
import type { DataSpecification } from "@dataspecer/specification/specification";
import { getDataSpecification } from "@dataspecer/specification/specification";
import { Box, CircularProgress, Container, Typography } from "@mui/material";
import { createContext, FC, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { DocumentationSpecification } from "./documentation-specification";

export const SpecificationContext = createContext<DataSpecification>(null);

export const PROJECT_MODEL_ID: ModelIdentifier = "_project_model";

/**
 * Accesses the manager's model store (provided via {@link ModelStoreContext})
 * typed for write access (transactions), as opposed to {@link useModelStoreEntity}
 * which only needs read access.
 */
export function useModelStore(): DefaultFrontendModelStore {
  return useContext(ModelStoreContext) as DefaultFrontendModelStore;
}

/**
 * There could be more types of specifications. This component decides which one
 * to use.
 */
export const Specification: FC = () => {
  const { t } = useTranslation("ui");
  const [searchParams] = useSearchParams();
  const dataSpecificationIri = searchParams.get("dataSpecificationIri");

  const [specification, updateSpecification] = useState<DataSpecification>(null);

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
        modelStore.saveByOverride().catch((error) => console.error("Failed to save models.", error));
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
  }, [dataSpecificationIri, updateSpecification]);

  if (specification && modelStore) {
    return (
      <SpecificationContext.Provider value={specification}>
        <ModelStoreContext.Provider value={modelStore}>
          <DocumentationSpecification />
        </ModelStoreContext.Provider>
      </SpecificationContext.Provider>
    );
  } else {
    return (
      <Container>
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="50vh" gap={2}>
          <CircularProgress />
          <Typography variant="h6" color="textSecondary">
            {t("loading specification")}
          </Typography>
        </Box>
      </Container>
    );
  }
};
