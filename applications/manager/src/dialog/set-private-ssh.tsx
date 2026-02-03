import { Modal, ModalBody, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { BetterModalProps } from "@/lib/better-modal";
import { GitProviderNamesAsType } from "@dataspecer/git";
import { FormEventHandler, useState } from "react";
import { toast } from "sonner";

type SetPrivateSSHKeyDialogProps = BetterModalProps<null>;

/**
 * Experimental component for handling setting of private SSH key.
 * Why experimental? Well now it has hardcoded GitHub as the provider which uses the key.
 * However, in future it makes sense to just set multiple keys and for each decide to which git provider it belongs (note that one key can be used for multiple providers).
 * That is the reason why it is hardcoded now, since we can not tell how it should exactly work in future and where to store the SSH keys due to security concerns.
 */
export default function SetPrivateSSHKeyDialog({ isOpen, resolve }: SetPrivateSSHKeyDialogProps) {
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

      toast.success("SSH key is successfully stored on server");
    }
    catch (error) {
      console.error(error);
      toast.error("Failed to set private SSH key, check console for more info");
    }
    finally {
      resolve(null);
    }
  };

  return (
    <Modal open={isOpen} onClose={() => resolve(null)}>
      <ModalContent className="sm:max-w-[700px]!">
        <ModalHeader>
          <ModalTitle>Store private SSH key for GitHub in Dataspecer</ModalTitle>
          <ModalDescription>
            After submitting stores the given SSH key on server for the given login info (currently GitHub only).
            <br/>
            The SSH key should follow these rules:
            <ul>
              <li>- Be on one line (no \n)</li>
            </ul>
            <ul>
              <li>- Have no password</li>
            </ul>
            <ul>
              <li>- Be of type ed25519</li>
            </ul>
          </ModalDescription>
        </ModalHeader>
        <ModalBody>
          <form id="send-private-ssh-key-form" onSubmit={handleSubmit} >
            <input
              type="password"
              className="w-full grow"
              value={privateSSHKey}
              onChange={(e) => setPrivateSSHKey(e.target.value)}
              placeholder="Private SSH key"
              required />
          </form>
        </ModalBody>
        <ModalFooter className="flex flex-row">
          <Button variant="outline" onClick={() => resolve(null)}>Cancel</Button>
          <Button type="submit" className="hover:bg-purple-700" form="send-private-ssh-key-form" disabled={privateSSHKey === ""}>Confirm</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
