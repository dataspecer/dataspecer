import { ComboBox } from "@/components/combo-box";
import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { BetterModalProps } from "@/lib/better-modal";
import { ResourceWithIris } from "@/package";
import { MANAGER_PACKAGE_ROOTS } from "@dataspecer/git";
import { useMemo, useState } from "react";


type PackageListDialogProps = {
  resources: Record<string, ResourceWithIris>;
  resourcesFilter: (resourceToFilter: ResourceWithIris) => boolean;
  comboboxEntryTextGetter: (resourceToFilter: ResourceWithIris) => string;
  noEntriesDialogText: string;
  modalTitle: string;
  modalDescription: string;
} & BetterModalProps<{
  chosenPackage: ResourceWithIris;
} | null>;

export const PackageListDialog = ({ modalTitle, modalDescription, resources, comboboxEntryTextGetter, noEntriesDialogText, resourcesFilter, isOpen, resolve }: PackageListDialogProps) => {
  const [chosenPackage, setChosenPackage] = useState<ResourceWithIris | null>(null);

  const comboBoxEntries = useMemo(() => {
    const entries =  Object.entries(resources)
      .map(entry => {
        if (MANAGER_PACKAGE_ROOTS.includes(entry[0])) {
          return null;
        }
        if (!resourcesFilter(entry[1])) {
          return null;
        }

        return {
          key: comboboxEntryTextGetter(entry[1]),
          tooltip: `IRI: ${entry[0]}`,
          value: entry[1],
        };
      })
      .filter(entry => entry !== null);

      if (entries.length > 0) {
        setChosenPackage(entries[0].value);
      }
      return entries;
  }, [resources]);

  const onComboboxChange = (value: ResourceWithIris) => {
    setChosenPackage(value);
  };

  const closeWithChosen = () => {
    if (chosenPackage === null) {
      resolve(null);
      return;
    }
    resolve({ chosenPackage });
  };


  return (
    <Modal open={isOpen} onClose={() => resolve(null)}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>{modalTitle}</ModalTitle>
            <ModalDescription>{modalDescription}</ModalDescription>
          </ModalHeader>

          {
            comboBoxEntries.length === 0 ?
              noEntriesDialogText :
              <ComboBox options={comboBoxEntries} onChange={onComboboxChange} />
          }

          <ModalFooter>
            <Button variant="outline" onClick={() => resolve(null)}>Close</Button>
            {comboBoxEntries.length > 0 && <Button className="hover:bg-purple-700" onClick={closeWithChosen}>Confirm</Button>}
          </ModalFooter>
        </ModalContent>
    </Modal>
  );
};