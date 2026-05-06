import { Modal, ModalContent, ModalDescription, ModalHeader, ModalTitle } from "@/components/modal";
import { PopOverGitGeneralComponent } from "@/components/popover-git-general";
import { Button } from "@/components/ui/button";
import { BetterModalProps } from "@/lib/better-modal";
import { ScopeGroup } from "@dataspecer/auth";
import { useTranslation } from "react-i18next";
import { EyeIcon, LogIn } from "lucide-react";


/**
 * Handles the advanced shigned in. Lot of tooltips and lets the user choose the scopes (rights) to provide to Dataspecer within the OAuth.
 */
function SignInInfoTooltipAdvanced() {
  const { t } = useTranslation();

  return <PopOverGitGeneralComponent>
      <div>
        <div>- {t("sign-in-dialog.tooltip.line-one.part-one")} <strong>{t("sign-in-dialog.tooltip.line-one.part-two")}</strong>.</div>
        <div>- {t("sign-in-dialog.tooltip.line-two")}</div>
        <br/>
        <h1 className="text-2xl font-bold">{t("sign-in-dialog.tooltip.short-title")}</h1>
        <div className="flex flex-1 flex-row">
          - {t("sign-in-dialog.tooltip.short-line-one.part-one")}&nbsp;<strong>{t("sign-in-dialog.tooltip.short-line-one.part-two")}</strong>&nbsp;{t("sign-in-dialog.tooltip.short-line-one.part-three")} "<EyeIcon/>" {t("sign-in-dialog.tooltip.short-line-one.part-four")}
        </div>
        <div>
          - {t("sign-in-dialog.tooltip.short-line-two.part-one")} <strong>{t("sign-in-dialog.tooltip.short-line-two.part-two")}</strong> {t("sign-in-dialog.tooltip.short-line-two.part-three")} <strong className="text-green-600">{t("sign-in-dialog.tooltip.short-line-two.part-four")}</strong>
        </div>
        <div>
          - {t("sign-in-dialog.tooltip.short-line-three.part-one")} <strong>{t("sign-in-dialog.tooltip.short-line-three.part-two")}</strong> {t("sign-in-dialog.tooltip.short-line-three.part-three")}
        </div>

        <br/>
        <h1 className="text-2xl font-bold">{t("sign-in-dialog.tooltip.long-title")}</h1>
        <div>
          - {t("sign-in-dialog.tooltip.long-line-one.part-one")} <strong>{t("sign-in-dialog.tooltip.long-line-one.part-two")}</strong> {t("sign-in-dialog.tooltip.long-line-one.part-three")} <strong>{t("sign-in-dialog.tooltip.long-line-one.part-four")}</strong> {t("sign-in-dialog.tooltip.long-line-one.part-five")} <strong>{t("sign-in-dialog.tooltip.long-line-one.part-six")}</strong> {t("sign-in-dialog.tooltip.long-line-one.part-seven")}
        </div>
        <div>
          - {t("sign-in-dialog.tooltip.long-line-two.part-one")} <strong>{t("sign-in-dialog.tooltip.long-line-two.part-two")}</strong> {t("sign-in-dialog.tooltip.long-line-two.part-three")}
        </div>
        <div>
          &nbsp;&nbsp;&nbsp;{t("sign-in-dialog.tooltip.long-line-three")}
        </div>
        <div>
        </div>
        <div>
          - {t("sign-in-dialog.tooltip.long-line-four.part-one")} <strong>{t("sign-in-dialog.tooltip.long-line-four.part-two")}</strong> {t("sign-in-dialog.tooltip.long-line-four.part-three")}
          <br/>
          &nbsp;&nbsp;&nbsp;- {t("sign-in-dialog.tooltip.long-subline-one")}
          <br/>
          &nbsp;&nbsp;&nbsp;- {t("sign-in-dialog.tooltip.long-subline-two")}
          <br/>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{t("sign-in-dialog.tooltip.long-subline-three")}
          <br/>
          &nbsp;&nbsp;&nbsp;- {t("sign-in-dialog.tooltip.long-subline-four")}
        </div>
        <br/>
        <div>
          - {t("sign-in-dialog.tooltip.long-line-five")}
          <br/>
          &nbsp;&nbsp;&nbsp;{t("sign-in-dialog.tooltip.long-line-six")}
        </div>
      </div>
    </PopOverGitGeneralComponent>;
}

export const SignInDialog = ({ isOpen, resolve }: BetterModalProps) => {
  const { t } = useTranslation();

  return (
    <Modal open={isOpen} onClose={() => resolve()}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>
            <div className="flex flex-1 flex-row">
               <LogIn className="mr-1 pb-1"/> {t("sign-in-dialog.title")} <SignInInfoTooltipAdvanced/>
            </div>
          </ModalTitle>
        </ModalHeader>
        <ModalDescription>
          <p>
            - {t("sign-in-dialog.description.line-one.part-one")} <strong>{t("sign-in-dialog.description.line-one.part-two")}</strong> {t("sign-in-dialog.description.line-one.part-three")} <strong>{t("sign-in-dialog.description.line-one.part-four")}</strong>.
            <br/>
            - {t("sign-in-dialog.description.line-two.part-one")} <strong>{t("sign-in-dialog.description.line-two.part-two")}</strong> {t("sign-in-dialog.description.line-two.part-three")}
            <br/>
            - {t("sign-in-dialog.description.line-three")}
            <br/>
            - {t("sign-in-dialog.description.line-four")}
          </p>
        </ModalDescription>
        <div className="flex flex-col max-w-md">
            <Button variant="outline" className="cursor-pointer focus:outline-none border border-black bg-green-100 hover:bg-green-400 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700" onClick={(_) => goToPage(`${import.meta.env.VITE_BACKEND}/auth/signin?authPermissions=${ScopeGroup[ScopeGroup.LoginInfo]}`)}>
              {t("sign-in-dialog.buttons.login-info")}
            </Button>
            <Button variant="outline" className="cursor-pointer focus:outline-none border border-black bg-green-100 hover:bg-green-400 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700" onClick={(_) => goToPage(`${import.meta.env.VITE_BACKEND}/auth/signin?authPermissions=${ScopeGroup[ScopeGroup.FullPublicRepoControl]}`)}>
              {t("sign-in-dialog.buttons.full-public-repo-control")}
            </Button>
            <Button variant="outline" className="cursor-pointer focus:outline-none border border-black bg-green-100 hover:bg-green-400 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700" onClick={(_) => goToPage(`${import.meta.env.VITE_BACKEND}/auth/signin?authPermissions=${ScopeGroup[ScopeGroup.DeleteRepoControl]}`)}>
              {t("sign-in-dialog.buttons.delete-repo-control")}
            </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}

export function goToPage(url: string) {
  window.location.href = url;
}

export function createNewTabAndOpen(url: string) {
  window.open(url, '_blank');
}
