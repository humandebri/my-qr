export interface StampCard {
  id: string;
  shopName: string;
  description: string;
  requiredStamps: number;
  reward: string;
  createdAt: number;
  expiresAt?: number;
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
  };
}