import { Modal, ModalContent, ModalDescription, ModalHeader, ModalTitle } from "@/components/modal";
import { BetterModalProps } from "@/lib/better-modal";
import { ConfigType } from "@dataspecer/git";


export const SignInDialog = ({ isOpen, resolve }: BetterModalProps) => {
  return (
    <Modal open={isOpen} onClose={() => resolve()}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Sign in options</ModalTitle>
        </ModalHeader>
        <ModalDescription>
          Choose how much information do you want to provide to Dataspecer. Next dialog lets you choose authentication provider.
        </ModalDescription>
        <div className="flex flex-col max-w-md">
          <button className="cursor-pointer focus:outline-none border border-black hover:bg-green-400 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700" onClick={(_) => goToPage(`${import.meta.env.VITE_BACKEND}/auth/signin?authPermissions=${ConfigType[ConfigType.DeleteRepoControl]}`)}>Name + E-mail + Git Push and Delete scope</button>
          <button className="cursor-pointer focus:outline-none border border-black hover:bg-green-400 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700" onClick={(_) => goToPage(`${import.meta.env.VITE_BACKEND}/auth/signin?authPermissions=${ConfigType[ConfigType.FullPublicRepoControl]}`)}>Name + E-mail + Git Push scope</button>
          <button className="cursor-pointer focus:outline-none border border-black hover:bg-green-400 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700" onClick={(_) => goToPage(`${import.meta.env.VITE_BACKEND}/auth/signin?authPermissions=${ConfigType[ConfigType.LoginInfo]}`)}>Name + E-mail</button>
        </div>
      </ModalContent>
    </Modal>
);
}

function goToPage(url: string) {
  window.location.href = url;
}