import { mergeResolverStrategies, MergeResolverStrategy } from "@dataspecer/git";
import { Button } from "./ui/button";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BetterModalProps, useBetterModal } from "@/lib/better-modal";
import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "./modal";
import { ComboBox } from "./combo-box";


export enum ModelsToResolve {
  OpenedModel,
  AllModels,
}


// Improve the styling (margins and size) using Microsoft Copilot, that is why it is set in a "weird" way using join
/**
 * The thing seen at the top of the diff editor. It lets user to choose the merge strategy through combo box and click button that applies it.
 *  Respectively, the button opens another dialog where user chooses further conditions which should be used within the resolving.
 *  Currently, it lets user choose whether they want to apply it only to the currently opened model or all of them.
 */
export const MergeStrategyComponent = (props: {
  handleMergeStateResolving: (mergeStrategy: MergeResolverStrategy, modelsToResolve: ModelsToResolve) => void;
}) => {
  const { t } = useTranslation();
  const [mergeStrategy, setMergeStrategy] = useState<MergeResolverStrategy>(mergeResolverStrategies[0]);
  const openModal = useBetterModal();

  const resolveUsingMergeStrategy = async () => {
    const modelsToResolve = await openModal(ChooseAffectedModels, {});
    if (modelsToResolve === null) {
      return;
    }
    props.handleMergeStateResolving(mergeStrategy, modelsToResolve);
  };

  return (
    <div className="flex flex-row items-center gap-x-3 pt-0.75 pb-1.5">
      <select
        id="merge-strategy-select"
        className={[
          // compact height + predictable box model
          "h-9 box-border px-4 py-1.5",
          // typography: keep enough line-height for descenders
          "text-sm leading-5 text-gray-900",
          // visuals
          "bg-gray-50 border border-gray-300 rounded",
          "shadow-[inset_1px_1px_0_#fff]",
          // focus
          "focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500",
          // native arrow retained (safer cross-browser)
          "appearance-auto"
        ].join(" ")}
        value={mergeStrategy.getKey()}
        onChange={(event) =>
          setMergeStrategy(
            mergeResolverStrategies.find(
              (strategy) => strategy.getKey() === event.target.value
            )!
          )
        }
      >
        {mergeResolverStrategies.map((strategy) => (
          <option key={strategy.getKey()} value={strategy.getKey()}>
            {strategy.getLabel()}
          </option>
        ))}
      </select>

      <Button
        onClick={resolveUsingMergeStrategy}
        className="h-9 px-3 bg-blue-500 hover:bg-blue-600 text-white rounded"
      >
        {t("merge-strategy-component.resolve-button")}
      </Button>
    </div>
  );
};


type ChooseAffectedModelsProps = BetterModalProps<ModelsToResolve | null>;

export const ChooseAffectedModels = ({ isOpen, resolve }: ChooseAffectedModelsProps) => {
  const { t } = useTranslation();
  const [affectedModels, setAffectedModels] = useState<ModelsToResolve>(ModelsToResolve.OpenedModel);
  const comboBoxOptions = [
    { key: t("merge-strategy-component.options.only-current-datastore"), value: ModelsToResolve.OpenedModel },
    { key: t("merge-strategy-component.options.all-datastores"), value: ModelsToResolve.AllModels },
  ];

  return (
    <Modal open={isOpen} onClose={() => resolve(null)}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>{t("merge-strategy-component.modal-title")}</ModalTitle>
            <ModalDescription>
              {t("merge-strategy-component.modal-description")}
              <br />
              {t("merge-strategy-component.modal-warning")}
            </ModalDescription>
          </ModalHeader>

          <ComboBox options={comboBoxOptions} onChange={(selected: ModelsToResolve) => setAffectedModels(selected)}/>

          <ModalFooter>
            <Button variant="outline" onClick={() => resolve(null)}>{t("close")}</Button>
            <Button className="hover:bg-purple-700" onClick={() => resolve(affectedModels)}>{t("confirm")}</Button>
          </ModalFooter>
        </ModalContent>
    </Modal>
  );
}
