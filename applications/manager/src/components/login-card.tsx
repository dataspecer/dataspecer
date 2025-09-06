import { UseLoginType } from '@/hooks/use-login';
import { ConfigType } from '@dataspecer/git';

const LoginCard = (props: {login: UseLoginType}) => {
  const { canSignIn, imageUrl, isSignedIn, scope, userEmail, username } = props.login;

  return (
    !canSignIn ?
      null :
      <div className="login-card">
        {!isSignedIn ?
          null :
          <div className="user-info">
            <img src={imageUrl} alt="User Avatar" className="avatar" />
            <h2>{username}</h2>
            <p>{userEmail}</p>
            <p>{scope}</p>
          </div>
        }
        <div className="flex flex-col max-w-md">
          <button className="focus:outline-none text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-900" onClick={(_) => goToPage(`${import.meta.env.VITE_BACKEND}/auth/signout?redirectURL=${encodeURI(window.location.href)}`)}>Signout button</button>
          <button className="focus:outline-none text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800" onClick={(_) => goToPage(`${import.meta.env.VITE_BACKEND}/auth/signin?authPermissions=${ConfigType[ConfigType.DeleteRepoControl]}`)}>TODO RadStr: FOR DEBUGGING - THIS GIVES DS POWER TO REMOVE ANY OF YOUR REPOSITORIES</button>
          <button className="focus:outline-none text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800" onClick={(_) => goToPage(`${import.meta.env.VITE_BACKEND}/auth/signin?authPermissions=${ConfigType[ConfigType.FullPublicRepoControl]}`)}>TODO RadStr: Authorization FULL PERMISSIONS</button>
          <button className="focus:outline-none text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800" onClick={(_) => goToPage(`${import.meta.env.VITE_BACKEND}/auth/signin?authPermissions=${ConfigType[ConfigType.LoginInfo]}`)}>TODO RadStr: Authorization JUST EMAIL AND PROFILE INFO</button>
        </div>
      </div>
    );
};

function goToPage(url: string) {
  window.location.href = url;
}

export default LoginCard;
