import { lng } from "@/Dir";
import { Modal, ModalBody, ModalContent, ModalDescription, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { ModelIcon, createModelInstructions, modelTypeToName } from "@/known-models";
import { BetterModalProps, useBetterModal } from "@/lib/better-modal";
import { ResourcesContext } from "@/package";
import { useContext } from "react";
import { RenameResourceDialog } from "./rename-resource";

export const CreateNew = ({ isOpen, resolve, iri }: { iri: string } & BetterModalProps) => {
  const resource = useContext(ResourcesContext)[iri]!;
  const openModal = useBetterModal();

  const selectModel = async (type: string) => {
    let names = null;
    if (createModelInstructions[type!].needsNaming) {
      names = await openModal(RenameResourceDialog, {type: "create"});
      if (!names) return;
    }

    await createModelInstructions[type!].createHook({
      iri: "",
      parentIri: iri,
      modelType: type!,
      label: names?.name,
      description: names?.description,
    });

    resolve();
  }

  return (
    <Modal open={isOpen} onOpenChange={(value: boolean) => value ? null : resolve()}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Create new</ModalTitle>
          <ModalDescription>
            Create a new package/model under <i>{lng(resource.userMetadata?.label) ?? modelTypeToName[resource.types?.[0]]}</i>.
          </ModalDescription>
        </ModalHeader>
          <ModalBody className="mt-auto flex flex-col gap-2 p-4">
            {Object.keys(createModelInstructions).map(modelType => <Button onClick={() => selectModel(modelType)} variant={"outline"} key={modelType}><ModelIcon type={[modelType]} className="mr-2 h-4 w-4" /> {modelTypeToName[modelType]}</Button>)}
          </ModalBody>
      </ModalContent>
    </Modal>
  );
};