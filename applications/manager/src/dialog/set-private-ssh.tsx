import { Modal, ModalBody, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { BetterModalProps } from "@/lib/better-modal";
import { FormEventHandler, useState } from "react";
import { toast } from "sonner";

type SetPrivateSSHKeyDialogProps = BetterModalProps<null>;


export default function SetPrivateSSHKeyDialog({ isOpen, resolve }: SetPrivateSSHKeyDialogProps) {
  const [privateSSHKey, setPrivateSSHKey] = useState<string>("");

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(import.meta.env.VITE_BACKEND + "/git/set-private-ssh-key", {
        method: "POST",
        credentials: "include",   // We have to include them since we store it under user
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ privateSSHKey }),
      });

      if (!response.ok) {
        throw new Error("Server error" + response);
      }

      toast.success("SSH key is successfully stored on server");
    } catch (error) {
      console.error(error);
      toast.error("Failed to set private SSH key, check console for more info");
    } finally {
      resolve(null);
    }
  };

  return (
    <Modal open={isOpen} onClose={() => resolve(null)}>
      <ModalContent className="sm:max-w-[700px]">
        <ModalHeader>
          <ModalTitle>Store private SSH key on server</ModalTitle>
          <ModalDescription>
            After submit stores the given SSH key on server for the given login info.
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
          <Button type="submit" form="send-private-ssh-key-form" disabled={privateSSHKey === ""}>Confirm</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
