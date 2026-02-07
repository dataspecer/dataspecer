import { SignInDialog } from '@/dialog/sign-in-buttons';
import { UseLoginType } from '@/hooks/use-login';
import { useBetterModal } from '@/lib/better-modal';
import { LogIn, LogOut } from 'lucide-react';
import { Button } from './ui/button';

export const LoginCard = (props: {login: UseLoginType}) => {
  const { canSignIn, imageUrl, isSignedIn, scope, userEmail, username } = props.login;
  const openModal = useBetterModal();

  return (
    <div>
    {!canSignIn ?
      null :
      <div className="flex login-card">
        {isSignedIn ?
          <Button variant="ghost" className="flex focus:outline-none hover:bg-red-300 focus:ring-4 focus:ring-red-300 font-medium rounded-lg text-sm px-2 py-2.5 me-2 mb-2 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-900"
                onClick={(_) => goToPage(`${import.meta.env.VITE_BACKEND}/auth/signout?redirectURL=${encodeURI(window.location.href)}`)}
                title="Note that if you provide git permissions. The token with permissions should be revoked after, unless some error happened, if so then for safety reasons you should remove the permissions provided to this page inside GitHub (or the used git provider)">
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
            <img src={imageUrl} alt="User Avatar" className="avatar mt-1 w-8 h-8" title={`Username: ${username}\nEmail: ${userEmail}\nScope: ${scope}`} />
          </div>
        }
      </div>
    }
    </div>);
};

function goToPage(url: string) {
  window.location.href = url;
}
