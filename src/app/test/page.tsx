// my-auth-frontend/pages/index.tsx
"use client"; // This line is still necessary.

import { useEffect, useState } from 'react';
import { signIn, signOut, authSubscribe, type User, initSatellite, } from '@junobuild/core'; // Import initJuno
import Link from 'next/link'; // Import Link for routing
import { useSatelliteReady } from "../client-providers";
// Principal type is not needed if user.owner is string, but kept commented out for reference.
// import { Principal } from '@dfinity/principal'; 

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const isReady = useSatelliteReady();

  useEffect(() => {
    // 認証状態の変化を購読
    const unsubscribe = authSubscribe((u: User | null) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

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

  const displayPrincipal = user?.owner ?? 'Unknown User';

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Juno Authentication Test App</h1>

      {user ? (
        <div>
          <p>
            Hello, **{displayPrincipal}**!
            (Principal: {displayPrincipal})
          </p>
          <button onClick={handleSignOut} style={{ padding: '10px 20px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            Logout
          </button>
          <p>
            <Link
              href={`/pay?toUser=${encodeURIComponent(displayPrincipal as string)}`}
              style={{ display: 'inline-block', marginTop: '20px', padding: '10px 15px', backgroundColor: '#4CAF50', color: 'white', textDecoration: 'none', borderRadius: '5px' }}
            >
              Proceed to Payment Page (with my Principal)
            </Link>
          </p>
          <p>
            <Link
              href="/pay?toUser=ANOTHER_USER_PRINCIPAL_HERE"
              style={{ display: 'inline-block', marginTop: '10px', padding: '10px 15px', backgroundColor: '#008CBA', color: 'white', textDecoration: 'none', borderRadius: '5px' }}
            >
              Proceed to Payment Page (for another Principal)
            </Link>
          </p>
        </div>
      ) : (
        <div>
          <p>Not logged in.</p>
          {initError && <p style={{ color: 'red' }}>エラー: {initError}</p>}
          <button
            onClick={handleSignIn}
            disabled={!isReady}
            style={{
              padding: '10px 20px',
              backgroundColor: isReady && !initError ? '#008CBA' : '#cccccc',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: isReady && !initError ? 'pointer' : 'not-allowed'
            }}
          >
            {isReady ? 'Internet Identity でログイン' : '初期化中...'}
          </button>
        </div>
      )}
    </div>
  );
}
