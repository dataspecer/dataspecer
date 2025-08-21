import { BetterModalProps, } from "@/lib/better-modal";
import { useLayoutEffect, useState } from "react";
import { Package } from "@dataspecer/core-v2/project";
import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { modifyPackageProjectData, requestLoadPackage } from "@/package";
import { createIdentifierForHTMLElement, InputComponent } from "@/components/simple-input-component";

type SetProjectIriAndBranchDialogProps = {
  examinedPackage: Package,
} & BetterModalProps<{
  newBranch: string,
  newProjectIri: string,
} | null>;

const idPrefix = "setProjectIriAndBranchDialog";

export const setProjectIriAndBranchDialog = ({ examinedPackage, isOpen, resolve }: SetProjectIriAndBranchDialogProps) => {
  const [branch, setBranch] = useState<string>(examinedPackage.branch);
  const [projectIri, setProjectIri] = useState<string>(examinedPackage.projectIri);

  useLayoutEffect(() => {
    if (isOpen) {
      window.requestAnimationFrame(() => document.getElementById(createIdentifierForHTMLElement(idPrefix, 0, "input"))?.focus());
    }
  }, []);



  const handleDialogSave = async () => {
    await modifyPackageProjectData(examinedPackage.iri, projectIri, branch);
    await requestLoadPackage(examinedPackage.iri, true);
    resolve({ newBranch: branch, newProjectIri: projectIri });
  };
  const handleDialogCloseWithoutSave = () => {
    resolve(null);
  };

  return (
    <Modal open={isOpen} onClose={() => resolve(null)}>
      <ModalHeader>
        <ModalTitle>Perform action on git commit</ModalTitle>
        <ModalDescription>
          TODO RadStr: Set Modal description
        </ModalDescription>
      </ModalHeader>
        <ModalContent>
          <InputComponent idPrefix={idPrefix} idSuffix={0} label="Set branch" input={branch} setInput={setBranch} />
          <InputComponent idPrefix={idPrefix} idSuffix={1} label="Set project iri" input={projectIri} setInput={setProjectIri} />
          <ModalFooter>
            <Button variant="outline" onClick={handleDialogCloseWithoutSave}>Close</Button>
            <Button variant="outline" onClick={handleDialogSave}>Confirm</Button>
          </ModalFooter>
        </ModalContent>
    </Modal>
  );
}