'use client';

import React from 'react';
import { useAuth } from '@/app/client-providers';
import { useRouter } from 'next/navigation';
import { useStamp } from '@/components/context/StampContext';
import { DownloadableQRCode } from '@/components/DownloadableQRCode';
import { Html5Qrcode } from 'html5-qrcode';

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
  const scannerRef = React.useRef<Html5Qrcode | null>(null);

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

  // QRスキャナーの開始
  const startScanning = async () => {
    try {
      setScanModalOpen(true);
      const scanner = new Html5Qrcode("reader");
      scannerRef.current = scanner;
      
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          handleScanResult(decodedText);
        },
        () => {
          // エラーは無視（継続的にスキャン）
        }
      );
    } catch (error) {
      console.error('QRスキャナー開始エラー:', error);
      alert('カメラにアクセスできませんでした');
      setScanModalOpen(false);
    }
  };

  // QRスキャン結果の処理
  const handleScanResult = async (decodedText: string) => {
    
    // スキャナーを停止
    if (scannerRef.current) {
      await scannerRef.current.stop();
      scannerRef.current = null;
    }
    setScanModalOpen(false);

    // claim://cardId/userId の形式をパース
    if (decodedText.startsWith('claim://')) {
      const parts = decodedText.replace('claim://', '').split('/');
      if (parts.length === 2) {
        const [cardId] = parts;
        
        // オーナーが所有するカードかチェック
        const card = myStampCards.find(c => c.id === cardId);
        if (card) {
          try {
            await claimReward(cardId);
            alert(`特典を受け渡しました！\n店舗: ${card.shopName}\n特典: ${card.reward}`);
          } catch (error) {
            console.error('特典受け渡しエラー:', error);
            alert('特典の受け渡しに失敗しました');
          }
        } else {
          alert('このカードの特典は受け渡しできません');
        }
      } else {
        alert('無効なQRコードです');
      }
    } else {
      alert('特典受け取り用のQRコードではありません');
    }
  };

  // スキャナーを停止
  const stopScanning = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop();
      scannerRef.current = null;
    }
    setScanModalOpen(false);
  };

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
                <p className="text-sm text-gray-600">お客様からの支払いを受け取った時に自動でスタンプを押します</p>
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
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">特典</span>
                    <span className="text-sm font-semibold text-red-600 bg-red-50 px-2 py-1 rounded">{card.reward}</span>
                  </div>
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
            
            <div id="reader" className="w-full rounded-lg overflow-hidden border-2 border-lavender-blue-200"></div>
            
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700 text-center font-medium">
                💎 お客様の特典受け取り用QRコードをカメラに向けてください
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
                <select
                  value={formData.requiredStamps}
                  onChange={(e) => setFormData({ ...formData, requiredStamps: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lavender-blue-500 focus:border-lavender-blue-500"
                >
                  {[5, 6, 7, 8, 9, 10, 11, 12, 15, 20].map(num => (
                    <option key={num} value={num}>{num}個</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">お客様が特典を受け取るのに必要なスタンプ数</p>
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