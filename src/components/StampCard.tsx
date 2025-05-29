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
  const stampCount = userStamp?.stampCount || 0;
  const isComplete = stampCount >= card.requiredStamps;
  const completedCount = userStamp?.completedCount || 0;
  const hasCompletedBefore = completedCount > 0;

  return (
    <div className={`bg-white rounded-lg p-4 shadow-sm ${
      hasCompletedBefore ? 'border-2 border-green-400' : ''
    }`}>
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-800">
          {card.shopName}
          {hasCompletedBefore && (
            <span className="ml-2 inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
              達成済み ✓
            </span>
          )}
        </h3>
        <p className="text-sm text-gray-600">{card.description}</p>
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
        {completedCount > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            これまでに{completedCount}回達成
          </p>
        )}
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
                onClick={onClaimReward}
                className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
              >
                手動で完了
              </button>
            )}
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 mt-2">
        <p>進捗: {stampCount} / {card.requiredStamps}</p>
        {card.expiresAt && (
          <p>有効期限: {new Date(card.expiresAt).toLocaleDateString('ja-JP')}</p>
        )}
      </div>

    </div>
  );
};