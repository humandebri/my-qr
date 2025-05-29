"use client";

import { ReactNode, useEffect, useState, createContext, useContext } from "react";
import { initSatellite, authSubscribe, type User } from "@junobuild/core";
import { StampProvider } from "../components/context/StampContext";
// import { AuthProvider } from "../components/context/Auth"; // AuthProviderができたら有効化
// import { WorkerProvider } from "../components/context/Worker"; // WorkerProviderができたら有効化

export const SatelliteReadyContext = createContext(false);
export const useSatelliteReady = () => useContext(SatelliteReadyContext);

// AuthContextの作成
const AuthContext = createContext<{ user: User | null, authLoaded: boolean }>({ user: null, authLoaded: false });
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);

  useEffect(() => {
    const unsubscribe = authSubscribe((u) => {
      setUser(u);
      setAuthLoaded(true); // 初回呼び出しでauthLoadedをtrueに
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, authLoaded }}>
      {children}
    </AuthContext.Provider>
  );
};

export function ClientProviders({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await initSatellite();
      setReady(true);
    })();
  }, []);

  // 今後AuthProviderやWorkerProviderでラップする場合は下記のようにネスト
  // return ready ? (
  //   <AuthProvider>
  //     <WorkerProvider>
  //       {children}
  //     </WorkerProvider>
  //   </AuthProvider>
  // ) : null;

  // AuthProviderとStampProviderでラップ
  return (
    <SatelliteReadyContext.Provider value={ready}>
      {ready ? (
        <AuthProvider>
          <StampProvider>
            {children}
          </StampProvider>
        </AuthProvider>
      ) : null}
    </SatelliteReadyContext.Provider>
  );
} 