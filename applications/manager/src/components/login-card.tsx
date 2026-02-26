import { SignInDialog } from '@/dialog/sign-in-buttons';
import { UseLoginType } from '@/hooks/use-login';
import { OpenBetterModal, useBetterModal } from '@/lib/better-modal';
import { LockKeyholeIcon, LogIn, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { SshMenu } from '@/dialog/ssh-menu';

/**
 * Visualizes the sign in/out buttons and user's profile picture with tooltip if signed in.
 * When the avatar is clicked a menu is opened.
 */
export const LoginCard = (props: {login: UseLoginType}) => {
  const { canSignIn, isSignedIn } = props.login;
  const openModal = useBetterModal();

  return (
    <div>
    {!canSignIn ?
      null :
      <div className="flex login-card">
        {isSignedIn ?
          <Button variant="ghost" className="flex focus:outline-none hover:bg-red-300 focus:ring-4 focus:ring-red-300 font-medium rounded-lg text-sm px-2 py-2.5 me-2 mb-2 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-900"
                onClick={(_) => redirectToPage(`${import.meta.env.VITE_BACKEND}/auth/signout?redirectURL=${encodeURI(window.location.href)}`)}
                title="Note that if you provide Git permissions. The token with permissions should be revoked after, unless some error happened, if so then for safety reasons you should remove the permissions provided to this page inside GitHub (or the used Git provider)">
            <LogOut className="pl-2" />
            <p className="pt-0.5 pl-1.5">Sign Out</p>
          </Button> :
          <Button variant="ghost" className="flex focus:outline-none hover:bg-green-300 focus:ring-4 focus:ring-green-300 text-sm px-2 py-2.5 me-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800"
                  onClick={() => openModal(SignInDialog, {})}>
            <LogIn />
            <p className="pt-0.5 pl-1.5">Sign In</p>
          </Button>
        }
        {!isSignedIn ?
          null :
          <div className="user-info">
            <UserMenu login={props.login} openModal={openModal} />
          </div>
        }
      </div>
    }
    </div>);
};

export function redirectToPage(url: string) {
  window.location.href = url;
}

type UserMenuProps = {
  login: UseLoginType;
  openModal: OpenBetterModal;
};

function UserMenu({ login, openModal }: UserMenuProps) {
  return <div className="user-info">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="shrink-0">
          <img src={login.imageUrl} alt="User Avatar" className="avatar mt-1 w-8 h-8" title={`Username: ${login.username}\nEmail: ${login.userEmail}\nScope: ${login.scope}`} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => openModal(SshMenu, {login})}><LockKeyholeIcon className="mr-2 h-4 w-4" />Add private SSH key</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
}