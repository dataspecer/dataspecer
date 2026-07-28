import { Modal, ModalBody, ModalContent, ModalHeader, ModalTitle } from "@/components/modal";
import { LoadingButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getCMELink } from "@/known-models";
import { BetterModalProps } from "@/lib/better-modal";
import { packageService } from "@/package";
import { LOCAL_SEMANTIC_MODEL, VISUAL_MODEL } from "@dataspecer/core-v2/model/known-models";
import { generateEntityId, type Entity } from "@dataspecer/core/entity-model";
import { createSetEntityOperation, generateOperationId, type OperationInModel } from "@dataspecer/core/operation";
import { createCreateModelOperation, createCreateProjectOperation } from "@dataspecer/project-model";
import { createSetLabelOperation } from "@dataspecer/visual-model";
import { useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Model id the backend uses to address operations that change the project
 * structure itself (creating/removing models), as opposed to a specific
 * model's own content.
 */
const PROJECT_MODEL_ID = "_project_model";

/**
 * Creates a new project for a vocabulary with a semantic model and a view.
 * The location of a project is fixed, hence the parent package is not used.
 */
export const Vocabulary = ({ isOpen, resolve }: { iri: string } & BetterModalProps<boolean>) => {
  const {t, i18n} = useTranslation();
  const [loading, setLoading] = useState(false);

  const formSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setLoading(true);

    try {
      const name = (event.target as any)["name"].value;
      const description = (event.target as any)["description"].value;
      const baseIri = (event.target as any)["base-url"].value;

      //

      const projectId = generateEntityId();

      const createProject = createCreateProjectOperation(projectId);
      createProject.label = {[i18n.language]: name};
      createProject.description = {[i18n.language]: description};

      const createSemanticModel = createCreateModelOperation(projectId, LOCAL_SEMANTIC_MODEL);
      createSemanticModel.label = {en: name};
      createSemanticModel.description = {en: "Semantic model for the vocabulary"};

      const createVisualModel = createCreateModelOperation(projectId, VISUAL_MODEL);
      createVisualModel.label = {en: "Main view"};
      createVisualModel.description = {en: "View model for the vocabulary"};

      // The models and their initial content are created by a single transaction.
      const operations: OperationInModel[] = [
        { modelId: PROJECT_MODEL_ID, operation: createProject },
        { modelId: PROJECT_MODEL_ID, operation: createSemanticModel },
        { modelId: PROJECT_MODEL_ID, operation: createVisualModel },
        {
          modelId: createSemanticModel.modelId,
          operation: createSetEntityOperation({
            id: createSemanticModel.modelId,
            type: [LOCAL_SEMANTIC_MODEL],
            modelAlias: name,
            baseIri,
          } as Entity),
        },
        {
          modelId: createVisualModel.modelId,
          operation: createSetLabelOperation({en: "Main view"}),
        },
      ];

      await packageService.applyTransactions(projectId, [{ id: generateOperationId(), operations }]);

      // Redirect to url
      window.location.href = getCMELink(projectId, createVisualModel.modelId);

      // Never resolve as we need to redirect!
      // resolve(true);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  }

  return (
    <Modal open={isOpen} onOpenChange={(value: boolean) => value ? null : resolve(false)}>
      <ModalContent className="max-w-lg">
        <ModalHeader>
          <ModalTitle>{t("project-wizard:projects.vocabulary.create-title")}</ModalTitle>
        </ModalHeader>
        <ModalBody className="mt-auto flex flex-col gap-2 p-4">
          <form className="grid gap-4" onSubmit={formSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="name">{t("form.name.name")}<span className="text-red-500">*</span></Label>
              <Input id="name" placeholder={t("form.name.instruction")} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">{t("form.description.name")}</Label>
              <Textarea id="description" placeholder={t("form.description.instruction")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="base-url">{t("form.base-iri.name")}</Label>
              <Input id="base-url" placeholder={t("form.base-iri.instruction")} defaultValue="https://example.com/vocabulary#" />
            </div>
            {/* <div className="grid gap-2">
              <Label htmlFor="documentation-url">{t("form.documentation-base-url.name")}</Label>
              <Input id="documentation-url" placeholder={t("form.documentation-base-url.instruction")} defaultValue="https://example.com/" />
            </div> */}
            {/* <div className="grid gap-2">
              <Label htmlFor="authors">{t("form.authors.name")}</Label>
              <Textarea id="authors" placeholder={t("form.authors.instruction")} />
            </div> */}
            <LoadingButton type="submit" loading={loading}>{t("form.create-button.name")}</LoadingButton>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};