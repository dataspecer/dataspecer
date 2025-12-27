import { Modal, ModalBody, ModalContent, ModalHeader, ModalTitle } from "@/components/modal";
import { BetterModalProps, useBetterModal } from "@/lib/better-modal";
import { useTranslation } from "react-i18next";
import { Profile } from "./profile";
import { Schema } from "./schema";
import { Vocabulary } from "./vocabulary";


export const ProjectWizard = ({ isOpen, resolve, iri }: { iri: string } & BetterModalProps) => {
  const {t} = useTranslation("project-wizard");
  const openModal = useBetterModal();

  const createVocabulary = async () => {
    if (await openModal(Vocabulary, {iri})) {
      resolve();
    }
  }

  const createProfile = async () => {
    if (await openModal(Profile, {iri})) {
      resolve();
    }
  }

  const createSchema = async () => {
    if (await openModal(Schema, {iri})) {
      resolve();
    }
  }

  return (
    <Modal open={isOpen} onOpenChange={(value: boolean) => value ? null : resolve()}>
      <ModalContent className="max-w-5xl">
        <ModalHeader>
          <ModalTitle>{t("start-new-project")}</ModalTitle>
        </ModalHeader>
        <ModalBody className="mt-auto flex flex-col gap-2 p-4">

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4 my-6">
          <button className="group cursor-pointer rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800" onClick={createVocabulary}>
            <div className="hidden md:block relative aspect-[4/3] bg-gray-100 dark:bg-stone-900/20 group-hover:opacity-80 transition-opacity p-10 -z-10">
              <img src="../../graphics/undraw_project_team_lc5a_dark.svg" alt="Template 1" className="object-cover hidden dark:block" />
              <img src="../../graphics/undraw_project_team_lc5a.svg" alt="Template 1" className="object-cover dark:hidden" />
            </div>
            <div className="p-4 space-y-2">
              <h4 className="font-semibold">{t("projects.vocabulary.title")}</h4>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {t("projects.vocabulary.description")}
              </p>
            </div>
          </button>
          <button className="group cursor-pointer rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800" onClick={createProfile}>
            <div className="hidden md:block relative aspect-[4/3] bg-gray-100 dark:bg-stone-900/20 group-hover:opacity-80 transition-opacity p-10 -z-10">
              <img src="../../graphics/undraw_solution_mindset_re_57bf_dark.svg" alt="Template 2" className="object-cover hidden dark:block" />
              <img src="../../graphics/undraw_solution_mindset_re_57bf.svg" alt="Template 2" className="object-cover dark:hidden" />
            </div>
            <div className="p-4 space-y-2">
              <h4 className="font-semibold">{t("projects.application-profile.title")}</h4>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {t("projects.application-profile.description")}
              </p>
            </div>
          </button>
          <button className="group cursor-pointer rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800" onClick={createSchema}>
            <div className="hidden md:block relative aspect-[4/3] bg-gray-100 dark:bg-stone-900/20 group-hover:opacity-80 transition-opacity p-10 -z-10">
              <img src="../../graphics/undraw_code_review_re_woeb_dark.svg" alt="Template 3" className="object-cover hidden dark:block" />
              <img src="../../graphics/undraw_code_review_re_woeb.svg" alt="Template 3" className="object-cover dark:hidden" />
            </div>
            <div className="p-4 space-y-2">
              <h4 className="font-semibold">{t("projects.data-schema.title")}</h4>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {t("projects.data-schema.description")}
              </p>
            </div>
          </button>
        </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
