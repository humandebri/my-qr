"use client";

import { ReactNode, useEffect, useState, createContext, useContext } from "react";
import { initSatellite } from "@junobuild/core";
// import { AuthProvider } from "../components/context/Auth"; // AuthProviderができたら有効化
// import { WorkerProvider } from "../components/context/Worker"; // WorkerProviderができたら有効化

export const SatelliteReadyContext = createContext(false);
export const useSatelliteReady = () => useContext(SatelliteReadyContext);

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

  return (
    <SatelliteReadyContext.Provider value={ready}>
      {ready ? children : null}
    </SatelliteReadyContext.Provider>
  );
} 