import { useEffect, useState } from "react";

export interface UseLoginType {
  isSignedIn: boolean;
  canSignIn: boolean;
  username: string,
  userEmail: string,
  scope: string,
  imageUrl: string,
}

export const useLogin = (): UseLoginType => {
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

  return {
    isSignedIn,
    canSignIn,
    username,
    userEmail,
    scope,
    imageUrl,
  };
}