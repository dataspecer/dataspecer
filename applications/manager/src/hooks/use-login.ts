import { GitProviderNamesAsType, Scope } from "@dataspecer/git";
import { useEffect, useState } from "react";

export interface UseLoginType {
  isSignedIn: boolean;
  canSignIn: boolean;
  accountProvider: GitProviderNamesAsType;
  username: string;
  userEmail: string;
  scope: string;
  genericScope: Scope[];
  imageUrl: string;
  isLoginDataReady: boolean;
}

export const useLogin = (): UseLoginType => {
  const [accountProvider, setAccountProvider] = useState<GitProviderNamesAsType>("github");
  const [username, setUsername] = useState<string>("userName");
  const [userEmail, setUserEmail] = useState<string>("userEmail");
  const [imageUrl, setImageUrl] = useState<string>("userImg");
  const [scope, setScope] = useState<string>("");
  const [genericScope, setGenericScope] = useState<Scope[]>([]);
  const [isSignedIn, setIsSignedIn] = useState<boolean>(false);
  const [isLoginDataReady, setIsLoginDataReady] = useState<boolean>(false);
  // Set to true if the frontend can use the authentication capabilities. That is cors for credentials is allowed
  const [canSignIn, setCanSignIn] = useState<boolean>(false);

  useEffect(() => {
    fetch(import.meta.env.VITE_BACKEND + "/auth/session", {
      credentials: "include",         // Important, without this we don't send the authorization cookies
      method: "GET",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data !== null) {
          setAccountProvider(data.user.accountProvider);
          setUsername(data.user.name);
          setUserEmail(data.user.email);
          setImageUrl(data.user.image);
          setScope(data.user.scope);
          setGenericScope(data.user.genericScope);
          setIsSignedIn(true);
        }
        else {
          setIsSignedIn(false);
        }
        setCanSignIn(true);
        setIsLoginDataReady(true);
      })
      .catch((_error) => {
        // I am not sure if there can be any other error,
        // which can cause this other than the cors errors, so maybe possible TODO: in future
        setCanSignIn(false);
        setIsSignedIn(false);
        setIsLoginDataReady(true);
      });
  }, []);

  return {
    isSignedIn,
    canSignIn,
    accountProvider,
    username,
    userEmail,
    genericScope,
    scope,
    imageUrl,
    isLoginDataReady,
  };
}