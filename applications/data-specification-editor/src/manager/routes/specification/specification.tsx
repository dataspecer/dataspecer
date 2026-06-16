import type { DataSpecification } from '@dataspecer/specification/specification';
import { BaseResource, Package } from "@dataspecer/core-v2/project";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-browser";
import type { ModelIdentifier } from "@dataspecer/core/model";
import { createDSEModelStore } from "@dataspecer/model-store/implementation";
import type { ModelEntity } from "@dataspecer/project-model";
import { getDataSpecification } from "@dataspecer/specification/specification";
import { Box, CircularProgress, Container, Typography } from "@mui/material";
import { createContext, FC, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { BackendConnectorContext } from "../../../application";
import { backendPackageService } from "../../../generators/configuration/provided-configuration";
import { DocumentationSpecification } from "./documentation-specification";

export const SpecificationContext = createContext<[DataSpecification & Package, (update: DataSpecification & Package) => void]>(null);

export const AllSpecificationsContext = createContext<Record<string, BaseResource>>(null);

/**
 * There could be more types of specifications. This component decides which one
 * to use.
 */
export const Specification: FC = () => {
  const { t } = useTranslation("ui");
  const [searchParams] = useSearchParams();
  const dataSpecificationIri = searchParams.get("dataSpecificationIri");

  const connector = useContext(BackendConnectorContext);

  const contextForSpecificationContext = useState(null);
  const updateSpecification = contextForSpecificationContext[1];

  useEffect(() => {
    (async () => {
      const modelStore = createDSEModelStore({
        projectId: dataSpecificationIri,
        packageService: backendPackageService,
        httpFetch,
      });

      await modelStore.initialize();
      await modelStore.waitForModelsToLoad();

      const PROJECT_MODEL_ID: ModelIdentifier = "_project_model";
      const allEntities = modelStore.getAllEntities();
      const projectModel = allEntities[PROJECT_MODEL_ID] as EntityRecord<ModelEntity>;
      const rootModel = allEntities[dataSpecificationIri as string] || null;

      const dataSpecification = getDataSpecification(dataSpecificationIri, projectModel, rootModel);
      updateSpecification(dataSpecification);
    })();
  }, [dataSpecificationIri, updateSpecification]);

  const [allSpecifications, setAllSpecifications] = useState<Record<string, BaseResource>>(null);
  useEffect(() => {
    connector
      .getPackage("http://dataspecer.com/packages/local-root")
      .then((result) => setAllSpecifications(Object.fromEntries(result.subResources.map((resource) => [resource.iri, resource]))));
  }, [connector]);

  if (contextForSpecificationContext[0] && allSpecifications) {
    return (
      <SpecificationContext.Provider value={contextForSpecificationContext}>
        <AllSpecificationsContext.Provider value={allSpecifications}>
          <DocumentationSpecification />
        </AllSpecificationsContext.Provider>
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
