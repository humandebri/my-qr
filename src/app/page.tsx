"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
import { principalToAccountIdentifierString } from "../utils/accountIdentifier";
import { AiOutlineScan } from "react-icons/ai";
import Image from "next/image";
import { AUTH_CONFIG } from "../config/auth";
import Link from "next/link";
import { useStamp } from '@/components/context/StampContext';
import { HiDownload } from "react-icons/hi";
import { PiStampLight } from "react-icons/pi";

// 型定義
interface TransferOperation {
  Transfer: {
    from: string;
    to: string;
    amount: { e8s: bigint };
    fee: { e8s: bigint };
  };
}

interface MintOperation {
  Mint: {
    to: string;
    amount: { e8s: bigint };
  };
}

interface BurnOperation {
  Burn: {
    from: string;
    amount: { e8s: bigint };
  };
}

type Operation = TransferOperation | MintOperation | BurnOperation;

interface Transaction {
  id: bigint;
  transaction: {
    operation: Operation;
    timestamp?: [{ timestamp_nanos: bigint }];
    created_at_time?: [{ timestamp_nanos: bigint }];
    memo: bigint;
  };
}

interface IndexResult {
  Ok: {
    transactions: Transaction[];
    balance: bigint;
    oldest_tx_id?: [bigint];
  };
}

export default function Home() {
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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const scanModalRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<unknown>(null);
  const [scanTimeout, setScanTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // トランザクションフィルタ用のstate
  const [txFilter, setTxFilter] = useState<'all' | 'sent' | 'received'>('all');
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  
  // 自動スタンプ設定（localStorageから取得）
  const [autoStampSettings, setAutoStampSettings] = useState<{
    enabled: boolean;
    selectedCardId: string | null;
  }>({ enabled: false, selectedCardId: null });

  // スタンプ機能を使用
  const { addStamp, addAutoStamp } = useStamp();

  const isReady = useSatelliteReady();
  const { user, authLoaded } = useAuth();
  const router = useRouter();

  // 自動スタンプ設定をlocalStorageから読み込み
  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`autoStamp_${user.key}`);
      if (saved) {
        try {
          setAutoStampSettings(JSON.parse(saved));
        } catch (e) {
          console.warn('自動スタンプ設定の読み込みエラー:', e);
        }
      }
    }
  }, [user]);

  // ✅ videoの準備状態を厳密にチェックする共通関数
  const waitForVideoReady = async (videoEl: HTMLVideoElement): Promise<void> => {
    return new Promise((resolve) => {
      const checkReady = () => {
        if (
          videoEl.readyState >= 3 &&
          videoEl.videoWidth > 0 &&
          videoEl.videoHeight > 0
        ) {
          console.log('📐 video完全準備完了:', {
            readyState: videoEl.readyState,
            videoWidth: videoEl.videoWidth,
            videoHeight: videoEl.videoHeight
          });
          resolve();
        } else {
          console.debug('⏳ video準備待機中:', {
            readyState: videoEl.readyState,
            videoWidth: videoEl.videoWidth,
            videoHeight: videoEl.videoHeight
          });
          requestAnimationFrame(checkReady);
        }
      };
      checkReady();
    });
  };

  // 認証されたLedger Actorを作成する共通関数
  const createAuthenticatedLedgerActor = async () => {
    // crypto APIの存在確認
    if (typeof window === "undefined" || !window.crypto || !window.crypto.subtle) {
      throw new Error("この機能はセキュアな環境（HTTPS）またはサポートされたブラウザでのみ利用可能です。");
    }

    const authClient = await AuthClient.create({
      idleOptions: {
        idleTimeout: AUTH_CONFIG.IDLE_TIMEOUT,
        disableDefaultIdleCallback: AUTH_CONFIG.DISABLE_DEFAULT_IDLE_CALLBACK,
      }
    });
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

  // ICP残高取得関数
  const fetchIcpBalance = useCallback(async () => {
    if (!user?.owner) return;
    try {
      setBalanceLoading(true);
      const actor = await createAuthenticatedLedgerActor();
      const result = await actor.icrc1_balance_of({ 
        owner: Principal.fromText(user.owner || ""),
        subaccount: []
      });
      // e8s → ICP, 小数点以下4桁まで
      const icp = Number(result) / 100_000_000;
      setIcpBalance(icp.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 }));
    } catch (e) {
      console.error('ICP残高取得失敗:', e);
      setIcpBalance("取得失敗");
    } finally {
      setBalanceLoading(false);
    }
  }, [user?.owner]);

  // トランザクション履歴取得関数
  const fetchTransactions = useCallback(async () => {
    if (!user?.owner) return;
    try {
      setTransactionsLoading(true);
      
      const authClient = await AuthClient.create({
        idleOptions: {
          idleTimeout: AUTH_CONFIG.IDLE_TIMEOUT,
          disableDefaultIdleCallback: AUTH_CONFIG.DISABLE_DEFAULT_IDLE_CALLBACK,
        }
      });
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

      // PrincipalをAccount Identifierに変換（文字列版）
      const accountIdentifier = principalToAccountIdentifierString(Principal.fromText(user.owner));
      
      const result = await indexActor.get_account_identifier_transactions({
        max_results: BigInt(10),
        start: [],
        account_identifier: accountIdentifier,
      }) as IndexResult | { Err: { message: string } };

      if ('Ok' in result) {
        console.log('🔍 取得したトランザクションデータ:', result.Ok.transactions);
        console.log('🔍 最初のトランザクション詳細:', result.Ok.transactions[0]);
        setTransactions(result.Ok.transactions);
      } else {
        console.error('トランザクション取得失敗:', result.Err.message);
      }
    } catch (e) {
      console.error('トランザクション取得エラー:', e);
    } finally {
      setTransactionsLoading(false);
    }
  }, [user?.owner]);

  // トランザクションのフィルタリング
  useEffect(() => {
    if (!user?.owner) return;
    
    const userAccountId = principalToAccountIdentifierString(Principal.fromText(user.owner));
    
    const filtered = transactions.filter(tx => {
      const direction = getTransactionDirection(tx.transaction, userAccountId);
      
      if (txFilter === 'all') return true;
      if (txFilter === 'sent' && direction === 'Sent') return true;
      if (txFilter === 'received' && direction === 'Received') return true;
      
      return false;
    });
    
    setFilteredTransactions(filtered);
  }, [transactions, txFilter, user?.owner]);

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
    if (address === 'N/A') return 'N/A';
    return `${address.slice(0, 7)}...${address.slice(-7)}`;
  };

  // モバイル用アドレス省略表示（頭のみ）
  const formatAddressMobile = (address: string) => {
    if (address === 'N/A') return 'N/A';
    return `${address.slice(0, 7)}...`;
  };

  // トランザクション方向判定
  const getTransactionDirection = (transaction: Transaction['transaction'], userAccountId: string) => {
    const operation = transaction.operation;
    if ('Transfer' in operation) {
      const transfer = operation.Transfer;
      if (transfer.to === userAccountId) return 'Received';
      if (transfer.from === userAccountId) return 'Sent';
    } else if ('Mint' in operation) {
      const mint = operation.Mint;
      if (mint.to === userAccountId) return 'Minted';
    } else if ('Burn' in operation) {
      const burn = operation.Burn;
      if (burn.from === userAccountId) return 'Burned';
    }
    return 'Unknown';
  };

  // トランザクションから送信者を取得
  const getTransactionFrom = (operation: Operation) => {
    if ('Transfer' in operation) return operation.Transfer.from;
    if ('Burn' in operation) return operation.Burn.from;
    return 'N/A';
  };

  // トランザクションから受信者を取得
  const getTransactionTo = (operation: Operation) => {
    if ('Transfer' in operation) return operation.Transfer.to;
    if ('Mint' in operation) return operation.Mint.to;
    return 'N/A';
  };

  // トランザクションから金額を取得
  const getTransactionAmount = (operation: Operation) => {
    if ('Transfer' in operation) return operation.Transfer.amount.e8s;
    if ('Mint' in operation) return operation.Mint.amount.e8s;
    if ('Burn' in operation) return operation.Burn.amount.e8s;
    return BigInt(0);
  };

  const handleScanClose = useCallback(() => {
    console.log('🚪 handleScanClose開始');
    setScanModalOpen(false);
    setScanResult(null);
    
    // タイムアウトをクリア
    if (scanTimeout) {
      clearTimeout(scanTimeout);
      setScanTimeout(null);
      console.log('⏰ scanTimeout cleared in handleScanClose');
    }
    
    // QRスキャナーを停止
    if (scannerRef.current) {
      try {
        (scannerRef.current as { stop: () => void; destroy?: () => void; _destroyed?: boolean }).stop();
        // 必要な場合のみdestroy（完全にクリーンアップしたい場合）
        const scanner = scannerRef.current as { destroy?: () => void; _destroyed?: boolean };
        if (scanner._destroyed === false && scanner.destroy) {
          scanner.destroy();
        }
        console.log('🛑 QRスキャナー停止・クリーンアップ完了');
      } catch (e) {
        console.warn('QRスキャナー停止時のエラー:', e);
      }
      scannerRef.current = null;
    }
    
    // カメラストリームを停止
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      console.log('📹 カメラストリーム停止完了');
    }
    
    console.log('✅ handleScanClose完了');
  }, [scanTimeout]);

  const startCamera = useCallback(async () => {
    try {
      console.log('🎥 カメラ開始中...');
      
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
        await waitForVideoReady(videoRef.current);
        
        await videoRef.current.play();
        console.log('✅ カメラ準備完了');
        
        // ★ 少し遅延してからQRスキャンを開始
        // startQRScanningは後で定義されるため、直接呼び出せない
      }
    } catch (err) {
      console.error('❌ カメラアクセスエラー:', err);
      alert('カメラにアクセスできませんでした。ブラウザの設定を確認してください。');
    }
  }, []);

  const startQRScanning = useCallback(async () => {
    if (!videoRef.current) {
      console.warn('⚠️ videoRef.currentが存在しません');
      return;
    }
    
    if (scannerRef.current) {
      try {
        (scannerRef.current as { stop: () => void }).stop();
      } catch (e) {
        console.warn('既存スキャナー停止時のエラー:', e);
      }
      scannerRef.current = null;
    }
    
    try {
      console.log('🔍 QRスキャナー初期化中...');
      
      // ✅ 推奨フロー: video.play() の後に canplay イベントを待つ
      await waitForVideoReady(videoRef.current);
      
      console.log('📹 video準備完了 - QrScanner初期化開始');
      const QrScanner = (await import('qr-scanner')).default;
      
      const onDecode = async (result: { data: string }) => {
        console.log('🎉 QRコード検出成功:', result.data);
        setScanResult(result.data);
        
        // スキャン成功時はタイムアウトをクリア
        if (scanTimeout) {
          clearTimeout(scanTimeout);
          setScanTimeout(null);
          console.log('⏰ タイムアウトクリア完了');
        }
        
        // スキャン結果の処理
        const scannedData = result.data;
        console.log('📋 スキャン結果:', scannedData);
        
        // スタンプQRコードかどうかをチェック
        if (scannedData.startsWith('stamp://')) {
          // スタンプQRコードの処理
          const stampId = scannedData.replace('stamp://', '');
          console.log('🎯 スタンプID検出:', stampId);
          
          try {
            await addStamp(stampId);
            alert('スタンプを追加しました！');
          } catch (err) {
            console.error('スタンプ追加エラー:', err);
            alert(err instanceof Error ? err.message : 'スタンプの追加に失敗しました');
          }
          
          // スキャンモーダルを閉じる
          handleScanClose();
          return; // 送金処理をスキップ
        }
        
        // 従来のプリンシパルアドレス処理
        let address = scannedData;
        
        // icp://principal/ プレフィックスを削除
        if (address.startsWith('icp://principal/')) {
          address = address.replace('icp://principal/', '');
          console.log('🔧 プレフィックス削除後:', address);
        }
        
        // スキャン成功後の処理（軽量なstopのみ）
        try {
          (scannerRef.current as { stop: () => void }).stop();
          console.log('⏹️ スキャナー停止完了');
          // destroyはリソース節約のため省略
        } catch (e) {
          console.warn('スキャナー停止時のエラー:', e);
        }
        scannerRef.current = null;
        console.log('🗑️ スキャナーstate更新完了');
        
        // 送金先アドレスに設定
        console.log('💰 送金先アドレス設定中:', address);
        setToAddress(address);
        
        // スキャンモーダルを閉じる
        console.log('🚪 スキャンモーダルを閉じています...');
        handleScanClose();
        
        // 送金モーダルを開く（少し遅延して確実に）
        console.log('💸 送金モーダルを開いています...');
        setTimeout(() => {
          setSendModalOpen(true);
          console.log('✅ 送金モーダル表示完了');
        }, 100);
        
        console.log('✅ onDecode処理完了');
      };
      
      // QrScanner初期化（videoが完全に準備できた後）
      const scanner = new QrScanner(
        videoRef.current,
        onDecode,
        {
          onDecodeError: (error: unknown) => {
            // エラーログは最小限に（デバッグ時のみ表示）
            if (process.env.NODE_ENV === 'development') {
              console.debug('QR decode error:', error);
            }
          },
          preferredCamera: 'environment',
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 5,
          returnDetailedScanResult: true
        }
      );
      
      scannerRef.current = scanner;
      
      // スキャナー開始
      await scanner.start();
      
      // ★ 追加: ハイライト描画を確実に行うための処理
      await new Promise<void>((resolve) => {
        // 複数フレーム待機してからリサイズイベントを発火
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // DOMの更新を確実に反映
            if (videoRef.current) {
              // 強制的にリサイズイベントを発火してハイライトを再描画
              window.dispatchEvent(new Event('resize'));
              
              // さらに確実にするため、少し遅延してもう一度
              setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
                console.log('✅ QRスキャナー開始成功 - ハイライト強制更新完了');
              }, 100);
            }
            resolve();
          });
        });
      });
      
      // ✅ シンプルなフォールバック：1回だけ再試行
      setTimeout(async () => {
        // スキャンが成功していない場合のみ1回だけ再試行
        if (scanModalOpen && !scanResult && scannerRef.current) {
          try {
            console.log('🔄 スキャナー軽量再起動を実行');
            await (scannerRef.current as { stop: () => Promise<void>; start: () => Promise<void> }).stop();
            await (scannerRef.current as { stop: () => Promise<void>; start: () => Promise<void> }).start();
            window.dispatchEvent(new Event('resize'));
            console.log('✅ フォールバック再起動完了');
          } catch (e) {
            console.warn('フォールバック再起動失敗:', e);
          }
        }
      }, 1200); // 2秒後に1回だけ（5秒から短縮）
      
    } catch (err) {
      console.error('❌ QRスキャナーエラー:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      // より詳細なエラー情報を提供
      let userFriendlyMessage = 'QRスキャナーの初期化に失敗しました';
      if (errorMessage.includes('worker')) {
        userFriendlyMessage = 'ブラウザの設定によりQRスキャナーが制限されています。ページを再読み込みしてみてください。';
      } else if (errorMessage.includes('import')) {
        userFriendlyMessage = 'QRスキャナーライブラリの読み込みに失敗しました。ネットワーク接続を確認してください。';
      } else if (errorMessage.includes('NotAllowedError')) {
        userFriendlyMessage = 'カメラのアクセス許可が必要です';
      } else if (errorMessage.includes('NotFoundError')) {
        userFriendlyMessage = 'カメラが見つかりません';
      }
      
      alert(`${userFriendlyMessage}\n\n技術的詳細: ${errorMessage}`);
    }
  }, [scanModalOpen, scanResult, scanTimeout, handleScanClose, addStamp]);

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

  useEffect(() => {
    if (user?.owner) {
      fetchIcpBalance();
      fetchTransactions();
    }
  }, [user?.owner, fetchIcpBalance, fetchTransactions]);

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
  }, [scanModalOpen, handleScanClose]);

  // スキャンモーダルが開いたときにカメラを開始
  useEffect(() => {
    if (scanModalOpen) {
      startCamera().then(() => {
        // カメラ起動後にQRスキャンを開始
        setTimeout(() => {
          if (scanModalOpen && videoRef.current) {
            startQRScanning();
          }
        }, 100);
      });
    }
  }, [scanModalOpen, startCamera, startQRScanning]);

  // ✅ タブ復帰時の再スキャン強制開始
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && scanModalOpen && videoRef.current) {
        console.log('👀 タブ復帰 → 再スキャン強制開始');
        // 少し遅延してからスキャンを再開始
        setTimeout(() => {
          if (scanModalOpen && videoRef.current) {
            startQRScanning();
          }
        }, 500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [scanModalOpen, startQRScanning]);

  // isReadyとauthLoadedが両方trueになるまで何も表示しない
  if (!isReady || !authLoaded) {
    return null;
  }
  if (!user) {
    return null;
  }


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
      // 送金手数料0.0001 ICPを差し引く
      const fee = 0.0001;
      const maxSendableAmount = Math.max(0, balance - fee);
      setAmount(maxSendableAmount.toFixed(4));
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
      } catch {
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

      const result = await actor.icrc1_transfer(transferArgs) as 
        | { Ok: bigint }
        | { Err: { InsufficientFunds: { balance: bigint } } | { BadFee: { expected_fee: bigint } } | { GenericError: { message: string } } };

      if ('Ok' in result) {
        setSendSuccess(`送金が完了しました！ブロック番号: ${result.Ok.toString()}`);
        
        // 自動スタンプ機能：支払いが成功した場合のみスタンプを押す
        if (autoStampSettings.enabled && autoStampSettings.selectedCardId) {
          try {
            await addAutoStamp(toAddress, autoStampSettings.selectedCardId);
            console.log('🎯 自動スタンプが押されました');
          } catch (stampError) {
            console.warn('自動スタンプエラー:', stampError);
            // スタンプエラーは支払い成功には影響しない
          }
        }
        
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
        const error = result.Err;
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

  const handleDownloadQR = () => {
    if (qrUrl && user?.owner) {
      const link = document.createElement('a');
      link.download = `wallet-qr-${user.owner.slice(0, 8)}.png`;
      link.href = qrUrl;
      link.click();
    }
  };

  // ログイン済みの場合のみUIを表示
  return (
    <main>
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
              <div className="grid grid-cols-2 gap-4 items-center">
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="focus:outline-none"
                  aria-label="QRコードを拡大"
                >
                  <Image src={qrUrl} alt="Principal QR" width={128} height={128} className="w-full max-w-[128px] h-auto border rounded block" />
                </button>
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={handleSend}
                    className="px-4 py-2 bg-lavender-blue-300 rounded hover:bg-lavender-blue-400 font-thin text-sm flex items-center gap-1 justify-center"
                  >
                    <IoIosSend />
                    Send
                  </button>
                  <button 
                    onClick={handleScan}
                    className="px-4 py-2 bg-lavender-blue-300 rounded hover:bg-lavender-blue-400 font-thin text-sm flex items-center gap-1 justify-center"
                  >
                    <AiOutlineScan />
                    Scan
                  </button>
                  <Link 
                    href="/stamps"
                    className="px-4 py-2 bg-lavender-blue-300 rounded hover:bg-lavender-blue-400 font-thin text-sm flex items-center gap-1 justify-center"
                  >
                    <PiStampLight className="w-5 h-5" />
                    Stamps
                  </Link>
                </div>
              </div>
            )}
            {/* モーダル */}
            {modalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" style={{backdropFilter: 'blur(2px)'}}>
                <div ref={modalRef} className="bg-white p-6 rounded shadow-lg flex flex-col items-center">
                  <Image src={qrUrl!} alt="Principal QR Large" width={288} height={288} className="w-72 h-72 border rounded mb-4" />
                  <div className="flex gap-2">
                    <button
                      onClick={handleDownloadQR}
                      className="px-4 py-2 bg-lavender-blue-500 text-white rounded hover:bg-lavender-blue-600 flex items-center gap-2"
                    >
                      <HiDownload className="w-5 h-5" />
                      Download
                    </button>
                    <button
                      onClick={() => setModalOpen(false)}
                      className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 text-black"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2 p-5 mt-2 rounded-lg bg-gray-300 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-700 font-semibold">Transactions</p>
            <button 
              onClick={fetchTransactions}
              className="px-3 py-1  text-gray-700 hover:bg-gray-100 rounded text-sm"
              disabled={transactionsLoading}
              aria-label="トランザクション更新"
            >
              <GrUpdate className={`text-white ${transactionsLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
          
          {/* フィルターボタン */}
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setTxFilter('all')}
              className={`px-3 py-1 rounded text-sm ${
                txFilter === 'all'
                  ? 'bg-lavender-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              All ({transactions.length})
            </button>
            <button
              onClick={() => setTxFilter('received')}
              className={`px-3 py-1 rounded text-sm ${
                txFilter === 'received'
                  ? 'bg-lavender-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Received
            </button>
            <button
              onClick={() => setTxFilter('sent')}
              className={`px-3 py-1 rounded text-sm ${
                txFilter === 'sent'
                  ? 'bg-lavender-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Sent
            </button>
          </div>
          
          {transactionsLoading ? (
            <p className="text-center py-4">読み込み中...</p>
          ) : filteredTransactions.length > 0 ? (
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
                  {filteredTransactions.map((tx) => {
                    const userAccountId = user?.owner ? principalToAccountIdentifierString(Principal.fromText(user.owner)) : '';
                    const direction = getTransactionDirection(tx.transaction, userAccountId);
                    const operation = tx.transaction.operation;
                    
                    return (
                      <tr key={tx.id.toString()} className="border-b border-white">
                        <td className="py-2">{tx.id.toString()}</td>
                        <td className="py-2">
                          {tx.transaction.timestamp?.[0] 
                            ? formatTimestamp(tx.transaction.timestamp[0].timestamp_nanos)
                            : tx.transaction.created_at_time?.[0]
                            ? formatTimestamp(tx.transaction.created_at_time[0].timestamp_nanos)
                            : 'N/A'
                          }
                        </td>
                        <td className="py-2">
                          {formatAddress(getTransactionFrom(operation))}
                        </td>
                        <td className="py-2">
                          {formatAddress(getTransactionTo(operation))}
                        </td>
                        <td className="py-2">{direction}</td>
                        <td className="py-2">
                          {`${(Number(getTransactionAmount(operation)) / 100_000_000).toFixed(4)} ICP`}
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
                  {filteredTransactions.map((tx) => {
                    const operation = tx.transaction.operation;
                    
                    return (
                      <tr key={tx.id.toString()} className="border-b border-white">
                        <td className="py-2">
                          {formatAddressMobile(getTransactionFrom(operation))}
                        </td>
                        <td className="py-2">
                          {formatAddressMobile(getTransactionTo(operation))}
                        </td>
                        <td className="py-2">
                          {`${(Number(getTransactionAmount(operation)) / 100_000_000).toFixed(4)} ICP`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center py-4 text-gray-600">
              {txFilter === 'all' 
                ? 'トランザクションがありません' 
                : `${txFilter === 'sent' ? '送金' : '受取'}履歴はありません`}
            </p>
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

            </div>
            
            <div className="mt-4 space-y-2">
              <p className="text-center text-sm text-gray-600">
                QRコードを青い枠内に合わせてください
              </p>
              <p className="text-center text-xs text-gray-500">
                📱 カメラが暗い場合は照明を当ててください
              </p>
              <p className="text-center text-xs text-gray-500">
                🔄 動作しない場合はページを再読み込みしてください
              </p>
            </div>

          </div>
        </div>
      )}
    </main>
  );
}