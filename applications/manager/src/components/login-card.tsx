import { ConfigType } from '@dataspecer/git';
import { useEffect, useState } from 'react';

const LoginCard = () => {
  const [username, setUsername] = useState<string>("userName");
  const [userEmail, setUserEmail] = useState<string>("userEmail");
  const [imageUrl, setImageUrl] = useState<string>("userImg");
  const [scope, setScope] = useState<string>("");
  const [isSignedIn, setIsSignedIn] = useState<boolean>(false);
  // Set to true if the frontend can use the authentication capabilities. That is cors for credentials is allowed
  const [canSignIn, setCanSignIn] = useState<boolean>(false);

  useEffect(() => {
    fetch(import.meta.env.VITE_BACKEND + "/auth/session", {
      credentials: "include",         // TODO RadStr: Important, without this we don't send the authorization cookies
      method: "GET",
    })
      .then((res) => res.json())
      .then((data) => {
        console.info("data", data);   // TODO RadStr: Debug
        if (data !== null) {
          setUsername(data.user.name);
          setUserEmail(data.user.email);
          setImageUrl(data.user.image);
          setScope(data.user.scope)
          setIsSignedIn(true);
        }
        else {
          setIsSignedIn(false);
        }
        setCanSignIn(true);
      })
      .catch((_error) => {
        // TODO RadStr: I am not sure if there can be any other error, which can cause this other than the cors errors
        setCanSignIn(false);
        setIsSignedIn(false);
      });
  }, []);

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
