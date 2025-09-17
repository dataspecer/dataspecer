import { lng } from "@/Dir";
import { Modal, ModalBody, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { modelTypeToName } from "@/known-models";
import { BetterModalProps } from "@/lib/better-modal";
import { ResourcesContext, packageService, requestLoadPackage } from "@/package";
import { LOCAL_VISUAL_MODEL } from "@dataspecer/core-v2/model/known-models";
import { applyLayoutConfiguration, createLayoutConfiguration, performLayoutOfSemanticModel, type VisualEntitiesWithModelVisualInformation } from "@dataspecer/layout";
import { Loader } from "lucide-react";
import { useContext, useEffect, useState } from "react";
import { useConfigDialog } from "./layout-dialog";
import { createVisualModelData } from "@dataspecer/core-v2/visual-model";
import { createDefaultConfigurationModelFromJsonObject } from "@dataspecer/core-v2/configuration-model";


export const Autolayout = ({ iri, isOpen, resolve, parentIri }: { iri: string, parentIri: string } & BetterModalProps<boolean>) => {
  const resources = useContext(ResourcesContext);
  const resource = resources[iri]!;
  const baseModelVisualizationId = iri + "/visualization";

  let modelVisualizationId = baseModelVisualizationId;
  let modelVisualizationResource = resources[modelVisualizationId];
  let lastModelVisualizationId = baseModelVisualizationId;
  let lastModelVisualizationResource = resources[modelVisualizationId];

  const [shouldCreateNewModel, setShouldCreateNewModel] = useState(true);

  let index = 0;
  while(modelVisualizationResource) {
    index++;

    lastModelVisualizationId = modelVisualizationId;
    lastModelVisualizationResource = modelVisualizationResource;

    modelVisualizationId = `${baseModelVisualizationId}-${index}`;
    modelVisualizationResource = resources[modelVisualizationId];
  }

  // Take the last used model
  if(!shouldCreateNewModel) {
    modelVisualizationId = lastModelVisualizationId;
    modelVisualizationResource = lastModelVisualizationResource;
  }


  const [isLoading, setIsLoading] = useState(false);
  const execute = async () => {
    setIsLoading(true);
    const response = await fetch(import.meta.env.VITE_BACKEND + "/resources/blob?iri=" + encodeURIComponent(iri));
    const data = await response.json();
    const entities = data.entities;
    const semanticModelId = data.modelId;


    const configurationData = (await packageService.getResourceJsonData(parentIri)) ?? {};
    const configuration = createDefaultConfigurationModelFromJsonObject(configurationData);
    applyLayoutConfiguration(configuration, getConfig());
    const result = configuration.serializeModelToApiJsonObject(configurationData);
    await packageService.setResourceJsonData(parentIri, result);

    console.log(entities);
    console.log(semanticModelId);
    console.info("resources");
    console.info(resources);
    console.info(resource);
    const visualEntities: VisualEntitiesWithModelVisualInformation = {};
    try {
      const layoutedVisualEntities = await performLayoutOfSemanticModel(entities, semanticModelId, getConfig());
      Object.entries(layoutedVisualEntities).forEach(([visualEntityIdentifier, layoutedVisualEntity]) => {
        visualEntities[visualEntityIdentifier] = layoutedVisualEntity.visualEntity;
      });

      const generatedIdentifierForModelColor = (Math.random() + 1).toString(36).substring(7);
      visualEntities[generatedIdentifierForModelColor] = createVisualModelData({
        identifier: generatedIdentifierForModelColor,
        representedModel: semanticModelId,
        color: "#ff9770",
      })
      console.info("layouted visual entitites");
      console.info(visualEntities);
    } catch (error) {
      alert("LAYOUT WAS NOT SUCCESSFUL");
      console.error(error);
      setIsLoading(false);
      return;
    }

    const VISUAL_MODEL_VERSION = 1;
    const visualizationModel = {
      identifier: modelVisualizationId,
      version: VISUAL_MODEL_VERSION,
      type: LOCAL_VISUAL_MODEL,
      entities: Object.values(visualEntities),
    };

    if (!modelVisualizationResource) {
      await fetch(import.meta.env.VITE_BACKEND + "/resources?parentIri=" + encodeURIComponent(parentIri), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          iri: modelVisualizationId,
          type: LOCAL_VISUAL_MODEL,
          userMetadata: {
            label: {
              cs: "Vygenerovaný autolayout",
              en: "Generated autolayout",
            }
          }
        }),
      });
      await requestLoadPackage(parentIri, true);
    }

    await fetch(import.meta.env.VITE_BACKEND + "/resources/blob?iri=" + encodeURIComponent(modelVisualizationId), {
      method: "PUT",
      headers: {
          "Content-Type": "application/json",
      },
      body: JSON.stringify(visualizationModel),
    });
    setIsLoading(false);
  };

  const name = lng(resource.userMetadata?.description);
  const type = modelTypeToName[resource.types?.[0]];


  useEffect(() => {
    (async () => {
      const configurationData = (await packageService.getResourceJsonData(parentIri)) ?? {};
      const configuration = createDefaultConfigurationModelFromJsonObject(configurationData);
      const layoutConfiguration = createLayoutConfiguration(configuration);
      setConfig(layoutConfiguration);
    })();
  }, []);


  const { getConfig, ConfigDialog, setConfig } = useConfigDialog();

  return (
    <Modal open={isOpen} onClose={() => isLoading ? null : resolve(false)}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Autolayout preview ⚠️Work in progress⚠️</ModalTitle>
          <ModalDescription>
           Launches layout from @dataspecer/layout for <strong>{type}</strong>{name && <> with name <strong>{name}</strong></>}.
            {/* cz: Spustí layout z @dataspecer/layout pro <strong>{type}</strong>{name && <> s názvem <strong>{name}</strong></>}. */}
          </ModalDescription>
        </ModalHeader>
        <ModalBody>
        <hr className="my-2"/>
          <input type="checkbox" id="checkbox-shouldCreateNewModel" name="checkbox-shouldCreateNewModel" checked={shouldCreateNewModel}
                      onChange={(e => setShouldCreateNewModel(e.target.checked))} />
          <label htmlFor="checkbox-shouldCreateNewModel" className="font-black">Create new visual model (If unchecked then last layouted visual model is overridden [i.e. destroyed])
            { /* cz: Vytvoř nový vizuální model (při nezaškrtnutí se přepíše poslední layout model) */}</label>
            <hr className="my-4"/>
          <ConfigDialog></ConfigDialog>
        </ModalBody>
        <ModalFooter>
          <Button variant="default" onClick={execute} disabled={isLoading}>
            {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
            Launch{/* cz: Spustit */}
          </Button>
          <Button variant="outline" onClick={() => resolve(false)} disabled={isLoading}>Close{/* cz: Zavřít */}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
