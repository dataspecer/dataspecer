import { DataSpecification } from "@dataspecer/backend-utils/connectors/specification";
import { BaseResource, Package } from "@dataspecer/core-v2/project";
import { createContext, FC, useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BackendConnectorContext } from "../../../application";
import { DocumentationSpecification } from "./documentation-specification";

export const SpecificationContext = createContext<[DataSpecification & Package, (update: DataSpecification & Package) => void]>(null);

export const AllSpecificationsContext = createContext<Record<string, BaseResource>>(null);

/**
 * There could be more types of specifications. This component decides which one
 * to use.
 */
export const Specification: FC = () => {
  const [searchParams] = useSearchParams();
  const dataSpecificationIri = searchParams.get("dataSpecificationIri");

  const connector = useContext(BackendConnectorContext);

  const contextForSpecificationContext = useState(null);
  const updateSpecification = contextForSpecificationContext[1];

  useEffect(() => {
    connector.getDataSpecification(dataSpecificationIri as string).then((s) => updateSpecification(s));
  }, [connector, dataSpecificationIri, updateSpecification]);

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
    return null;
  }
};
