import { Modal, ModalContent, ModalDescription, ModalHeader, ModalTitle } from "@/components/modal";
import { PopOverGitGeneralComponent } from "@/components/popover-git-general";
import { Button } from "@/components/ui/button";
import { BetterModalProps } from "@/lib/better-modal";
import { ConfigType } from "@dataspecer/git";
import { ArrowDownNarrowWide, ArrowUpNarrowWide, EyeIcon } from "lucide-react";
import { useState } from "react";


function SignInInfoTooltipBasic() {
  return <PopOverGitGeneralComponent>
    <div>
      <div>- Choose the option with <strong>Name + E-mail + Git push scope</strong> to access all the important Git features - <strong className="text-green-600">Recommended</strong></div>
      <div>- The provided rights are for <strong>each repository you have access to</strong>.</div>
      <div>- The access token, which comes with the sign-in, should be automatically revoked after you sign out.</div>
    </div>
  </PopOverGitGeneralComponent>;
}

function SignInInfoTooltipAdvanced() {
  return <PopOverGitGeneralComponent>
      <div>
        <br/>
        <h1 className="text-2xl font-bold">In short:</h1>
        <div>- Choose the option with <strong>Name + E-mail + Git push scope</strong> to access all the important Git features - <strong className="text-green-600">Recommended</strong></div>
        <div>- Choose the option with <strong>Name + E-mail + Git push + Delete scope</strong> to get the ability to remove any owned repository.</div>
        <div className="flex flex-1 flex-row">- Choose the option with&nbsp;<strong>Name + E-mail</strong>&nbsp;to access all "<EyeIcon/>" Git features.</div>

        <br/>
        <h1 className="text-2xl font-bold">In long:</h1>
        <div>
          - Choose the <strong>Name + E-mail + Git push scope</strong> if you want to <strong>create new repositories</strong> or <strong>commit</strong> to repositories to which you have access.
          <br/>
        </div>
        <div>
          - Choose the <strong>Delete</strong> rights if you are developer who is debugging Dataspecer's Git integration.
          <br/>
          &nbsp;&nbsp;&nbsp;It is, of course, accessible to non-developers, but it is discouraged.
        </div>
        <div>
          - Choose the <strong>Name + E-mail</strong> option to either
        </div>
        <div>
          &nbsp;&nbsp;&nbsp;- Fetch issues, pull requests, Git history or similar stuff from the Git provider.
          <br/>
          &nbsp;&nbsp;&nbsp;- Commit under your name to repositories accessible by the Dataspecer bot.
          <br/>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;You can think of a Dataspecer bot as a fallback Git user.
          <br/>
          &nbsp;&nbsp;&nbsp;- Commit and pull to repositories using your private SSH key, which you can set up once you sign in.
        </div>
        <br/>
        <div>
          - The access tokens for Git operations are tried out until one succeeds in this order. Your SSH, your PAT, bot SSH, bot PAT
          <br/>
          &nbsp;&nbsp;&nbsp;where PAT = Personal Access Token, that is the things you get from the Git provider on sign in.
        </div>
      </div>
    </PopOverGitGeneralComponent>;
}

export const SignInDialog = ({ isOpen, resolve }: BetterModalProps) => {
  const [showMore, setShowMore] = useState<boolean>(false);

  return (
    <Modal open={isOpen} onClose={() => resolve()}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>
            <div className="flex flex-1 flex-row">
              Sign in options <SignInInfoTooltipBasic/>
            </div>
          </ModalTitle>
        </ModalHeader>
        <ModalDescription>
          - Choose <strong>how much information</strong> do you want to provide <strong>to Dataspecer</strong>.
          <br/>
          - Next dialog lets you choose authentication provider.
          <br/>
          - Hover on the info icon(s) for more info.
        </ModalDescription>
        <div className="flex flex-col max-w-md">
            <Button variant="outline" className="cursor-pointer focus:outline-none border border-black hover:bg-green-400 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700" onClick={(_) => goToPage(`${import.meta.env.VITE_BACKEND}/auth/signin?authPermissions=${ConfigType[ConfigType.FullPublicRepoControl]}`)}>Name + E-mail + Git Push scope</Button>
            {/* ---- COLLAPSIBLE SECTION ---- */}
            <hr className="border-t-2 border-gray-300 mt-8" />
            <div className="flex flex-row flex-1">
              <Button
                variant="ghost"
                className="mt-2 mb-2 p-0 text-sm justify-start"
                onClick={() => setShowMore(!showMore)}
              >
                {showMore ? <ArrowUpNarrowWide /> : <ArrowDownNarrowWide />} Advanced sign-in options
              </Button>
              <div className="pt-4 ml-2"><SignInInfoTooltipAdvanced/></div>
            </div>
            { (!showMore) ?
                null :
                <div className="flex flex-col max-w-md">
                  <Button variant="outline" className="cursor-pointer focus:outline-none border border-black hover:bg-green-400 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700" onClick={(_) => goToPage(`${import.meta.env.VITE_BACKEND}/auth/signin?authPermissions=${ConfigType[ConfigType.DeleteRepoControl]}`)}>Name + E-mail + Git Push and Delete scope</Button>
                  <Button variant="outline" className="cursor-pointer focus:outline-none border border-black hover:bg-green-400 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700" onClick={(_) => goToPage(`${import.meta.env.VITE_BACKEND}/auth/signin?authPermissions=${ConfigType[ConfigType.LoginInfo]}`)}>Name + E-mail</Button>
                </div>
            }
            {/* ---- END OF COLLAPSIBLE SECTION ---- */}
        </div>
      </ModalContent>
    </Modal>
);
}

function goToPage(url: string) {
  window.location.href = url;
}
