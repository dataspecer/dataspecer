import { ExportFormatRadioButtons } from "@/components/export-format-radio-buttons";
import { Modal, ModalBody, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { BetterModalProps } from "@/lib/better-modal";
import { createSetterWithGitValidation, ExportFormatType, getGitRemoteConfigurationModelFromPackage, GitRemoteConfigurations, saveGitRemoteConfiguration } from "@dataspecer/git";
import { resolveWithRequiredCheck, SetGitConfigurationReactStateType, setGitRemoteConfigurationStatePart } from "./git-actions-dialogs";
import { InputComponent } from "@/components/simple-input-component";
import { RefObject, useEffect, useState } from "react";
import { Package } from "@dataspecer/core-v2/project";
import { useRequiredFieldsForGitConfig } from "@/hooks/use-required-fields-for-git-config";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { requestLoadPackage } from "@/package";

export type RequiredFieldsPartialMap = Partial<Record<keyof GitRemoteConfigurations, RefObject<HTMLInputElement | null>>>;

type SetGitRemoteConfigurationComponentProps = {
  configuration: GitRemoteConfigurations;
  setGitConfigurationReactState: SetGitConfigurationReactStateType;
  requiredFieldsMap: RequiredFieldsPartialMap;
};

type SetGitRemoteConfigurationDialogProps = {
  inputPackage: Package;
} & BetterModalProps<null>;


export function SetGitRemoteConfigurationDialog({ inputPackage, isOpen, resolve }: SetGitRemoteConfigurationDialogProps) {
  const [rootPackageContent, setRootPackageContent] = useState<any>();
  const [gitRemoteConfiguration, setGitRemoteConfiguration] = useState<GitRemoteConfigurations | null>(null);
  const { t } = useTranslation();

  const { requiredGitConfigFieldsMap } = useRequiredFieldsForGitConfig();

  // TODO RadStr: Once again everything is kind of copy-pasted - refactor in the following commits
  const tryCloseWithSuccess = () => {
    const resolveAsNoParamsMethod = async () => {
      resolve(null);

      // TODO RadStr: It is kind of weird that there is no exported method with this functionality yet.
      const storeModelToBackend = async (iri: string, newPackageContent: object) => {
        await fetch(import.meta.env.VITE_BACKEND + "/resources/blob?iri=" + encodeURIComponent(iri), {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newPackageContent),
        });
        toast(t("successfully saved"));
      };
      await saveGitRemoteConfiguration(inputPackage.iri, rootPackageContent, gitRemoteConfiguration, storeModelToBackend);
      await requestLoadPackage(inputPackage.iri, true);
    };

    resolveWithRequiredCheck(resolveAsNoParamsMethod, ...Object.values(requiredGitConfigFieldsMap));
  };

  useEffect(() => {
    const setGitRemoteConfigurationState = async () => {
      // For the commits (and creating of repo) we will pass in the exportFormat directly, instead of retrieving it again on server.
      // const isGitDialogSettingGitConfiguration = type !== "link-to-existing-repository";     // TODO RadStr: Except for this it is the same - we can use hook probably
      const rootPackageFetchResponse = await fetch(import.meta.env.VITE_BACKEND + "/resources/blob?iri=" + encodeURIComponent(inputPackage.iri));
      const rootPackageFetchedContent = await rootPackageFetchResponse.json();
      // const fetchedGitRemoteConfiguration = isGitDialogSettingGitConfiguration ? await getGitRemoteConfigurationModelFromPackage(rootPackageFetchedContent) : null;
      const fetchedGitRemoteConfiguration = await getGitRemoteConfigurationModelFromPackage(rootPackageFetchedContent);
      setRootPackageContent(rootPackageFetchedContent);
      setGitRemoteConfiguration(fetchedGitRemoteConfiguration);
    };
    setGitRemoteConfigurationState();
  }, [inputPackage]);

  if (gitRemoteConfiguration === null) {
    return null;
  }

  return (
    <Modal open={isOpen} onClose={() => resolve(null)}>
      <ModalContent className="sm:max-w-[700px]!">
        <ModalHeader>
          <ModalTitle>Set new Git configuration</ModalTitle>
          <ModalDescription>
            Note that the values after opening the dialogs are the current ones.
          </ModalDescription>
        </ModalHeader>
        <ModalBody>
          <SetGitRemoteConfigurationComponent configuration={gitRemoteConfiguration} setGitConfigurationReactState={setGitRemoteConfiguration} requiredFieldsMap={requiredGitConfigFieldsMap}/>
        </ModalBody>
        <ModalFooter className="flex flex-row">
          <Button variant="outline" onClick={() => resolve(null)}>Cancel</Button>
          <Button variant="default" className="hover:bg-purple-700" onClick={tryCloseWithSuccess}>Confirm</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

const gitRemoteConfigurationIdPrefix = "sgrcc"

/**
 * @todo This component can be much more general in future - basically define the names of fields and their values and then just generate.
 *  Therefore, we would not need to touch this component at all when introducing new types.
 * But since we have currently only 2 values and we have no idea what might be the future ones, we will just keep it "hardcoded"
 */
export function SetGitRemoteConfigurationComponent({ configuration, requiredFieldsMap, setGitConfigurationReactState }: SetGitRemoteConfigurationComponentProps) {
  const { t } = useTranslation();
  let suffixNumber: number = 0;

  const setPublicationBranchInConfig = (newPublicationBranch: string) => {
    setGitRemoteConfigurationStatePart(setGitConfigurationReactState, "publicationBranch", newPublicationBranch);
  };

  const setExportFormatInConfig = (newExportFormat: ExportFormatType) => {
    setGitRemoteConfigurationStatePart(setGitConfigurationReactState, "exportFormat", newExportFormat);
  };


  return <div>
    <InputComponent
      idPrefix={gitRemoteConfigurationIdPrefix}
      idSuffix={suffixNumber++}
      label={t("git.configuration.publication-branch.title")}
      tooltip={t("git.configuration.publication-branch.tooltip")}
      setInput={createSetterWithGitValidation(setPublicationBranchInConfig)} input={configuration.publicationBranch}
      requiredRefObject={requiredFieldsMap["publicationBranch"]}
    />
    <ExportFormatRadioButtons exportFormat={configuration.exportFormat} setExportFormat={setExportFormatInConfig} />
  </div>;
}
