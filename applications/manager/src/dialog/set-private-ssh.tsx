import { Modal, ModalBody, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BetterModalProps } from "@/lib/better-modal";
import { GitProviderNamesAsType } from "@dataspecer/git";
import { FormEventHandler, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

type SetPrivateSSHKeyDialogProps = BetterModalProps<null>;

/**
 * Experimental component for handling setting of private SSH key.
 * Why experimental? Well now it has hardcoded GitHub as the provider which uses the key.
 * However, in future it makes sense to just set multiple keys and for each decide to which git provider it belongs (note that one key can be used for multiple providers).
 * That is the reason why it is hardcoded now, since we can not tell how it should exactly work in future and where to store the SSH keys due to security concerns.
 */
export default function SetPrivateSSHKeyDialog({ isOpen, resolve }: SetPrivateSSHKeyDialogProps) {
  const { t } = useTranslation();
  const [privateSSHKey, setPrivateSSHKey] = useState<string>("");

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();

    try {
      const gitProviderLowercase: GitProviderNamesAsType = "github";  // !! Hardcoded

      const response = await fetch(import.meta.env.VITE_BACKEND + "/git/set-private-ssh-key", {
        method: "POST",
        credentials: "include",   // We have to include them since we store it under user
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          privateSSHKey,
          gitProviderLowercase,  // !! Hardcoded
        }),
      });

      if (!response.ok) {
        throw new Error("Server error" + response);
      }

      toast.success(t("set-private-ssh-dialog.success-toast"));
    }
    catch (error) {
      console.error(error);
      toast.error(t("set-private-ssh-dialog.error-toast"), { "richColors": true });
    }
    finally {
      resolve(null);
    }
  };

  return (
    <Modal open={isOpen} onClose={() => resolve(null)}>
      <ModalContent className="sm:max-w-[700px]!">
        <ModalHeader>
          <ModalTitle>{t("set-private-ssh-dialog.title")}</ModalTitle>
          <ModalDescription>
            {t("set-private-ssh-dialog.description.line-1")}
            <br/>
            <br/>
            {t("set-private-ssh-dialog.description.line-2")}
            <ul>
              <li>- {t("set-private-ssh-dialog.rules.rule-1")}</li>
            </ul>
            <ul>
              <li>- {t("set-private-ssh-dialog.rules.rule-2")}</li>
            </ul>
            <ul>
              <li>- {t("set-private-ssh-dialog.rules.rule-3")}</li>
            </ul>
          </ModalDescription>
        </ModalHeader>
        <ModalBody>
          <form id="send-private-ssh-key-form" onSubmit={handleSubmit} >
            <Input
              type="password"
              className="w-full grow"
              value={privateSSHKey}
              onChange={(e) => setPrivateSSHKey(e.target.value)}
              placeholder={t("set-private-ssh-dialog.input-placeholder")}
              required />
          </form>
        </ModalBody>
        <ModalFooter className="flex flex-row">
          <Button variant="outline" onClick={() => resolve(null)}>{t("close")}</Button>
          <Button type="submit" className="hover:bg-purple-700" form="send-private-ssh-key-form" disabled={privateSSHKey === ""}>{t("confirm")}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
