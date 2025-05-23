import Icon from "@ant-design/icons";
import {
  InternetIdentityProvider,
  signIn,
} from "@junobuild/core";
import { Button } from "antd";
import { useContext } from "react";
import { AuthContext } from "../context/Auth.tsx";
import { IconII } from "../icons/IconII.tsx";

export const Login = () => {
  const { setBusy } = useContext(AuthContext);

  const login = async (signIn: () => Promise<void>) => {
    setBusy?.(true);

    try {
      await signIn();
    } catch (err) {
      console.error(err);
    }

    setBusy?.(false);
  };

  const signInII = async () =>
    login(async () =>
      signIn({
        provider: new InternetIdentityProvider({
          domain: "ic0.app",
        }),
        maxTimeToLive: BigInt(400) * BigInt(60) * BigInt(60) * BigInt(1_000_000_000), // 400時間 (ナノ秒単位)
        windowed: false, // Open authentication flow in the current tab
        allowPin: true, // Allow PIN setup
      }),
    );


  return (
    <>
      <Button
        onClick={signInII}
        shape="circle"
        aria-label="Sign-in with Internet Identity"
        className="header"
      >
        <Icon component={IconII} />
      </Button>

    </>
  );
};