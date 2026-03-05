import { Button } from "@/components/ui/button";
import { BetterModalProps, useBetterModal } from "@/lib/better-modal";
import { useCallback, useEffect, useState } from "react";
import SetPrivateSSHKeyDialog from "./set-private-ssh";
import { UseLoginType } from "@/hooks/use-login";
import { GitProviderNamesAsType } from "@dataspecer/git";
import { toast } from "sonner";
import { Modal, ModalBody, ModalContent, ModalDescription, ModalHeader, ModalTitle } from "@/components/modal";
import { PopOverGitGeneralComponent } from "@/components/popover-git-general";
import { MinusIcon, PlusIcon } from "lucide-react";

type SshMenuProps = {
  login: UseLoginType;
} & BetterModalProps<null>;


/**
 * Experimental menu component for handling setting and removal of private SSH key.
 * Why experimental? Well now it has hardcoded GitHub as the provider which uses the key.
 * However, in future it makes sense to just set multiple keys and for each decide to which git provider it belongs (note that one key can be used for multiple providers).
 * That is the reason why it is hardcoded now, since we can not tell how it should exactly work in future and where to store the SSH keys due to security concerns.
 */
export function SshMenu({ login, resolve, isOpen } : SshMenuProps) {
  const openModal = useBetterModal();
  const [hasSsh, setHasSsh] = useState<boolean>(false);

  useEffect(() => {
    const hasSshKeySetter = async () => {
      try {
        const gitProviderLowercase: GitProviderNamesAsType = "github";  // !! Hardcoded

        const response = await fetch(import.meta.env.VITE_BACKEND + "/git/check-for-existence-of-private-ssh-key?gitProviderLowercase=" + gitProviderLowercase, {
          method: "GET",
          credentials: "include",   // We have to include them since we store it under user
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          setHasSsh(true);
        }
        else if (response.status === 404) {
          setHasSsh(false);
        }
        else {
          throw new Error("Server error" + response);
          resolve(null);
        }
      }
      catch (error) {
        console.error(error);
        toast.error("Failed to get private SSH key, check console for more info", { "richColors": true });
        resolve(null);
      }
    };
    hasSshKeySetter();
  }, []);


  const handleAddSSH = useCallback(() => {
    openModal(SetPrivateSSHKeyDialog, {});
    resolve(null);
  }, []);

  const handleRemoveSSH = useCallback(async () => {
    try {
      const gitProviderLowercase: GitProviderNamesAsType = "github";  // !! Hardcoded

      const response = await fetch(import.meta.env.VITE_BACKEND + "/git/delete-private-ssh-key?gitProviderLowercase=" + gitProviderLowercase, {
        method: "DELETE",
        credentials: "include",   // We have to include them since we store it under user
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        toast.success("Successfully removed private SSH key from server");
      }
      else if (response.status === 404) {
        toast.success("Failed to remove private SSH key from server");
      }
      else {
        throw new Error("Server error" + response);
      }
    }
    catch (error) {
      console.error(error);
      toast.success("Failed to remove private SSH key from server");
    }
    finally {
      resolve(null);
    }
  }, []);

  if (!login.isSignedIn) {
    return null;
  }
  return (
    <Modal open={isOpen} onClose={() => resolve(null)}>
      <ModalContent className="sm:max-w-[700px]!">
        <ModalHeader>
          <ModalTitle>Menu for working with SSH keys</ModalTitle>
          <ModalDescription>
            - At most one SSH key per account.
            <br/>
            - The SSH will behave as be your primary access token. If it fails the other available access tokens will be used.
            <br/>
            - SSH can be only used for pull and committing, but not Git providers specifics, such as creating new repository or fetching issues.
            <p className="flex flex-1 flex-row">- The SSH key can be a deploy key<PopOverGitGeneralComponent><DeployKeyTooltip/></PopOverGitGeneralComponent></p>
            <p className="flex flex-1 flex-row -mt-4">- Security<PopOverGitGeneralComponent><SecurityTooltip/></PopOverGitGeneralComponent></p>
          </ModalDescription>
        </ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-4">
            <Button
              title="Experimental. Adds private SSH key to the Dataspecer."
              variant="ghost" className="px-0 border hover:bg-green-100"
              onClick={handleAddSSH}
            >
              <div className="flex">
                <PlusIcon className="w-4 h-4 mt-1 mr-1" />
                <p>Add private SSH key</p>
              </div>
            </Button>

            {!hasSsh ?
              null :
              <Button variant="ghost" className="border hover:bg-red-100" onClick={handleRemoveSSH}>
                <MinusIcon className="w-4 h-4 mt-1 mr-1" />
                Remove private SSH key
              </Button>
            }
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}



function SecurityTooltip() {
  return <div>
    The SSH key is stored in Dataspecer's filesystem without encryption. The key is never sent back to client.
    <br/>
    Possible attacker would have to get possession of the server and the file to steal it.
  </div>;
}


function DeployKeyTooltip() {
  return <div>Deploy key is a private SSH key for committing to a single repository</div>;
}
