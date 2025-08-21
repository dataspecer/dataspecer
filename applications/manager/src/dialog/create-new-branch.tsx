import { BetterModalProps, } from "@/lib/better-modal";
import { useContext, useLayoutEffect, useState } from "react";
import { Package } from "@dataspecer/core-v2/project";
import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { modifyPackageProjectData, packageService, requestLoadPackage, ResourcesContext } from "@/package";
import { createIdentifierForHTMLElement, InputComponent } from "@/components/simple-input-component";
import { toast } from "sonner";

type SetProjectIriAndBranchDialogProps = {
  sourcePackage: Package,
} & BetterModalProps<{
  newBranch: string,
} | null>;

const idPrefix = "createNewbranch";
// TODO RadStr: Well not really on me, but I would put the rootURL into some exported variable.
const rootURL = "http://dataspecer.com/packages/local-root";


export const CreateNewBranchDialog = ({ sourcePackage, isOpen, resolve }: SetProjectIriAndBranchDialogProps) => {
  const [branch, setBranch] = useState<string>(sourcePackage.branch);

  useLayoutEffect(() => {
    if (isOpen) {
      window.requestAnimationFrame(() => document.getElementById(createIdentifierForHTMLElement(idPrefix, 0, "input"))?.focus());
    }
  }, []);


  const existingResources = useContext(ResourcesContext);

  const handleDialogSave = async () => {
    const existingPackagesForProject = Object.values(existingResources).filter(existingResource => existingResource?.projectIri === sourcePackage.projectIri);
    const existingBranchesForProject = existingPackagesForProject.map(p => p?.branch);
    const branchAlreadyExists = existingBranchesForProject.includes(branch);

    if (branch === "") {
      // TODO RadStr: Localization
      toast.error("Given branch name is empty");
      resolve(null);
      return;
    }
    else if (branchAlreadyExists) {
      // TODO RadStr: Localization
      toast.error("Branch already exists");
      resolve(null);
      return;
    }

    const response = await packageService.copyRecursively(sourcePackage.iri, rootURL);
    console.info("Created resource response:", { response });
    const newRootIri: string | undefined = response?.newRootIri;
    if (newRootIri === undefined) {
      return;
    }
    await modifyPackageProjectData(newRootIri, sourcePackage.projectIri, branch);
    await requestLoadPackage(rootURL, true);
    resolve({ newBranch: branch, });
  };
  const handleDialogCloseWithoutSave = () => {
    resolve(null);
  };

  return (
    <Modal open={isOpen} onClose={() => resolve(null)}>
      <ModalHeader>
        <ModalTitle>Create new branch in project (Project name: {sourcePackage.projectIri})</ModalTitle>
        <ModalDescription>
          TODO RadStr: Set Modal description
        </ModalDescription>
      </ModalHeader>
        <ModalContent>
          <InputComponent idPrefix={idPrefix} idSuffix={0} label="Set branch name" input={branch} setInput={setBranch} />
          <ModalFooter>
            <Button variant="outline" onClick={handleDialogCloseWithoutSave}>Close</Button>
            <Button variant="outline" onClick={handleDialogSave}>Confirm</Button>
          </ModalFooter>
        </ModalContent>
    </Modal>
  );
}