"use client";

import { createContext, ReactNode, useEffect, useState, useRef } from "react";
import {
  type Doc,
  initSatellite,
  setDoc,
  getDoc,
  listDocs,
} from "@junobuild/core-peer";
import { signIn, signOut, authSubscribe, User, InternetIdentityProvider } from "@junobuild/core";
import { nanoid } from "nanoid";
import { IconII } from "../components/icons/IconII";
import { useSatelliteReady, useAuth } from "../app/client-providers";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { MdOutlineContentCopy } from "react-icons/md";

type Record = {
  hello: string;
};

export default function Home() {
  const [record, setRecord] = useState<Doc<Record> | undefined>(undefined);
  const [key, setKey] = useState<string | undefined>(undefined);
  const [records, setRecords] = useState<Doc<Record>[]>([]); // 一覧用
  const [error, setError] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const isReady = useSatelliteReady();
  const { user, authLoaded } = useAuth();
  const router = useRouter();

  // サインインしていなければ/loginへリダイレクト
  useEffect(() => {
    if (isReady && authLoaded && !user) {
      router.push("/login");
    }
  }, [isReady, authLoaded, user, router]);

  useEffect(() => {
    if (user) {
      const principal = user.owner;
      const qrData = `icp://principal/${principal}`;
      QRCode.toDataURL(qrData)
        .then(setQrUrl)
        .catch(console.error);
    }
  }, [user]);

  // モーダル外クリックで閉じる
  useEffect(() => {
    if (!modalOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setModalOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [modalOpen]);

  // isReadyとauthLoadedが両方trueになるまで何も表示しない
  if (!isReady || !authLoaded) {
    return null;
  }
  if (!user) {
    return null;
  }

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

  // ログアウト処理
  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  const handleCopy = async () => {
    if (user?.owner) {
      await navigator.clipboard.writeText(user.owner);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  // ログイン済みの場合のみUIを表示
  return (
    <main className="p-4">
      <div className="mb-4 flex justify-end">
        <button
          onClick={handleLogout}
          className="border p-2 rounded flex items-center gap-2 bg-red-500  hover:bg-red-600"
          aria-label="logout"
        >
          logout
        </button>
      </div>
      <div className="mb-4">
        {/* プリンシパルアドレス表示とコピー・QRコード */}
        {user && (
          <div className="flex flex-col gap-2 items-start">
            <p className="px-2 ">Principal</p>
            <div className="border rounded flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="px-2 py-1 rounded bg-blue-500  hover:bg-blue-600 text-xs flex items-center"
                aria-label="コピー"
              >
                <span className="font-mono text-sm bg-gray-300 pr-2 py-1  select-all text-left">{user.owner} </span>
                <MdOutlineContentCopy className="text-lg w-5 h-5 min-w-5 min-h-5" />
              </button>
              {copied && <span className="text-green-600 text-xs ml-1 pr-2">コピーしました</span>}
            </div>
            <div>
              <p>QR Code</p>
            </div>
            {qrUrl && (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="focus:outline-none"
                aria-label="QRコードを拡大"
              >
                <img src={qrUrl} alt="Principal QR" className="w-32 h-32 border rounded block mx-auto" />
              </button>
            )}
            {/* モーダル */}
            {modalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" style={{backdropFilter: 'blur(2px)'}}>
                <div ref={modalRef} className="bg-white p-6 rounded shadow-lg flex flex-col items-center">
                  <img src={qrUrl!} alt="Principal QR Large" className="w-72 h-72 border rounded mb-4" />
                  <button
                    onClick={() => setModalOpen(false)}
                    className="mt-2 px-4 py-2 bg-blue-500 rounded hover:bg-blue-600"
                  >
                    閉じる
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}