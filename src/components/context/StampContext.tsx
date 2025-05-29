'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { listDocs, setDoc, deleteDoc } from '@junobuild/core';
import { useAuth } from '@/app/client-providers';
import { StampCard, UserStamp, StampHistory } from '@/types/stamp';
import { nanoid } from 'nanoid';

interface StampContextType {
  stampCards: StampCard[];
  userStamps: UserStamp[];
  stampHistory: StampHistory[];
  loading: boolean;
  error: string | null;
  createStampCard: (card: Omit<StampCard, 'id' | 'createdAt' | 'shopOwner'>) => Promise<void>;
  deleteStampCard: (cardId: string) => Promise<void>;
  getUserStamp: (cardId: string) => UserStamp | undefined;
  addStamp: (cardId: string) => Promise<void>;
  addAutoStamp: (recipientPrincipal: string, selectedCardId?: string) => Promise<void>;
  claimReward: (cardId: string) => Promise<void>;
  refreshStamps: () => Promise<void>;
}

const StampContext = createContext<StampContextType | undefined>(undefined);

export const useStamp = () => {
  const context = useContext(StampContext);
  if (!context) {
    throw new Error('useStamp must be used within a StampProvider');
  }
  return context;
};

export const StampProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [stampCards, setStampCards] = useState<StampCard[]>([]);
  const [userStamps, setUserStamps] = useState<UserStamp[]>([]);
  const [stampHistory, setStampHistory] = useState<StampHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStampCards = useCallback(async () => {
    try {
      const { items } = await listDocs({
        collection: 'stampCards',
      });
      setStampCards(items.map(item => item.data as StampCard));
    } catch (err) {
      console.error('Error fetching stamp cards:', err);
      setError('Failed to fetch stamp cards');
    }
  }, []);

  const fetchUserStamps = useCallback(async () => {
    if (!user) return;
    
    try {
      const { items } = await listDocs({
        collection: 'userStamps',
        filter: {
          matcher: {
            description: `userId:${user.key}`,
          },
        },
      });
      setUserStamps(items.map(item => item.data as UserStamp));
    } catch (err) {
      console.error('Error fetching user stamps:', err);
      setError('Failed to fetch user stamps');
    }
  }, [user]);

  const fetchStampHistory = useCallback(async () => {
    if (!user) return;
    
    try {
      const { items } = await listDocs({
        collection: 'stampHistory',
        filter: {
          matcher: {
            description: `userId:${user.key}`,
          },
        },
      });
      setStampHistory(items.map(item => item.data as StampHistory));
    } catch (err) {
      console.error('Error fetching stamp history:', err);
    }
  }, [user]);

  const refreshStamps = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([
      fetchStampCards(),
      fetchUserStamps(),
      fetchStampHistory(),
    ]);
    setLoading(false);
  }, [fetchStampCards, fetchUserStamps, fetchStampHistory]);

  useEffect(() => {
    refreshStamps();
  }, [refreshStamps]);

  const createStampCard = async (card: Omit<StampCard, 'id' | 'createdAt' | 'shopOwner'>) => {
    if (!user) throw new Error('User must be authenticated');

    const newCard: StampCard = {
      ...card,
      id: nanoid(),
      createdAt: Date.now(),
      shopOwner: user.key,
    };

    await setDoc({
      collection: 'stampCards',
      doc: {
        key: newCard.id,
        data: newCard,
      },
    });

    await refreshStamps();
  };

  const deleteStampCard = async (cardId: string) => {
    if (!user) throw new Error('User must be authenticated');

    // オーナーが所有するカードかチェック
    const card = stampCards.find(c => c.id === cardId);
    if (!card) throw new Error('Stamp card not found');
    if (card.shopOwner !== user.key) throw new Error('Not authorized to delete this card');

    await deleteDoc({
      collection: 'stampCards',
      doc: {
        key: cardId,
        data: card,
      },
    });

    await refreshStamps();
  };

  const getUserStamp = (cardId: string): UserStamp | undefined => {
    return userStamps.find(stamp => stamp.cardId === cardId);
  };

  const addStamp = async (cardId: string) => {
    if (!user) throw new Error('User must be authenticated');

    const existingStamp = getUserStamp(cardId);
    const card = stampCards.find(c => c.id === cardId);
    if (!card) throw new Error('Stamp card not found');

    if (existingStamp) {
      if (existingStamp.stampCount >= card.requiredStamps) {
        throw new Error('Stamp card is already full');
      }

      const updatedStamp: UserStamp = {
        ...existingStamp,
        stampCount: existingStamp.stampCount + 1,
        lastStampedAt: Date.now(),
        updatedAt: Date.now(),
      };

      await setDoc({
        collection: 'userStamps',
        doc: {
          key: existingStamp.id,
          data: updatedStamp,
          description: `userId:${user.key}`,
        },
      });
    } else {
      const newUserStamp: UserStamp = {
        id: nanoid(),
        userId: user.key,
        cardId,
        stampCount: 1,
        lastStampedAt: Date.now(),
        completedCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await setDoc({
        collection: 'userStamps',
        doc: {
          key: newUserStamp.id,
          data: newUserStamp,
          description: `userId:${user.key}`,
        },
      });
    }

    const historyEntry: StampHistory = {
      id: nanoid(),
      userId: user.key,
      cardId,
      action: 'stamp',
      timestamp: Date.now(),
      metadata: {
        stampNumber: (existingStamp?.stampCount || 0) + 1,
      },
    };

    await setDoc({
      collection: 'stampHistory',
      doc: {
        key: historyEntry.id,
        data: historyEntry,
        description: `userId:${user.key}`,
      },
    });

    await refreshStamps();
  };

  const addAutoStamp = async (recipientPrincipal: string, selectedCardId?: string) => {
    if (!user) throw new Error('User must be authenticated');

    // オーナーが所有するスタンプカードを取得
    const ownedCards = stampCards.filter(card => card.shopOwner === user.key);
    
    if (ownedCards.length === 0) {
      throw new Error('No stamp cards owned by this user');
    }

    // カードが指定されている場合はそれを使用、そうでなければ選択画面が必要
    let targetCard: StampCard;
    if (selectedCardId) {
      const card = ownedCards.find(c => c.id === selectedCardId);
      if (!card) {
        throw new Error('Selected card not found or not owned by user');
      }
      targetCard = card;
    } else if (ownedCards.length === 1) {
      // カードが1つしかない場合は自動選択
      targetCard = ownedCards[0];
    } else {
      // 複数カードがある場合は選択が必要
      throw new Error('MULTIPLE_CARDS_REQUIRE_SELECTION');
    }

    // 支払いを受けたユーザーのスタンプを追加
    const existingStamp = userStamps.find(stamp => 
      stamp.cardId === targetCard.id && stamp.userId === recipientPrincipal
    );

    if (existingStamp) {
      if (existingStamp.stampCount >= targetCard.requiredStamps) {
        throw new Error('Stamp card is already full');
      }

      const updatedStamp: UserStamp = {
        ...existingStamp,
        stampCount: existingStamp.stampCount + 1,
        lastStampedAt: Date.now(),
        updatedAt: Date.now(),
      };

      await setDoc({
        collection: 'userStamps',
        doc: {
          key: existingStamp.id,
          data: updatedStamp,
          description: `userId:${recipientPrincipal}`,
        },
      });
    } else {
      const newStamp: UserStamp = {
        id: nanoid(),
        userId: recipientPrincipal,
        cardId: targetCard.id,
        stampCount: 1,
        completedCount: 0,
        createdAt: Date.now(),
        lastStampedAt: Date.now(),
        updatedAt: Date.now(),
      };

      await setDoc({
        collection: 'userStamps',
        doc: {
          key: newStamp.id,
          data: newStamp,
          description: `userId:${recipientPrincipal}`,
        },
      });
    }

    // 履歴に記録
    const historyEntry: StampHistory = {
      id: nanoid(),
      userId: recipientPrincipal,
      cardId: targetCard.id,
      action: 'stamp',
      timestamp: Date.now(),
      metadata: {
        autoStamp: true,
        paymentReceiver: user.key,
      },
    };

    await setDoc({
      collection: 'stampHistory',
      doc: {
        key: historyEntry.id,
        data: historyEntry,
        description: `userId:${recipientPrincipal}`,
      },
    });

    await refreshStamps();
  };

  const claimReward = async (cardId: string) => {
    if (!user) throw new Error('User must be authenticated');

    const userStamp = getUserStamp(cardId);
    const card = stampCards.find(c => c.id === cardId);
    
    if (!userStamp || !card) throw new Error('Stamp data not found');
    if (userStamp.stampCount < card.requiredStamps) {
      throw new Error('Not enough stamps to claim reward');
    }

    const updatedStamp: UserStamp = {
      ...userStamp,
      stampCount: 0,
      completedCount: userStamp.completedCount + 1,
      updatedAt: Date.now(),
    };

    await setDoc({
      collection: 'userStamps',
      doc: {
        key: userStamp.id,
        data: updatedStamp,
        description: `userId:${user.key}`,
      },
    });

    const historyEntry: StampHistory = {
      id: nanoid(),
      userId: user.key,
      cardId,
      action: 'complete',
      timestamp: Date.now(),
      metadata: {
        rewardClaimed: true,
      },
    };

    await setDoc({
      collection: 'stampHistory',
      doc: {
        key: historyEntry.id,
        data: historyEntry,
        description: `userId:${user.key}`,
      },
    });

    await refreshStamps();
  };

  const value: StampContextType = {
    stampCards,
    userStamps,
    stampHistory,
    loading,
    error,
    createStampCard,
    deleteStampCard,
    getUserStamp,
    addStamp,
    addAutoStamp,
    claimReward,
    refreshStamps,
  };

  return <StampContext.Provider value={value}>{children}</StampContext.Provider>;
};