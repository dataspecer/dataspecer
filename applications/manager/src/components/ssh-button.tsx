import { SshMenu } from "@/dialog/ssh-menu";
import { useLogin } from "@/hooks/use-login";
import { useBetterModal } from "@/lib/better-modal";
import { Button } from "./ui/button";
import { LockKeyholeIcon } from "lucide-react";

export function SshButton() {
  const login = useLogin();
  const openModal = useBetterModal();
  if (!login.isSignedIn) {
    return null;
  }

  return <Button variant="ghost" className="flex font-medium rounded-lg text-sm px-2 py-2 me-2 mb-2" onClick={() => {openModal(SshMenu, {login})}}>
    <LockKeyholeIcon className="w-4 h-4" />
    ssh
  </Button>;
}