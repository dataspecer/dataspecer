import { UseLoginType } from '@/hooks/use-login';
import { OpenBetterModal, useBetterModal } from '@/lib/better-modal';
import { LockKeyholeIcon, LogIn, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { useTranslation } from 'react-i18next';
import { SshMenu } from '@/dialog/ssh-menu';
import { goToPage, SignInDialog } from '@/dialog/advanced-sign-in';
import { ScopeGroup } from '@dataspecer/auth';

/**
 * Visualizes the sign in/out buttons and user's profile picture with tooltip if signed in.
 * When the avatar is clicked a menu is opened.
 */
export const LoginCard = (props: {login: UseLoginType}) => {
  const { canSignIn, isSignedIn } = props.login;
  const openModal = useBetterModal();
  const { t } = useTranslation();

  return (
    <div>
    {!canSignIn ?
      null :
      <div className="flex login-card">
        {isSignedIn ?
          <Button variant="ghost" className="flex focus:outline-none hover:bg-red-300 focus:ring-4 focus:ring-red-300 font-medium rounded-lg text-sm px-2 py-2.5 me-2 mb-2 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-900"
                onClick={(_) => goToPage(`${import.meta.env.VITE_BACKEND}/auth/signout?redirectURL=${encodeURI(window.location.href)}`)}
                title={t("login-card.sign-out-tooltip")}
>
            <LogOut className="pl-2" />
            <p className="pb-0.5 pl-1.5 pr-1.5">{t("login-card.sign-out")}</p>
          </Button> : <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex focus:outline-none hover:bg-green-300 focus:ring-4 focus:ring-green-300 text-sm px-2 py-2.5 me-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800">
                  <LogIn/>
                  <p className="pl-1.5">{t("login-card.sign-in")}</p>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={(_) => goToPage(`${import.meta.env.VITE_BACKEND}/auth/signin?authPermissions=${ScopeGroup[ScopeGroup.FullPublicRepoControl]}`)}>
                  <LogIn/>
                  <p className="pl-1.5 ">{t("login-card.standard-sign-in")}</p>
                  <p className="pl-1.5 text-green-600">{t("login-card.recommended")}</p>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openModal(SignInDialog, {})}>
                  <LogIn/>
                  <p className="pl-1.5">{t("login-card.advanced-sign-in")}</p>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
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

type UserMenuProps = {
  login: UseLoginType;
  openModal: OpenBetterModal;
};

function UserMenu({ login, openModal }: UserMenuProps) {
  const { t } = useTranslation();

  return <div className="user-info">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="shrink-0">
          <img
            src={login.imageUrl}
            alt={t("login-card.user-avatar-alt")}
            className="avatar mt-1 w-8 h-8"
            title={t("login-card.user-avatar-title", {
              username: login.username,
              email: login.userEmail,
              scope: login.scope,
            })}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => openModal(SshMenu, {login})}>
          <LockKeyholeIcon className="mr-2 h-4 w-4" />
          {t("login-card.add-private-ssh-key")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
}
