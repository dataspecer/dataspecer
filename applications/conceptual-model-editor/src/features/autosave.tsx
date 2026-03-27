import { useEffect, useState } from "react";
import { useBackendConnection } from "../backend-connection";
import { ExportButton } from "../components/management/buttons/export-button";
import { useModelGraphContext } from "../context/model-context";
import { useQueryParamsContext } from "../context/query-params-context";

const AUTOSAVE_INTERVAL = parseInt(import.meta.env.VITE_PUBLIC_APP_AUTOSAVE_INTERVAL_MS ?? "30000") || 30000;

const AUTOSAVE_ENABLED_BY_DEFAULT = false;

export const useAutoSave = () => {
  const { models, visualModels } = useModelGraphContext();
  const { packageId } = useQueryParamsContext();

  const { updateSemanticModelPackageModels } = useBackendConnection();
  const [autosaveActive, setAutosaveActive] = useState(AUTOSAVE_ENABLED_BY_DEFAULT);
  const [autosaveInterval, setAutosaveInterval] = useState<number | null>(null);
  const [autosaveButtonLabel, setAutosaveButtonLabel] = useState(getAutosaveLabel(AUTOSAVE_ENABLED_BY_DEFAULT));

  useEffect(() => {

    // We create the handler here to emphasize that it captures the
    // same variables as the callback. The reason is that since we allow
    // autoload from the start, models, visualModels may change later.
    const handleAutoSavePackage = () => {
      // TODO This method is disabled for safety.
      // Using 1 === 1 to not trigger inaccessible code warning.
      // eslint-disable-next-line no-constant-condition
      if (1 === 1) {
        return;
      }

      if (!packageId) {
        return;
      }
      updateSemanticModelPackageModels(packageId, [...models.values()], [...visualModels.values()])
        .then(status => {
          setAutosaveButtonLabel(`... ${status ? "success" : "fail"}`);
          // Keep the label for some time and then return back.
          setTimeout(() => setAutosaveButtonLabel(getAutosaveLabel(autosaveActive)), 750);
        })
        .catch(console.error);
    };

    setAutosaveButtonLabel(getAutosaveLabel(autosaveActive));

    if (!autosaveActive) {
      clearInterval(autosaveInterval ?? undefined);
      setAutosaveInterval(null);
      return;
    }
    handleAutoSavePackage();

    // Unregister so we do not register twice.
    clearInterval(autosaveInterval ?? undefined);
    const timeout = setInterval(() => handleAutoSavePackage(), AUTOSAVE_INTERVAL);
    setAutosaveInterval(timeout);

    // We can not list all properties (autosaveInterval) as this would cycle since
    // we set the value in this function.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autosaveActive, models, visualModels]);

  let autosaveButtonTitle: string;
  if (!packageId) {
    autosaveButtonTitle =
            "you can only use autosave when you are inside a package\ngo to /manager and start from there";
  } else if (autosaveActive) {
    autosaveButtonTitle = "autosave: active, stop autosave";
  } else {
    autosaveButtonTitle = "autosave: inactive, start autosave";
  }

  const AutoSaveButton = () => {
    return (
      <ExportButton
        title={autosaveButtonTitle}
        onClick={() => setAutosaveActive((prev) => !prev)}
        disabled={!packageId}
        withDisabledHelpCursor={true}
      >
        {autosaveButtonLabel}
      </ExportButton>
    );
  };

  return {
    isAutoSaveActive: autosaveActive,
    AutoSaveButton,
  };
};

const getAutosaveLabel = (active: boolean) => {
  if (active) {
    return "🟢autosave";
  }
  return "🔴autosave";
};

