"use client";

import { useEffect, useState, useRef } from "react";
import { signIn, signOut } from "@junobuild/core";
import { useSatelliteReady, useAuth } from "../app/client-providers";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { MdOutlineContentCopy } from "react-icons/md";
import { Principal } from "@dfinity/principal";
import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory as icrc1IdlFactory } from "../icrc1_idl";
import { GrUpdate } from "react-icons/gr";

type Record = {
  hello: string;
};

export default function Home() {

  const [initError, setInitError] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const [icpBalance, setIcpBalance] = useState<string | null>(null);

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

  // ICP残高取得関数
  const fetchIcpBalance = async () => {
    if (!user?.owner) return;
    try {
      const isLocal = typeof window !== "undefined" && window.location.hostname === "localhost";
      const agent = new HttpAgent({
        host: isLocal ? "http://localhost:5987" : "https://icp-api.io"
      });
      if (isLocal) {
        await agent.fetchRootKey();
      }
      const actor = Actor.createActor(icrc1IdlFactory, {
        agent,
        canisterId: "ryjl3-tyaaa-aaaaa-aaaba-cai",
      });
      const result = await actor.icrc1_balance_of({ owner: Principal.fromText(user.owner || "") });
      // e8s → ICP, 小数点以下4桁まで
      const icp = Number(result) / 100_000_000;
      setIcpBalance(icp.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 }));
    } catch (e) {
      console.error('ICP残高取得失敗:', e);
      setIcpBalance("取得失敗");
    }
  };

  useEffect(() => {
    if (user?.owner) {
      fetchIcpBalance();
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
    <main >
      <div className="flex justify-end pt-4 pr-4">
        <button
          onClick={handleLogout}
          className="border p-2 rounded flex items-center   hover:bg-gray-600"
          aria-label="logout"
        >
          logout
        </button>
      </div>
      <div className="m-4">

        {/* プリンシパルアドレス表示とコピー・QRコード */}
        {user && (
          <div className=" rounded-lg flex flex-col gap-2 items-start bg-lavender-blue-500 text-white p-5">
            <p >残高</p>

            <div className="flex items-center gap-2">
              <p className="p-1 font-thin text-sm rounded-sm inline-block bg-lavender-blue-300 border-b-lavender-blue-300">
                ICP
              </p>
              <p className="flex items-center gap-3 text-xl px-2">
                {icpBalance !== null ? icpBalance : "取得中..."}
                <button onClick={fetchIcpBalance} className=" ml-1 p-1 hover:bg-gray-200 rounded" aria-label="更新">
                  <GrUpdate />
                </button>
              </p>
            </div>
       

            <p >Principal</p>

              
            
            <div className="border rounded flex items-center gap-2 bg-lavender-blue-300" >
              <button
                onClick={handleCopy}
                className="px-1 rounded  hover:bg-blue-300 text-xs flex items-center"
                aria-label="コピー"
              >
                <span className="font-thin  text-xs  pr-2 py-1  select-all text-left">{user.owner} </span>
                <MdOutlineContentCopy className="text-lg w-5 h-5 min-w-5 min-h-5" />
              </button>
              {copied && <span className=" text-xs ml-1 pr-2">コピーしました</span>}
            </div>

            <div>
              <p >QR Code</p>
            </div>
            {qrUrl && (
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="focus:outline-none"
                  aria-label="QRコードを拡大"
                >
                  <img src={qrUrl} alt="Principal QR" className="w-32 h-32 border rounded block mx-auto" />
                </button>
                <div className="flex  gap-2 ">
                  <button className="px-4 py-2 bg-lavender-blue-300 text-lavender-blue-900 rounded hover:bg-lavender-blue-400 font-thin text-sm">Send</button>
                  <button className="px-4 py-2 bg-lavender-blue-300 text-lavender-blue-900 rounded hover:bg-lavender-blue-400 font-thin text-sm">Scan</button>
                </div>
              </div>
            )}
            {/* モーダル */}
            {modalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" style={{backdropFilter: 'blur(2px)'}}>
                <div ref={modalRef} className="bg-white p-6 rounded shadow-lg flex flex-col items-center">
                  <img src={qrUrl!} alt="Principal QR Large" className="w-72 h-72 border rounded mb-4" />
                  <button
                    onClick={() => setModalOpen(false)}
                    className=" px-4  rounded hover:bg-blue-600 text-black"
                  >
                    X Close
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2 p-5 mt-2 rounded-lg bg-gray-300 text-white">
          <p>Transactions</p>
        </div>
      </div>
    </main>
  );
}