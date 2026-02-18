import { Modal, ModalContent, ModalDescription, ModalHeader, ModalTitle } from "@/components/modal";
import { PopOverGitGeneralComponent } from "@/components/popover-git-general";
import { BetterModalProps } from "@/lib/better-modal";
import { ConfigType } from "@dataspecer/git";


function SignInInfoTooltip() {
  return <div>
    <div>- The access token should be automatically revoked after you sign out.</div>
    <br/>
    <div>
      - Choose the the <strong>Name + E-mail</strong> option to commit to a repository accessible by bot under your name.
    </div>
    <br/>
    <div>
      - <strong>Once you sign-in</strong> you can also set your <strong>SSH key</strong> under your account.
    </div>
    <br/>
    <div>
      - Use the <strong>Name + E-mail + Git push scope</strong> if you want to <strong>create new repositories</strong> or <strong>commit</strong> to repositories to which you have access.
    </div>
    <br/>
    <div>
      - Use the <strong>Delete</strong> rights if you are developer who is debugging Dataspecer's Git integration.
      <br/>
      &nbsp;&nbsp;&nbsp;It is, of course, accessible to non-developers, but due to <strong>security concerns it is discouraged.</strong>
    </div>
    <br/>
    <div>- Note that the provided rights are for <strong>each repository you have access to</strong>.</div>
    <br/>
    <br/>
    <div>
      - The access tokens are tried out until one succeeds in this order. Your SSH, your PAT, bot SSH, bot PAT
      <br/>
      &nbsp;&nbsp;&nbsp;PAT = Personal Access Token
    </div>
  </div>;
}


export const SignInDialog = ({ isOpen, resolve }: BetterModalProps) => {
  return (
    <Modal open={isOpen} onClose={() => resolve()}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>
            <div className="flex flex-1 flex-row">
              Sign in options <PopOverGitGeneralComponent><SignInInfoTooltip/></PopOverGitGeneralComponent>
            </div>
          </ModalTitle>
        </ModalHeader>
        <ModalDescription>
          Choose <strong>how much information</strong> do you want to provide <strong>to Dataspecer</strong>.
          <br/>
          Next dialog lets you choose authentication provider.
          <br/>
          Hover on the info icon for more info.
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
