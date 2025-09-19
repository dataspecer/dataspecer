import { UseLoginType } from '@/hooks/use-login';
import { ConfigType } from '@dataspecer/git';

const LoginCard = (props: {login: UseLoginType}) => {
  const { canSignIn, imageUrl, isSignedIn, scope, userEmail, username } = props.login;

  return (
    !canSignIn ?
      null :
      <div className="login-card">
        {!isSignedIn ?
          <div>Note that if you provide git permissions. The token itself is still valid after logging out. So for safety reasons you should remove the permissions provided to this page inside GitHub</div> :
          <div className="user-info">
            <img src={imageUrl} alt="User Avatar" className="avatar" />
            <h2>{username}</h2>
            <p>{userEmail}</p>
            <p>{scope}</p>
          </div>
        }
        <div className="flex flex-col max-w-md">
          <button className="focus:outline-none text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-900" onClick={(_) => goToPage(`${import.meta.env.VITE_BACKEND}/auth/signout?redirectURL=${encodeURI(window.location.href)}`)}>Signout button</button>
          <button className="focus:outline-none text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800" onClick={(_) => goToPage(`${import.meta.env.VITE_BACKEND}/auth/signin?authPermissions=${ConfigType[ConfigType.DeleteRepoControl]}`)}>Sign-in (Profile info + Git permissions + REMOVE ANY GIT REPOSITORY permission)</button>
          <button className="focus:outline-none text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800" onClick={(_) => goToPage(`${import.meta.env.VITE_BACKEND}/auth/signin?authPermissions=${ConfigType[ConfigType.FullPublicRepoControl]}`)}>Sign-in (Profile info + Git permissions)</button>
          <button className="focus:outline-none text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800" onClick={(_) => goToPage(`${import.meta.env.VITE_BACKEND}/auth/signin?authPermissions=${ConfigType[ConfigType.LoginInfo]}`)}>Sign-in (only profile info, without any git permissions)</button>
        </div>
      </div>
    );
};

function goToPage(url: string) {
  window.location.href = url;
}

export default LoginCard;
