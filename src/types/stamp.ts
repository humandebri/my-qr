export interface StampCard {
  id: string;
  shopName: string;
  description: string;
  requiredStamps: number;
  reward: string;
  createdAt: number;
  expiresAt?: number;
  expirationDays?: number; // 最初のスタンプからの有効日数
  shopOwner: string;
}

export interface UserStamp {
  id: string;
  userId: string;
  cardId: string;
  stampCount: number;
  lastStampedAt: number;
  completedCount: number;
  createdAt: number;
  updatedAt: number;
  firstStampedAt?: number; // 最初のスタンプ時刻（有効期限計算用）
}

export interface StampHistory {
  id: string;
  userId: string;
  cardId: string;
  action: 'stamp' | 'complete' | 'reward';
  timestamp: number;
  metadata?: {
    stampNumber?: number;
    rewardClaimed?: boolean;
    autoStamp?: boolean;
    paymentReceiver?: string;
    expired?: boolean; // 期限切れでリセットされた場合
  };
}

