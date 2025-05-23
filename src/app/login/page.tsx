// my-auth-frontend/pages/index.tsx
"use client"; // This line is still necessary.

import { useEffect, useState } from 'react';
import { signIn, signOut, authSubscribe, type User, initSatellite, } from '@junobuild/core'; // Import initJuno
import Link from 'next/link'; // Import Link for routing
import { useSatelliteReady, useAuth } from "../client-providers";
import { IconII } from "../../components/icons/IconII";
import { useRouter } from "next/navigation";

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
        maxTimeToLive: BigInt(400) * BigInt(60) * BigInt(60) * BigInt(1_000_000_000),
        windowed: false,
        allowPin: true,
      });
    } catch (error) {
      setInitError("ログインに失敗しました。詳細をコンソールで確認してください。");
      console.error('Login failed:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
      alert('ログアウトに失敗しました。詳細をコンソールで確認してください。');
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

