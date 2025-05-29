'use client';

import React from 'react';
import { StampCard as StampCardType, UserStamp } from '@/types/stamp';
import { RewardClaimQRCode } from './RewardClaimQRCode';
import { useAuth } from '@/app/client-providers';

interface StampCardProps {
  card: StampCardType;
  userStamp?: UserStamp;
  onClaimReward?: () => void;
}

export const StampCard: React.FC<StampCardProps> = ({
  card,
  userStamp,
  onClaimReward,
}) => {
  const { user } = useAuth();
  const [showClaimQR, setShowClaimQR] = React.useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const stampCount = userStamp?.stampCount || 0;
  const isComplete = stampCount >= card.requiredStamps;
  const completedCount = userStamp?.completedCount || 0;
  const hasCompletedBefore = completedCount > 0;

  const handleManualComplete = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmComplete = () => {
    setShowConfirmDialog(false);
    if (onClaimReward) {
      onClaimReward();
    }
  };

  const handleCancelComplete = () => {
    setShowConfirmDialog(false);
  };

  return (
    <div className={`bg-white rounded-lg p-4 shadow-sm ${
      hasCompletedBefore ? 'border-2 border-green-400' : ''
    }`}>
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-800">
          {card.shopName}
          {hasCompletedBefore && (
            <span className="ml-2 inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
              {completedCount}回達成 ✓
            </span>
          )}
        </h3>
        <p className="text-sm text-gray-600">{card.description}</p>
        {hasCompletedBefore && stampCount > 0 && (
          <p className="text-xs text-blue-600 mt-1">
            {completedCount + 1}回目のスタンプを集めています！
          </p>
        )}
      </div>

      <div className="grid grid-cols-5 gap-2 mb-4">
        {Array.from({ length: card.requiredStamps }).map((_, index) => (
          <div
            key={index}
            className={`aspect-square rounded-lg border-2 ${
              index < stampCount
                ? 'bg-lavender-blue-500 border-lavender-blue-500'
                : 'bg-gray-100 border-gray-300'
            } flex items-center justify-center transition-all duration-300`}
          >
            {index < stampCount && (
              <svg
                className="w-6 h-6 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
        ))}
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-700">
          特典: <span className="text-lavender-blue-600 font-semibold">{card.reward}</span>
        </p>
        <div className="mt-2 space-y-1">
          <p className="text-xs text-gray-500">
            進捗: {stampCount} / {card.requiredStamps}
          </p>
          {card.pointsPerStamp && (
            <p className="text-xs text-gray-500">
              獲得ポイント: {card.pointsPerStamp}ポイント/スタンプ
            </p>
          )}
          {userStamp?.totalPointsEarned !== undefined && userStamp.totalPointsEarned > 0 && (
            <p className="text-xs text-gray-500">
              このカードで獲得: {userStamp.totalPointsEarned}ポイント
            </p>
          )}
          {completedCount > 0 && (
            <p className="text-xs text-gray-500">
              累計達成回数: {completedCount}回
            </p>
          )}
        </div>
      </div>

      {isComplete && !showClaimQR && (
        <button
          onClick={() => setShowClaimQR(true)}
          className="w-full py-3 bg-lavender-blue-500 text-white font-bold rounded-lg hover:bg-lavender-blue-600 transition-colors"
        >
          特典受け取り用QRコードを表示
        </button>
      )}

      {isComplete && showClaimQR && user && (
        <div className="space-y-3">
          <RewardClaimQRCode
            cardId={card.id}
            userId={user.key}
            reward={card.reward}
            size={180}
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowClaimQR(false)}
              className="flex-1 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              閉じる
            </button>
            {onClaimReward && (
              <button
                onClick={handleManualComplete}
                className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
              >
                手動で完了
              </button>
            )}
          </div>
        </div>
      )}

      {(card.expirationDays || card.expiresAt) && (
        <div className="mt-2">
          {card.expirationDays && userStamp?.firstStampedAt ? (
            (() => {
              const expirationDate = new Date(userStamp.firstStampedAt + card.expirationDays * 24 * 60 * 60 * 1000);
              const now = new Date();
              const daysLeft = Math.ceil((expirationDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
              const isExpired = daysLeft < 0;
              const isNearExpiry = daysLeft >= 0 && daysLeft <= 7;
              
              return (
                <div className={`text-xs p-2 rounded ${
                  isExpired ? 'bg-red-100 text-red-700 font-semibold' : 
                  isNearExpiry ? 'bg-yellow-100 text-yellow-700' : 
                  'text-gray-500'
                }`}>
                  {isExpired ? (
                    <p>⚠️ 有効期限切れ - 次回スタンプ時にリセットされます</p>
                  ) : isNearExpiry ? (
                    <p>⏰ 有効期限まであと{daysLeft}日 ({expirationDate.toLocaleDateString('ja-JP')})</p>
                  ) : (
                    <p>有効期限: {expirationDate.toLocaleDateString('ja-JP')}</p>
                  )}
                </div>
              );
            })()
          ) : card.expirationDays ? (
            <p className="text-xs text-gray-500">有効期限: 最初のスタンプから{card.expirationDays}日間</p>
          ) : card.expiresAt ? (
            <p className="text-xs text-gray-500">有効期限: {new Date(card.expiresAt).toLocaleDateString('ja-JP')}</p>
          ) : null}
        </div>
      )}

      {/* 確認ダイアログ */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <div className="mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800 text-center mb-2">
                手動で特典を受け渡しますか？
              </h3>
              <p className="text-sm text-gray-600 text-center mb-1">
                この操作は取り消すことができません。
              </p>
              <p className="text-xs text-gray-500 text-center">
                スタンプカードがリセットされ、お客様は再度1からスタンプを集めることになります。
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-700">
                <strong>店舗:</strong> {card.shopName}<br />
                <strong>特典:</strong> {card.reward}<br />
                <strong>現在のスタンプ数:</strong> {stampCount}/{card.requiredStamps}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancelComplete}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold"
              >
                いいえ
              </button>
              <button
                onClick={handleConfirmComplete}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold"
              >
                はい、受け渡す
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};