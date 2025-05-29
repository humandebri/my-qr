'use client';

import React from 'react';
import { useAuth } from '@/app/client-providers';
import { useRouter } from 'next/navigation';
import { useStamp } from '@/components/context/StampContext';
import { DownloadableQRCode } from '@/components/DownloadableQRCode';
// QRスキャナーはqr-scannerライブラリを動的インポートで使用

export default function OwnerDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const { stampCards, loading, claimReward, deleteStampCard, createStampCard } = useStamp();
  const [scanModalOpen, setScanModalOpen] = React.useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [cardToDelete, setCardToDelete] = React.useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState('');
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    shopName: '',
    description: '',
    requiredStamps: 10,
    reward: '',
    expirationDays: 0, // 0は有効期限なし
    pointsPerStamp: 10, // スタンプごとのポイント（デフォルト10）
  });
  const [autoStampSettings, setAutoStampSettings] = React.useState<{
    enabled: boolean;
    selectedCardId: string | null;
  }>({
    enabled: false,
    selectedCardId: null,
  });

  // 自動スタンプ設定をlocalStorageから読み込み
  React.useEffect(() => {
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

  // 自動スタンプ設定をlocalStorageに保存
  React.useEffect(() => {
    if (user) {
      localStorage.setItem(`autoStamp_${user.key}`, JSON.stringify(autoStampSettings));
    }
  }, [autoStampSettings, user]);
  
  const scannerRef = React.useRef<unknown>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [lastScannedCode, setLastScannedCode] = React.useState<string | null>(null);
  const lastScannedTimeRef = React.useRef<number>(0);

  // オーナーが所有するスタンプカードのみフィルタリング
  const myStampCards = React.useMemo(() => {
    if (!user) return [];
    return stampCards.filter(card => card.shopOwner === user.key);
  }, [stampCards, user]);

  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // QRスキャン結果の処理
  const handleScanResult = React.useCallback(async (decodedText: string) => {
    const currentTime = Date.now();
    
    // 処理中または同じコードを2秒以内に再スキャンした場合は無視
    if (isProcessing) {
      console.log('⏳ 処理中のため無視');
      return;
    }
    
    if (lastScannedCode === decodedText && 
        currentTime - lastScannedTimeRef.current < 2000) {
      console.log('🔄 同じコードの連続スキャンを無視');
      return;
    }
    
    setIsProcessing(true);
    setLastScannedCode(decodedText);
    lastScannedTimeRef.current = currentTime;
    
    // スキャナーを停止
    if (scannerRef.current) {
      try {
        (scannerRef.current as { stop: () => void }).stop();
      } catch (e) {
        console.warn('スキャナー停止時のエラー:', e);
      }
      scannerRef.current = null;
    }
    setScanModalOpen(false);

    // QRコードの種類を判定
    if (decodedText.startsWith('claim://')) {
      // claim://cardId/userId の形式をパース
      const parts = decodedText.replace('claim://', '').split('/');
      if (parts.length === 2) {
        const [cardId] = parts;
        
        // オーナーが所有するカードかチェック
        const card = myStampCards.find(c => c.id === cardId);
        if (card) {
          try {
            await claimReward(cardId);
            alert(`✅ 特典を受け渡しました！\n\n店舗: ${card.shopName}\n特典: ${card.reward}\n\nお客様にお渡しください。`);
          } catch (error) {
            console.error('特典受け渡しエラー:', error);
            alert('特典の受け渡しに失敗しました');
          }
        } else {
          alert('⚠️ このカードの特典は受け渡しできません\n\n他の店舗のスタンプカードです。');
        }
      } else {
        alert('無効なQRコードです');
      }
    } else if (decodedText.startsWith('stamp://')) {
      // スタンプ用QRコードの場合
      const stampId = decodedText.replace('stamp://', '');
      const card = myStampCards.find(c => c.id === stampId);
      if (card) {
        alert(`ℹ️ これはスタンプ用のQRコードです\n\n店舗: ${card.shopName}\n\nこのQRコードはお客様がスタンプを押すために使用します。\n特典受け取りには、お客様のスタンプカードから「特典受け取り用QRコード」を表示してもらってください。`);
      } else {
        alert('ℹ️ これはスタンプ用のQRコードです\n\n特典受け取りには、お客様のスタンプカードから「特典受け取り用QRコード」を表示してもらってください。');
      }
    } else {
      alert('⚠️ 認識できないQRコードです\n\n特典受け取りには、お客様のスタンプカードから「特典受け取り用QRコード」を表示してもらってください。');
    }
    
    // 処理完了後にフラグをリセット
    setIsProcessing(false);
  }, [myStampCards, claimReward, isProcessing, lastScannedCode]);

  // カメラ開始関数
  const startCamera = React.useCallback(async () => {
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
        await new Promise<void>((resolve) => {
          const checkReady = () => {
            if (
              videoRef.current &&
              videoRef.current.readyState >= 3 &&
              videoRef.current.videoWidth > 0 &&
              videoRef.current.videoHeight > 0
            ) {
              console.log('📐 video完全準備完了');
              resolve();
            } else {
              requestAnimationFrame(checkReady);
            }
          };
          checkReady();
        });
        
        await videoRef.current.play();
        console.log('✅ カメラ準備完了');
      }
    } catch (err) {
      console.error('❌ カメラアクセスエラー:', err);
      alert('カメラにアクセスできませんでした。ブラウザの設定を確認してください。');
    }
  }, []);

  // QRスキャナーの開始
  const startQRScanning = React.useCallback(async () => {
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
      
      const QrScanner = (await import('qr-scanner')).default;
      
      const onDecode = async (result: { data: string }) => {
        console.log('🎉 QRコード検出成功:', result.data);
        handleScanResult(result.data);
      };
      
      // QrScanner初期化
      const scanner = new QrScanner(
        videoRef.current,
        onDecode,
        {
          onDecodeError: (error: unknown) => {
            // エラーログは最小限に
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
      console.log('✅ QRスキャナー開始成功');
      
      // ✅ ハイライト描画を強制更新
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
      });
      
      // ✅ シンプルなフォールバック：1回だけ再試行
      setTimeout(async () => {
        // スキャンが成功していない場合のみ1回だけ再試行
        if (scanModalOpen && scannerRef.current) {
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
      }, 1200); // 1.2秒後に1回だけ
      
    } catch (err) {
      console.error('❌ QRスキャナーエラー:', err);
      alert('QRスキャナーの初期化に失敗しました');
    }
  }, [handleScanResult, scanModalOpen]);

  // スキャンモーダルを開く
  const startScanning = async () => {
    setScanModalOpen(true);
  };

  // スキャナーを停止
  const stopScanning = React.useCallback(() => {
    console.log('🚪 stopScanning開始');
    setScanModalOpen(false);
    setIsProcessing(false);
    setLastScannedCode(null);
    
    // QRスキャナーを停止
    if (scannerRef.current) {
      try {
        (scannerRef.current as { stop: () => void; destroy?: () => void; _destroyed?: boolean }).stop();
        console.log('🛑 QRスキャナー停止完了');
      } catch (e) {
        console.warn('QRスキャナー停止時のエラー:', e);
      }
      scannerRef.current = null;
    }
    
    // カメラストリームを停止
    try {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        if (stream && typeof stream.getTracks === 'function') {
          stream.getTracks().forEach(track => {
            if (track && typeof track.stop === 'function') {
              track.stop();
            }
          });
        }
        videoRef.current.srcObject = null;
        console.log('📹 カメラストリーム停止完了');
      }
    } catch (e) {
      console.warn('カメラストリーム停止エラー:', e);
    }
    
    console.log('✅ stopScanning完了');
  }, []);

  // スキャンモーダルが開いたときにカメラとQRスキャンを開始
  React.useEffect(() => {
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
  React.useEffect(() => {
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

  // 削除モーダルを開く
  const openDeleteModal = (cardId: string) => {
    setCardToDelete(cardId);
    setDeleteModalOpen(true);
    setDeleteConfirmText('');
  };

  // 削除モーダルを閉じる
  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setCardToDelete(null);
    setDeleteConfirmText('');
  };

  // スタンプカードの削除実行
  const handleDeleteCard = async () => {
    if (!cardToDelete || deleteConfirmText !== '削除') {
      return;
    }

    try {
      await deleteStampCard(cardToDelete);
      alert('スタンプカードが削除されました');
      closeDeleteModal();
    } catch (error) {
      console.error('削除エラー:', error);
      alert('削除に失敗しました');
    }
  };

  // 作成モーダルを開く
  const openCreateModal = () => {
    setCreateModalOpen(true);
    setFormData({
      shopName: '',
      description: '',
      requiredStamps: 10,
      reward: '',
      expirationDays: 0,
      pointsPerStamp: 10,
    });
  };

  // 作成モーダルを閉じる
  const closeCreateModal = () => {
    setCreateModalOpen(false);
    setFormData({
      shopName: '',
      description: '',
      requiredStamps: 10,
      reward: '',
      expirationDays: 0,
      pointsPerStamp: 10,
    });
  };

  // スタンプカードの作成実行
  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createStampCard({
        shopName: formData.shopName,
        description: formData.description,
        requiredStamps: formData.requiredStamps,
        reward: formData.reward,
        expirationDays: formData.expirationDays > 0 ? formData.expirationDays : undefined,
        pointsPerStamp: formData.pointsPerStamp,
      });
      alert('スタンプカードが作成されました');
      closeCreateModal();
    } catch (error) {
      console.error('作成エラー:', error);
      alert('作成に失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lavender-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-lavender-blue-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            店舗オーナーダッシュボード
          </h1>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={openCreateModal}
              className="px-6 py-3 bg-lavender-blue-500 text-white font-semibold rounded-lg hover:bg-lavender-blue-600 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              新しいスタンプカードを作成
            </button>
            <button
              onClick={startScanning}
              className="px-6 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h2M4 4h5l2 3h3v6h-5M7 7h10v10H7z" />
              </svg>
              特典受け取りQRをスキャン
            </button>
          </div>
        </div>

        {/* 自動スタンプ設定 */}
        {myStampCards.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-lg border border-lavender-blue-100 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">支払い受け取り時の自動スタンプ設定</h3>
                <p className="text-sm text-gray-600">お客様からの支払いをこのアプリで受け取った時に自動でスタンプを押します</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="autoStampEnabled"
                  checked={autoStampSettings.enabled}
                  onChange={(e) => setAutoStampSettings({
                    ...autoStampSettings,
                    enabled: e.target.checked,
                    selectedCardId: e.target.checked ? (myStampCards.length === 1 ? myStampCards[0].id : autoStampSettings.selectedCardId) : null
                  })}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="autoStampEnabled" className="text-gray-700 font-medium">
                  支払い受け取り時に自動でスタンプを押す
                </label>
              </div>

              {autoStampSettings.enabled && myStampCards.length > 1 && (
                <div className="ml-8 p-4 bg-blue-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    スタンプを押すカードを選択してください：
                  </label>
                  <select
                    value={autoStampSettings.selectedCardId || ''}
                    onChange={(e) => setAutoStampSettings({
                      ...autoStampSettings,
                      selectedCardId: e.target.value || null
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">カードを選択してください</option>
                    {myStampCards.map(card => (
                      <option key={card.id} value={card.id}>
                        {card.shopName} - {card.description}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {autoStampSettings.enabled && autoStampSettings.selectedCardId && (
                <div className="ml-8 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700">
                    ✅ 設定完了：お客様からの支払いを受け取ると「
                    {myStampCards.find(c => c.id === autoStampSettings.selectedCardId)?.shopName}
                    」のスタンプが自動で押されます
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {myStampCards.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-lg border border-lavender-blue-100">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-lavender-blue-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-lavender-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <p className="text-gray-600 mb-6 text-lg">まだスタンプカードを作成していません</p>
              <button
                onClick={openCreateModal}
                className="px-6 py-3 bg-lavender-blue-500 text-white font-semibold rounded-lg hover:bg-lavender-blue-600 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 mx-auto"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                最初のスタンプカードを作成
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {myStampCards.map((card) => (
              <div key={card.id} className="bg-white rounded-xl p-6 shadow-lg border border-lavender-blue-100 hover:shadow-xl transition-all duration-200">
                <div className="mb-6">
                  <div className="flex justify-between items-start mb-2">
                    <h2 className="text-xl font-bold text-gray-800">
                      {card.shopName}
                    </h2>
                    <button
                      onClick={() => openDeleteModal(card.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      title="スタンプカードを削除"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-gray-600 leading-relaxed">{card.description}</p>
                </div>
                
                <div className="mb-6 p-4 bg-lavender-blue-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">必要スタンプ数</span>
                    <span className="text-lg font-bold text-lavender-blue-600">{card.requiredStamps}個</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">特典</span>
                    <span className="text-sm font-semibold text-red-600 bg-red-50 px-2 py-1 rounded">{card.reward}</span>
                  </div>
                  {card.pointsPerStamp && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">獲得ポイント</span>
                      <span className="text-sm font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">{card.pointsPerStamp}ポイント/スタンプ</span>
                    </div>
                  )}
                  {card.expirationDays && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">有効期限</span>
                      <span className="text-sm text-gray-600">最初のスタンプから{card.expirationDays}日間</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-lavender-blue-100 pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <svg className="w-5 h-5 text-lavender-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h2M4 4h5l2 3h3v6h-5M7 7h10v10H7z" />
                    </svg>
                    <p className="font-semibold text-gray-700">
                      スタンプ用QRコード
                    </p>
                  </div>
                  <DownloadableQRCode 
                    stampCardId={card.id}
                    shopName={card.shopName}
                    description={card.description}
                    requiredStamps={card.requiredStamps}
                    reward={card.reward}
                    size={180}
                  />
                  <p className="text-xs text-gray-500 mt-3 text-center leading-relaxed">
                    お客様にこのQRコードを読み取ってもらってください
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QRスキャンモーダル */}
      {scanModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl border border-lavender-blue-100">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h2M4 4h5l2 3h3v6h-5M7 7h10v10H7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800">特典受け取りQRスキャン</h3>
              </div>
              <button
                onClick={stopScanning}
                className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                ✕
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
                <div className="w-48 h-48 border-4 border-green-400 rounded-lg animate-pulse"></div>
              </div>
            </div>
            
            <div className="mt-4 space-y-2">
              <p className="text-center text-sm text-gray-600">
                💎 お客様のスタンプカードから表示される<br />
                <strong>「特典受け取り用QRコード」</strong>を緑の枠内に合わせてください
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

      {/* 削除確認モーダル */}
      {deleteModalOpen && cardToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl border border-red-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.99-.833-2.76 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">スタンプカードの削除</h3>
                <p className="text-sm text-gray-600">
                  {myStampCards.find(c => c.id === cardToDelete)?.shopName}
                </p>
              </div>
            </div>

            <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-sm text-red-800 space-y-2">
                <p className="font-semibold">⚠️ 注意：この操作は取り消せません</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>スタンプカードが完全に削除されます</li>
                  <li>お客様のスタンプ履歴も削除されます</li>
                  <li>QRコードが使用できなくなります</li>
                  <li>復元することはできません</li>
                </ul>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                削除を実行するには「削除」と入力してください：
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="削除"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeDeleteModal}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteCard}
                disabled={deleteConfirmText !== '削除'}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  deleteConfirmText === '削除'
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                削除実行
              </button>
            </div>
          </div>
        </div>
      )}

      {/* スタンプカード作成モーダル */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-2xl border border-lavender-blue-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-lavender-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-lavender-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-800">新しいスタンプカード作成</h3>
                <p className="text-sm text-gray-600">お客様向けのスタンプカードを作成しましょう</p>
              </div>
              <button
                onClick={closeCreateModal}
                className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCard} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  店舗名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.shopName}
                  onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lavender-blue-500 focus:border-lavender-blue-500"
                  placeholder="例: ラーメン五郎"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  説明・サービス内容 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lavender-blue-500 focus:border-lavender-blue-500 h-20 resize-none"
                  placeholder="例: 美味しいラーメンとつけ麺のお店です"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  必要スタンプ数 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.requiredStamps}
                  onChange={(e) => setFormData({ ...formData, requiredStamps: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lavender-blue-500 focus:border-lavender-blue-500"
                  placeholder="例: 10"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">お客様が特典を受け取るのに必要なスタンプ数（1〜100個）</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  特典内容 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.reward}
                  onChange={(e) => setFormData({ ...formData, reward: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lavender-blue-500 focus:border-lavender-blue-500"
                  placeholder="例: ラーメン1杯無料、ドリンク無料"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  スタンプごとのポイント <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.pointsPerStamp}
                  onChange={(e) => setFormData({ ...formData, pointsPerStamp: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lavender-blue-500 focus:border-lavender-blue-500"
                  placeholder="例: 10"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">お客様が1スタンプごとに獲得できるポイント数（1〜1000ポイント）</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  有効期限
                </label>
                <select
                  value={formData.expirationDays}
                  onChange={(e) => setFormData({ ...formData, expirationDays: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lavender-blue-500 focus:border-lavender-blue-500"
                >
                  <option value={0}>無期限</option>
                  <option value={7}>1週間</option>
                  <option value={14}>2週間</option>
                  <option value={30}>1ヶ月</option>
                  <option value={60}>2ヶ月</option>
                  <option value={90}>3ヶ月</option>
                  <option value={180}>6ヶ月</option>
                  <option value={365}>1年</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">最初のスタンプから計算されます</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="flex-1 px-4 py-3 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-lavender-blue-500 text-white font-semibold rounded-lg hover:bg-lavender-blue-600 transition-colors"
                >
                  作成する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}