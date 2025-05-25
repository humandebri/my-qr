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
import { IoIosSend } from "react-icons/io";
import { AuthClient } from "@dfinity/auth-client";

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
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const sendModalRef = useRef<HTMLDivElement>(null);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

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
      // 認証されたアイデンティティを取得
      const authClient = await AuthClient.create();
      const identity = authClient.getIdentity();

      const isLocal = typeof window !== "undefined" && window.location.hostname === "localhost";
      const agent = new HttpAgent({
        host: isLocal ? "http://localhost:5987" : "https://icp-api.io",
        identity, // 認証されたアイデンティティを設定
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

  // 送金モーダル外クリックで閉じる
  useEffect(() => {
    if (!sendModalOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (sendModalRef.current && !sendModalRef.current.contains(e.target as Node)) {
        setSendModalOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [sendModalOpen]);

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

  const handleSend = () => {
    setSendModalOpen(true);
  };

  const handleMaxAmount = () => {
    if (icpBalance) {
      // コンマを除去して数値として扱う
      const balance = parseFloat(icpBalance.replace(/,/g, ''));
      setAmount(balance.toString());
    }
  };

  const handleSendSubmit = async () => {
    if (!user?.owner || !toAddress || !amount) {
      setSendError("全ての項目を入力してください");
      return;
    }

    try {
      setSendLoading(true);
      setSendError(null);
      setSendSuccess(null);

      // バリデーション
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        setSendError("有効な金額を入力してください");
        return;
      }

      // Principal validation
      let toPrincipal: Principal;
      try {
        toPrincipal = Principal.fromText(toAddress);
      } catch (e) {
        setSendError("無効なPrincipalアドレスです");
        return;
      }

      // ICP → e8s変換 (1 ICP = 100,000,000 e8s)
      const amountE8s = BigInt(Math.floor(amountNum * 100_000_000));

      // 認証されたアイデンティティを取得
      const authClient = await AuthClient.create();
      const identity = authClient.getIdentity();

      const isLocal = typeof window !== "undefined" && window.location.hostname === "localhost";
      const agent = new HttpAgent({
        host: isLocal ? "http://localhost:5987" : "https://icp-api.io",
        identity, // 認証されたアイデンティティを設定
      });
      if (isLocal) {
        await agent.fetchRootKey();
      }

      const actor = Actor.createActor(icrc1IdlFactory, {
        agent,
        canisterId: "ryjl3-tyaaa-aaaaa-aaaba-cai",
      });

      const transferArgs = {
        to: {
          owner: toPrincipal,
          subaccount: [],
        },
        amount: amountE8s,
        fee: [],
        memo: [],
        from_subaccount: [],
        created_at_time: [],
      };

      const result = await actor.icrc1_transfer(transferArgs);

      if ('Ok' in (result as any)) {
        setSendSuccess(`送金が完了しました！ブロック番号: ${(result as any).Ok.toString()}`);
        setToAddress("");
        setAmount("");
        // 残高を更新
        await fetchIcpBalance();
        // 数秒後にモーダルを閉じる
        setTimeout(() => {
          setSendModalOpen(false);
          setSendSuccess(null);
        }, 3000);
      } else {
        // エラーハンドリング
        const error = (result as any).Err;
        if ('InsufficientFunds' in error) {
          setSendError(`残高不足です。利用可能残高: ${Number(error.InsufficientFunds.balance) / 100_000_000} ICP`);
        } else if ('BadFee' in error) {
          setSendError(`手数料が不正です。期待される手数料: ${Number(error.BadFee.expected_fee) / 100_000_000} ICP`);
        } else if ('GenericError' in error) {
          setSendError(`エラー: ${error.GenericError.message}`);
        } else {
          setSendError('送金に失敗しました');
        }
      }
    } catch (e) {
      console.error('送金エラー:', e);
      setSendError('送金中にエラーが発生しました');
    } finally {
      setSendLoading(false);
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
                  <button 
                    onClick={handleSend}
                    className="px-4 py-2 bg-lavender-blue-300 rounded hover:bg-lavender-blue-400 font-thin text-sm flex items-center gap-1"
                  >
                    <IoIosSend />
                    Send
                  </button>
                  <button className="px-4 py-2 bg-lavender-blue-300  rounded hover:bg-lavender-blue-400 font-thin text-sm">Scan</button>
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

      {/* 送金モーダル */}
      {sendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div ref={sendModalRef} className="bg-white  p-6 rounded shadow-lg w-96">
            <h2 className="text-lg font-bold mb-4">Send ICP</h2>
                 
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">To Address</label>
              <input
                type="text"
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
                placeholder="Enter recipient Principal"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Amount (ICP)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0000"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-black"
                />
                <button
                  onClick={handleMaxAmount}
                  className="px-3 py-2 bg-lavender-blue-300 text-lavender-blue-900 rounded-md hover:bg-lavender-blue-400 text-sm font-thin"
                >
                  Max
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Available: {icpBalance !== null ? icpBalance : "取得中..."} ICP</p>
            </div>
            
            {sendError && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
                {sendError}
              </div>
            )}
            
            {sendSuccess && (
              <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded text-green-700 text-sm">
                {sendSuccess}
              </div>
            )}
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setSendModalOpen(false)}
                className="px-4 py-2 bg-lavender-blue-300 text-lavender-blue-900 rounded hover:bg-lavender-blue-400 font-thin"
                disabled={sendLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleSendSubmit}
                className="px-4 py-2 bg-lavender-blue-300 text-lavender-blue-900 rounded hover:bg-lavender-blue-400 font-thin disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={sendLoading}
              >
                {sendLoading ? "送金中..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}