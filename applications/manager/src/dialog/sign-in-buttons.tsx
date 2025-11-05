import { Modal, ModalContent } from "@/components/modal";
import { BetterModalProps } from "@/lib/better-modal";
import { ConfigType } from "@dataspecer/git";


export const SignInDialog = ({ isOpen, resolve }: BetterModalProps) => {
  return (
    <Modal open={isOpen} onClose={() => resolve()}>
      <ModalContent>
        <div className="flex flex-col max-w-md">
          <button className="focus:outline-none text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800" onClick={(_) => goToPage(`${import.meta.env.VITE_BACKEND}/auth/signin?authPermissions=${ConfigType[ConfigType.DeleteRepoControl]}`)}>Sign-in (Profile info + Git permissions + REMOVE ANY GIT REPOSITORY permission)</button>
          <button className="focus:outline-none text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800" onClick={(_) => goToPage(`${import.meta.env.VITE_BACKEND}/auth/signin?authPermissions=${ConfigType[ConfigType.FullPublicRepoControl]}`)}>Sign-in (Profile info + Git permissions)</button>
          <button className="focus:outline-none text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800" onClick={(_) => goToPage(`${import.meta.env.VITE_BACKEND}/auth/signin?authPermissions=${ConfigType[ConfigType.LoginInfo]}`)}>Sign-in (only profile info, without any git permissions)</button>
        </div>
      </ModalContent>
    </Modal>
);
}

function goToPage(url: string) {
  window.location.href = url;
}