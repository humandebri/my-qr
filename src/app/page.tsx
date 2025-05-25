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
import { idlFactory as icpIndexIdlFactory } from "../icp_index_idl";
import { principalToAccountIdentifier } from "../utils/accountIdentifier";
import { AiOutlineScan } from "react-icons/ai";

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
  const [transactions, setTransactions] = useState<any[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const scanModalRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [qrScanner, setQrScanner] = useState<any>(null);

  const isReady = useSatelliteReady();
  const { user, authLoaded } = useAuth();
  const router = useRouter();

  // 認証されたLedger Actorを作成する共通関数
  const createAuthenticatedLedgerActor = async () => {
    // crypto APIの存在確認
    if (typeof window === "undefined" || !window.crypto || !window.crypto.subtle) {
      throw new Error("この機能はセキュアな環境（HTTPS）またはサポートされたブラウザでのみ利用可能です。");
    }

    const authClient = await AuthClient.create();
    const identity = authClient.getIdentity();

    const isLocal = typeof window !== "undefined" && window.location.hostname === "localhost";
    const agent = new HttpAgent({
      host: isLocal ? "http://localhost:5987" : "https://icp-api.io",
      identity,
    });
    
    if (isLocal) {
      await agent.fetchRootKey();
    }

    return Actor.createActor(icrc1IdlFactory, {
      agent,
      canisterId: "ryjl3-tyaaa-aaaaa-aaaba-cai",
    });
  };

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
      setBalanceLoading(true);
      const actor = await createAuthenticatedLedgerActor();
      const result = await actor.icrc1_balance_of({ owner: Principal.fromText(user.owner || "") });
      // e8s → ICP, 小数点以下4桁まで
      const icp = Number(result) / 100_000_000;
      setIcpBalance(icp.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 }));
    } catch (e) {
      console.error('ICP残高取得失敗:', e);
      setIcpBalance("取得失敗");
    } finally {
      setBalanceLoading(false);
    }
  };

  // トランザクション履歴取得関数
  const fetchTransactions = async () => {
    if (!user?.owner) return;
    try {
      setTransactionsLoading(true);
      
      const authClient = await AuthClient.create();
      const identity = authClient.getIdentity();

      const isLocal = typeof window !== "undefined" && window.location.hostname === "localhost";
      const agent = new HttpAgent({
        host: isLocal ? "http://localhost:5987" : "https://icp-api.io",
        identity,
      });
      
      if (isLocal) {
        await agent.fetchRootKey();
      }

      const indexActor = Actor.createActor(icpIndexIdlFactory, {
        agent,
        canisterId: "qhbym-qaaaa-aaaaa-aaafq-cai",
      });

      // PrincipalをAccount Identifierに変換
      const accountIdentifier = principalToAccountIdentifier(Principal.fromText(user.owner));
      
      const result = await indexActor.get_account_identifier_transactions({
        max_results: BigInt(5),
        start: [],
        account_identifier: accountIdentifier,
      });

      if ('Ok' in (result as any)) {
        setTransactions((result as any).Ok.transactions);
      } else {
        console.error('トランザクション取得失敗:', (result as any).Err.message);
      }
    } catch (e) {
      console.error('トランザクション取得エラー:', e);
    } finally {
      setTransactionsLoading(false);
    }
  };

  // 日時変換関数
  const formatTimestamp = (timestampNanos: bigint) => {
    const date = new Date(Number(timestampNanos) / 1_000_000);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) + ', ' + date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // アドレス省略表示
  const formatAddress = (address: string) => {
    return `${address.slice(0, 7)}...${address.slice(-7)}`;
  };

  // モバイル用アドレス省略表示（頭のみ）
  const formatAddressMobile = (address: string) => {
    return `${address.slice(0, 7)}...`;
  };

  // トランザクション方向判定
  const getTransactionDirection = (transaction: any, userAccountId: string) => {
    if ('Transfer' in transaction.operation) {
      const transfer = transaction.operation.Transfer;
      if (transfer.to === userAccountId) return 'Received';
      if (transfer.from === userAccountId) return 'Sent';
    }
    return 'Unknown';
  };

  useEffect(() => {
    if (user?.owner) {
      fetchIcpBalance();
      fetchTransactions();
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

  // スキャンモーダル外クリックで閉じる
  useEffect(() => {
    if (!scanModalOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (scanModalRef.current && !scanModalRef.current.contains(e.target as Node)) {
        handleScanClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [scanModalOpen]);

  // スキャンモーダルが開いたときにカメラを開始
  useEffect(() => {
    if (scanModalOpen) {
      startCamera();
    }
  }, [scanModalOpen]);

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
    setScanModalOpen(true);
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

      const actor = await createAuthenticatedLedgerActor();

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
        // トランザクション履歴を更新
        await fetchTransactions();
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

  const handleScan = () => {
    setScanModalOpen(true);
  };

  const handleScanClose = () => {
    console.log('🔄 スキャンモーダルを閉じています...');
    setScanModalOpen(false);
    setScanResult(null);
    
    // QRスキャナーを停止
    if (qrScanner) {
      try {
        console.log('🛑 QRスキャナーを停止中...');
        qrScanner.stop();
        qrScanner.destroy();
        console.log('✅ QRスキャナー停止完了');
      } catch (e) {
        console.warn('QRスキャナー停止時のエラー:', e);
      }
      setQrScanner(null);
    }
    
    // カメラストリームを停止
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => {
        console.log('🎥 カメラトラックを停止:', track.label);
        track.stop();
      });
      videoRef.current.srcObject = null;
      console.log('✅ カメラストリーム停止完了');
    }
  };

  const startCamera = async () => {
    try {
      console.log('🎥 カメラ開始を試行中...');
      
      // 既存のストリームがあれば停止
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // videoのloadedmetadataイベントを待つ
        await new Promise<void>((resolve) => {
          const handleLoadedMetadata = () => {
            videoRef.current?.removeEventListener('loadedmetadata', handleLoadedMetadata);
            resolve();
          };
          videoRef.current?.addEventListener('loadedmetadata', handleLoadedMetadata);
        });
        
        await videoRef.current.play();
        console.log('✅ カメラストリーム開始成功');
        
        // カメラが完全に準備できてからQRスキャンを開始
        setTimeout(() => {
          if (scanModalOpen) { // モーダルがまだ開いている場合のみ
            startQRScanning();
          }
        }, 1500);
      }
    } catch (err) {
      console.error('❌ カメラアクセスエラー:', err);
      alert('カメラにアクセスできませんでした。ブラウザの設定を確認してください。');
    }
  };

  const startQRScanning = async () => {
    if (!videoRef.current) {
      console.warn('⚠️ videoRef.currentが存在しません');
      return;
    }
    
    if (qrScanner) {
      console.log('⚠️ 既存のQRスキャナーが存在します。停止して再作成します。');
      try {
        qrScanner.stop();
        qrScanner.destroy();
      } catch (e) {
        console.warn('既存スキャナー停止時のエラー:', e);
      }
      setQrScanner(null);
    }
    
    try {
      console.log('🔍 QRスキャナー初期化中...');
      const QrScanner = (await import('qr-scanner')).default;
      
      console.log('📁 QRスキャナークラス読み込み完了');
      console.log('🏗️ QrScanner version:', QrScanner.DEFAULT_CANVAS_SIZE);
      
      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          console.log('🎉 QRコード検出成功:', result.data);
          setScanResult(result.data);
          
          // スキャン結果の処理
          let address = result.data;
          
          // icp://principal/ プレフィックスを削除
          if (address.startsWith('icp://principal/')) {
            address = address.replace('icp://principal/', '');
            console.log('🔄 プレフィックス削除後:', address);
          }
          
          // スキャン成功後の処理
          try {
            scanner.stop();
            scanner.destroy();
          } catch (e) {
            console.warn('スキャナー停止時のエラー:', e);
          }
          setQrScanner(null);
          handleScanClose();
          
          // 送金先アドレスに設定して送金モーダルを開く
          setToAddress(address);
          setSendModalOpen(true);
        },
        {
          onDecodeError: (error) => {
            // デコードエラーのログを表示
            console.log('🔍 デコード試行中...', error);
          },
          highlightScanRegion: false, // 一旦無効にして全画面スキャン
          highlightCodeOutline: true,
          returnDetailedScanResult: true,
          maxScansPerSecond: 5, // フレームレートを上げる
        }
      );
      
      setQrScanner(scanner);
      
      console.log('▶️ QRスキャナー開始前...');
      
      // Workerの詳細デバッグ
      scanner.start().then(() => {
        console.log('✅ QRスキャナー開始成功 - Worker起動完了');
        
        // Workerのメッセージを監視
        const scannerWithWorker = scanner as any;
        if (scannerWithWorker.$worker) {
          console.log('👷 Worker インスタンス確認完了');
          scannerWithWorker.$worker.addEventListener('message', (e: MessageEvent) => {
            console.log('📨 Worker message:', e.data);
          });
          
          scannerWithWorker.$worker.addEventListener('error', (e: ErrorEvent) => {
            console.error('❌ Worker error:', e);
          });
        } else {
          console.warn('⚠️ Worker インスタンスが見つかりません');
        }
        
        // デコード状況を定期的にチェック
        const debugInterval = setInterval(() => {
          if (!scanModalOpen) {
            clearInterval(debugInterval);
            return;
          }
          console.log('🔄 スキャン中... (画面に明るく大きなQRコードを映してください)');
        }, 3000);
        
      }).catch((err: Error) => {
        console.error('❌ QRスキャナー開始失敗:', err);
        if (err.message.includes('NotAllowedError')) {
          alert('カメラへのアクセスが拒否されました。ブラウザの設定でカメラアクセスを許可してください。');
        } else if (err.message.includes('CSP')) {
          alert('セキュリティポリシー(CSP)によりWorkerが起動できません。');
        }
      });
      
    } catch (err) {
      console.error('❌ QRスキャナーエラー:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      alert(`QRスキャナーの初期化に失敗しました: ${errorMessage}`);
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
                  <GrUpdate className={balanceLoading ? "animate-spin" : ""} />
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
                  <button 
                    onClick={handleScan}
                    className="px-4 py-2 bg-lavender-blue-300 rounded hover:bg-lavender-blue-400 font-thin text-sm flex items-center gap-1"
                  >
                    <AiOutlineScan />
                    Scan
                  </button>
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
          <div className="flex items-center justify-between">
            <p>Transactions</p>
            <button 
              onClick={fetchTransactions}
              className="px-3 py-1  text-gray-700 hover:bg-gray-100 rounded text-sm"
              disabled={transactionsLoading}
              aria-label="トランザクション更新"
            >
              <GrUpdate className={`text-white ${transactionsLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
          
          {transactionsLoading ? (
            <p className="text-center py-4">読み込み中...</p>
          ) : transactions.length > 0 ? (
            <div className="overflow-x-auto">
              {/* PC版テーブル */}
              <table className="w-full text-sm hidden md:table">
                <thead>
                  <tr className="border-b border-white">
                    <th className="text-left py-2">ID</th>
                    <th className="text-left py-2">Timestamp</th>
                    <th className="text-left py-2">From</th>
                    <th className="text-left py-2">To</th>
                    <th className="text-left py-2">Memo</th>
                    <th className="text-left py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const userAccountId = user?.owner ? principalToAccountIdentifier(Principal.fromText(user.owner)) : '';
                    const direction = getTransactionDirection(tx.transaction, userAccountId);
                    const transfer = 'Transfer' in tx.transaction.operation ? tx.transaction.operation.Transfer : null;
                    
                    return (
                      <tr key={tx.id.toString()} className="border-b border-white">
                        <td className="py-2">{tx.id.toString()}</td>
                        <td className="py-2">
                          {tx.transaction.timestamp?.[0] 
                            ? formatTimestamp(tx.transaction.timestamp[0].timestamp_nanos)
                            : 'N/A'
                          }
                        </td>
                        <td className="py-2">
                          {transfer ? formatAddress(transfer.from) : 'N/A'}
                        </td>
                        <td className="py-2">
                          {transfer ? formatAddress(transfer.to) : 'N/A'}
                        </td>
                        <td className="py-2">{direction}</td>
                        <td className="py-2">
                          {transfer 
                            ? `${(Number(transfer.amount.e8s) / 100_000_000).toFixed(4)} ICP`
                            : 'N/A'
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {/* モバイル版テーブル */}
              <table className="w-full text-sm md:hidden">
                <thead>
                  <tr className="border-b border-white">
                    <th className="text-left py-2">From</th>
                    <th className="text-left py-2">To</th>
                    <th className="text-left py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const transfer = 'Transfer' in tx.transaction.operation ? tx.transaction.operation.Transfer : null;
                    
                    return (
                      <tr key={tx.id.toString()} className="border-b border-white">
                        <td className="py-2">
                          {transfer ? formatAddressMobile(transfer.from) : 'N/A'}
                        </td>
                        <td className="py-2">
                          {transfer ? formatAddressMobile(transfer.to) : 'N/A'}
                        </td>
                        <td className="py-2">
                          {transfer 
                            ? `${(Number(transfer.amount.e8s) / 100_000_000).toFixed(4)} ICP`
                            : 'N/A'
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center py-4">トランザクションがありません</p>
          )}
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

      {/* QRスキャンモーダル */}
      {scanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div ref={scanModalRef} className="bg-white p-6 rounded shadow-lg w-96 max-w-[90vw]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-black">QRコードスキャン</h2>
              <button
                onClick={handleScanClose}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="relative bg-black rounded overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-64 object-cover"
                playsInline
                muted
                autoPlay
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-4 border-blue-400 rounded-lg animate-pulse"></div>
              </div>
              {/* スキャン状態表示 */}
              <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                {qrScanner ? 'スキャン中...' : 'カメラ準備中...'}
              </div>
            </div>
            
            <p className="text-center text-sm text-gray-600 mt-4">
              QRコードを青い枠内に合わせてください
            </p>
            
            {/* デバッグ情報表示 */}
            {scanResult && (
              <div className="mt-2 p-2 bg-green-100 rounded text-xs text-gray-700">
                <strong>検出結果:</strong> {scanResult}
              </div>
            )}
            
            {/* テスト用: 手動でアドレスを入力 */}
            <details className="mt-4">
              <summary className="text-xs text-gray-500 cursor-pointer">手動入力（テスト用）</summary>
              <input
                type="text"
                placeholder="Principal アドレスを入力"
                className="w-full mt-2 px-2 py-1 text-xs border rounded text-black"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const value = (e.target as HTMLInputElement).value;
                    if (value.trim()) {
                      setToAddress(value.trim());
                      handleScanClose();
                      setSendModalOpen(true);
                    }
                  }
                }}
              />
              <p className="text-xs text-gray-400 mt-1">Enterキーで送金画面へ</p>
              

            </details>
          </div>
        </div>
      )}
    </main>
  );
}