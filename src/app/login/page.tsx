// my-auth-frontend/pages/index.tsx
"use client"; // This line is still necessary.

import { useEffect, useState } from 'react';
import { signIn } from '@junobuild/core'; // Import initJuno
import { useSatelliteReady, useAuth } from "../client-providers";
import { IconII } from "../../components/icons/IconII";
import { useRouter } from "next/navigation";
import { AUTH_CONFIG } from "../../config/auth";

// Principal type is not needed if user.owner is string, but kept commented out for reference.
// import { Principal } from '@dfinity/principal'; 

export default function Home() {
  const isReady = useSatelliteReady();
  const { user } = useAuth();
  const [initError, setInitError] = useState<string | null>(null);
  const router = useRouter();

  // ログイン成功時にトップページへリダイレクト
  useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

  const handleSignIn = async () => {
    try {
      await signIn({
        maxTimeToLive: AUTH_CONFIG.MAX_TIME_TO_LIVE,
        windowed: AUTH_CONFIG.WINDOWED,
        allowPin: AUTH_CONFIG.ALLOW_PIN,
      });
    } catch (error) {
      setInitError("ログインに失敗しました。詳細をコンソールで確認してください。");
      console.error('Login failed:', error);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>

      {!user ?  (
        <div className="flex flex-col items-center justify-center h-screen ">
          <p>ログインしてください！</p>
          {initError && <p style={{ color: 'red' }}>エラー: {initError}</p>}
          <button
            onClick={handleSignIn}
            disabled={!isReady}
            className="border p-2 rounded flex items-center gap-2"
            aria-label="Sign in with Internet Identity"
          >
            <span className="w-6 h-6"><IconII /></span>
            {isReady ? 'Internet Identity' : '初期化中...'}
          </button>
        </div>
      ) : (
        <div>

        </div>
      )}
    </div>
  );
}

