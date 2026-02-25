import { DataSpecification } from "@dataspecer/backend-utils/connectors/specification";
import { BaseResource, Package } from "@dataspecer/core-v2/project";
import { getDataSpecification } from "@dataspecer/specification/specification";
import { createContext, FC, useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BackendConnectorContext } from "../../../application";
import { modelRepository } from "../../../generators/configuration/provided-configuration";
import { DocumentationSpecification } from "./documentation-specification";
import { Box, CircularProgress, Container, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { CachedModelRepository } from "@dataspecer/specification/model-repository";

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
      const cachedModelRepository = new CachedModelRepository(modelRepository);
      const model = await cachedModelRepository.getModelById(dataSpecificationIri as string);
      const packageModel = await model?.asPackageModel();
      const dataSpecification = packageModel ? await getDataSpecification(packageModel) : undefined;
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
