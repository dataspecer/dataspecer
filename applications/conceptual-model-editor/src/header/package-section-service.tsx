import { useBackendConnection } from "../backend-connection";
import { useOptions } from "../configuration/options";
import { useModelGraphContext } from "../context/model-context";
import { useNotificationServiceWriter } from "../notification";
import { usePackageService } from "../service/package-service-context";
import { getLocalizedStringFromLanguageString } from "../util/language-utils";
import { type Package } from "@dataspecer/core-v2/project";
import { useActions } from "../action/actions-react-binding";
import { packageService } from "@/service/package-service";
import { createDefaultConfigurationModelFromJsonObject } from "@dataspecer/core-v2/configuration-model";
import { useLayoutConfigurationContext } from "@/context/layout-configuration-context";
import { applyLayoutConfiguration } from "@dataspecer/layout";

const MGR_REDIRECT_PATH = import.meta.env.VITE_PUBLIC_MANAGER_PATH;

export interface PackageSectionServiceType {
    packageHasIdentifier: boolean;
    packageLabel: string | null;
    save: () => Promise<void>,
    saveAndClose: () => Promise<void>,
}

export const usePackageSectionService = (): PackageSectionServiceType => {
  const actions = useActions();
  const { updateSemanticModelPackageModels } = useBackendConnection();
  const { models, visualModels, aggregatorView } = useModelGraphContext();
  const { layoutConfiguration } = useLayoutConfigurationContext();

  const { currentPackage, currentPackageIdentifier } = usePackageService();
  const options = useOptions();
  const notifications = useNotificationServiceWriter();

  const saveLayoutConfiguration = async (packageIri: string) => {
    const configurationData = (await packageService.getPackageConfiguration(packageIri)) ?? {};
    const configuration = createDefaultConfigurationModelFromJsonObject(configurationData);
    applyLayoutConfiguration(configuration, layoutConfiguration);
    const result = configuration.serializeModelToApiJsonObject(configurationData);
    await packageService.savePackageConfiguration(packageIri, result);
  };

  const save = async () => {
    if (currentPackageIdentifier === null) {
      return;
    }
    const result = await updateSemanticModelPackageModels(
      currentPackageIdentifier, [...models.values()], [...visualModels.values()]);
    const svg = await actions.diagram?.actions().renderToSvgString();
    const activeVisualModel = aggregatorView.getActiveVisualModel();

    saveLayoutConfiguration(currentPackageIdentifier);

    if (activeVisualModel !== null && svg !== undefined && svg !== null) {
      const iri = encodeURIComponent(activeVisualModel.getIdentifier());
      await fetch((import.meta.env.VITE_PUBLIC_APP_BACKEND ?? "") + "/resources/blob?iri=" + iri + "&name=svg", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ svg: svg }),
      });
    }

    if (result) {
      notifications.success("Package has been saved.");
    } else {
      notifications.error("Can't save the package!");
    }
  };

  const handleSavePackageAndLeave = async () => {
    await save();
    if (!MGR_REDIRECT_PATH) {
      console.error("manager path not set", MGR_REDIRECT_PATH);
      return;
    }
    const a = document.createElement("a");
    a.setAttribute("href", MGR_REDIRECT_PATH);
    a.click();
  };

  const packageLabel = selectPackageName(currentPackage, options.language);

  return {
    packageHasIdentifier: currentPackageIdentifier !== null,
    packageLabel,
    save,
    saveAndClose: handleSavePackageAndLeave,
  };
};

const selectPackageName = (currentPackage: Package | null, language: string): string | null => {
  return getLocalizedStringFromLanguageString(currentPackage?.userMetadata?.label ?? null, language);
};
