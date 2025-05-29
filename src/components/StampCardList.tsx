'use client';

import React, { useState, useMemo } from 'react';
import { useStamp } from '@/components/context/StampContext';
import { StampCard } from './StampCard';
import { BiSearch } from 'react-icons/bi';

export const StampCardList: React.FC = () => {
  const { stampCards, userStamps, userPoints, loading, error, claimReward } = useStamp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'completed'>('all');
  
  // カウント計算
  const counts = useMemo(() => {
    let active = 0;
    let completed = 0;
    
    stampCards.forEach(card => {
      const userStamp = userStamps.find(s => s.cardId === card.id);
      const hasCompletedBefore = userStamp ? userStamp.completedCount > 0 : false;
      const isCurrentlyComplete = userStamp ? userStamp.stampCount >= card.requiredStamps : false;
      const isActive = userStamp ? userStamp.stampCount > 0 && !isCurrentlyComplete : false;
      
      if (isActive || (!hasCompletedBefore && userStamp?.stampCount === 0)) active++;
      if (hasCompletedBefore || isCurrentlyComplete) completed++;
    });
    
    return { all: stampCards.length, active, completed };
  }, [stampCards, userStamps]);

  // フィルタリングされたスタンプカード
  const filteredCards = useMemo(() => {
    return stampCards.filter(card => {
      // 検索条件
      const matchesSearch = searchTerm === '' || 
        card.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      // フィルター条件
      const userStamp = userStamps.find(s => s.cardId === card.id);
      const hasCompletedBefore = userStamp ? userStamp.completedCount > 0 : false;
      const isCurrentlyComplete = userStamp ? userStamp.stampCount >= card.requiredStamps : false;
      const isActive = userStamp ? userStamp.stampCount > 0 && !isCurrentlyComplete : false;
      
      let matchesFilter = true;
      if (filterType === 'active') matchesFilter = isActive || (!hasCompletedBefore && userStamp?.stampCount === 0);
      if (filterType === 'completed') matchesFilter = hasCompletedBefore || isCurrentlyComplete;
      
      return matchesSearch && matchesFilter;
    });
  }, [stampCards, userStamps, searchTerm, filterType]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lavender-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 text-center p-4">
        エラー: {error}
      </div>
    );
  }

  if (stampCards.length === 0) {
    return (
      <div className="text-gray-600 text-center p-8">
        まだスタンプカードがありません
      </div>
    );
  }


  const handleClaimReward = async (cardId: string) => {
    try {
      await claimReward(cardId);
      alert('特典を受け取りました！\n\n再度スタンプを集めることができます。');
      // 達成済みタブに自動的に切り替え
      setFilterType('completed');
    } catch (err) {
      console.error('Failed to claim reward:', err);
      alert(err instanceof Error ? err.message : '特典の受け取りに失敗しました');
    }
  };

  return (
    <div>
      {/* ポイント表示 */}
      {userPoints && (
        <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-green-800 font-medium">総獲得ポイント</p>
                <p className="text-2xl font-bold text-green-900">{userPoints.totalPoints.toLocaleString()} ポイント</p>
              </div>
            </div>
            <div className="text-xs text-green-600 text-right">
              <p>スタンプを集めて</p>
              <p>ポイントをゲット！</p>
            </div>
          </div>
        </div>
      )}

      {/* 検索バーとフィルター */}
      <div className="mb-4 space-y-3">
        <div className="relative">
          <BiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="店舗名や説明を検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-lavender-blue-500 text-gray-700"
          />
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded text-sm ${
              filterType === 'all'
                ? 'bg-lavender-blue-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            すべて ({counts.all})
          </button>
          <button
            onClick={() => setFilterType('active')}
            className={`px-3 py-1 rounded text-sm ${
              filterType === 'active'
                ? 'bg-lavender-blue-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            進行中 ({counts.active})
          </button>
          <button
            onClick={() => setFilterType('completed')}
            className={`px-3 py-1 rounded text-sm ${
              filterType === 'completed'
                ? 'bg-lavender-blue-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            達成済み ({counts.completed})
          </button>
        </div>
      </div>

      {/* スタンプカード一覧 */}
      {filteredCards.length === 0 ? (
        <div className="text-gray-600 text-center p-8">
          {searchTerm || filterType !== 'all' 
            ? '条件に一致するスタンプカードがありません' 
            : 'スタンプカードがありません'}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredCards.map((card) => {
        const userStamp = userStamps.find((s) => s.cardId === card.id);
        return (
          <StampCard
            key={card.id}
            card={card}
            userStamp={userStamp}
            onClaimReward={() => handleClaimReward(card.id)}
          />
          );
        })}
        </div>
      )}
    </div>
  );
};