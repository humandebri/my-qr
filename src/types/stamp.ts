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
  pointsPerStamp?: number; // スタンプごとに獲得できるポイント数
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
  totalPointsEarned?: number; // 累計獲得ポイント
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

export interface UserPoints {
  id: string;
  userId: string;
  totalPoints: number;
  lastUpdated: number;
}