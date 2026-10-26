import { useContext, useEffect, useState } from "react";
import { useFederatedObservableStore } from "@dataspecer/federated-observable-store-react/store";
import { useAsyncMemo } from "../../hooks/use-async-memo";
import { ConfigurationContext } from "../App";
import { getSingleArtifact } from "../../../generators/get-single-artifact";
import { DataSpecificationSchema } from "@dataspecer/core/data-specification/model";
import { DefaultConfigurationContext } from "../../../application";

/**
 * Hook that generates given artifacts every time the store changes and returns
 * memory stream dictionary containing the generated data.
 */
export const useSingleGeneratedFileArtifact = (generatorId: string) => {
  const { dataSpecifications, dataSpecificationIri, dataPsmSchemaIri } = useContext(ConfigurationContext);
  const defaultConfiguration = useContext(DefaultConfigurationContext);
  // Every instance represents a constant state of the store
  const [storeChangeTrigger, setStoreChangeTrigger] = useState<object>({});
  const store = useFederatedObservableStore();
  useEffect(() => {
    const listener = () => setStoreChangeTrigger({});
    return store.subscribeToChanges(listener);
  }, [store]);

  // Run artifacts if something changes
  return useAsyncMemo(async () => {
    try {
      return await getSingleArtifact(
        store,
        dataSpecificationIri as string,
        // @ts-ignore
        dataSpecifications,
        (artefact) => artefact.generator === generatorId && (!DataSpecificationSchema.is(artefact) || artefact.psm === dataPsmSchemaIri),
        defaultConfiguration,
      );
    } catch (e) {
      console.error(e);
      return null;
    }
  }, [storeChangeTrigger, generatorId, dataSpecifications, dataSpecificationIri, dataPsmSchemaIri]);
};
