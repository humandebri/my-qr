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
  addStamp: (cardId: string) => Promise<{ isComplete: boolean; shopName: string; reward: string }>;
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
  const [userStampVersions, setUserStampVersions] = useState<Map<string, bigint>>(new Map());
  const [stampHistory, setStampHistory] = useState<StampHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStampCards = useCallback(async (): Promise<void> => {
    try {
      const { items } = await listDocs({
        collection: 'stampCards',
      });
      setStampCards(items.map(item => item.data as StampCard));
      setError(null); // 成功時はエラーをクリア
    } catch (err: unknown) {
      console.error('Error fetching stamp cards:', err);
      setError('スタンプカードの取得に失敗しました');
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
      const stamps = items.map(item => item.data as UserStamp);
      const versions = new Map<string, bigint>();
      items.forEach(item => {
        versions.set(item.key, item.version || BigInt(0));
      });
      setUserStamps(stamps);
      setUserStampVersions(versions);
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
      expirationDays: card.expirationDays,
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

    // 全ドキュメントを取得して該当するものを探す
    const { items } = await listDocs({
      collection: 'stampCards',
    });

    const docToDelete = items.find(item => item.key === cardId);
    
    if (!docToDelete) {
      throw new Error('Document not found for deletion');
    }

    await deleteDoc({
      collection: 'stampCards',
      doc: docToDelete,
    });

    await refreshStamps();
  };

  const getUserStamp = (cardId: string): UserStamp | undefined => {
    return userStamps.find(stamp => stamp.cardId === cardId);
  };

  const addStamp = async (cardId: string): Promise<{ isComplete: boolean; shopName: string; reward: string }> => {
    if (!user) throw new Error('User must be authenticated');

    const existingStamp = getUserStamp(cardId);
    const card = stampCards.find(c => c.id === cardId);
    if (!card) throw new Error('Stamp card not found');

    if (existingStamp) {
      // 期限切れチェック
      if (card.expirationDays && existingStamp.firstStampedAt) {
        const expirationDate = existingStamp.firstStampedAt + (card.expirationDays * 24 * 60 * 60 * 1000);
        if (Date.now() > expirationDate) {
          // 期限切れの場合、スタンプをリセット
          const resetStamp: UserStamp = {
            ...existingStamp,
            stampCount: 1, // 1からやり直し
            lastStampedAt: Date.now(),
            updatedAt: Date.now(),
            firstStampedAt: Date.now(), // 新しい開始日時
          };

          const updateDoc = {
            key: existingStamp.id,
            data: resetStamp,
            description: `userId:${user.key}`,
            version: undefined as bigint | undefined,
          };
          
          const version = userStampVersions.get(existingStamp.id);
          if (version !== undefined) {
            updateDoc.version = version;
          }
          
          await setDoc({
            collection: 'userStamps',
            doc: updateDoc,
          });

          // 履歴に期限切れリセットを記録
          const resetHistoryEntry: StampHistory = {
            id: nanoid(),
            userId: user.key,
            cardId,
            action: 'stamp',
            timestamp: Date.now(),
            metadata: {
              stampNumber: 1,
              autoStamp: false,
              expired: true, // 期限切れでリセットされたことを記録
            },
          };

          await setDoc({
            collection: 'stampHistory',
            doc: {
              key: resetHistoryEntry.id,
              data: resetHistoryEntry,
              description: `userId:${user.key}`,
            },
          });

          await refreshStamps();

          // 期限切れメッセージとともに結果を返す
          throw new Error(`スタンプカードの有効期限が切れていたため、リセットされました。新たに1個目のスタンプが押されました。`);
        }
      }

      if (existingStamp.stampCount >= card.requiredStamps) {
        throw new Error('Stamp card is already full');
      }

      const updatedStamp: UserStamp = {
        ...existingStamp,
        stampCount: existingStamp.stampCount + 1,
        lastStampedAt: Date.now(),
        updatedAt: Date.now(),
        firstStampedAt: existingStamp.firstStampedAt || existingStamp.createdAt,
      };

      const updateDoc = {
        key: existingStamp.id,
        data: updatedStamp,
        description: `userId:${user.key}`,
        version: undefined as bigint | undefined,
      };
      
      // バージョンがある場合のみ追加
      const version = userStampVersions.get(existingStamp.id);
      if (version !== undefined) {
        updateDoc.version = version;
      }
      
      await setDoc({
        collection: 'userStamps',
        doc: updateDoc,
      });
    } else {
      const now = Date.now();
      const newUserStamp: UserStamp = {
        id: nanoid(),
        userId: user.key,
        cardId,
        stampCount: 1,
        lastStampedAt: now,
        completedCount: 0,
        createdAt: now,
        updatedAt: now,
        firstStampedAt: now,
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

    // 条件達成をチェック
    const finalStamp = existingStamp 
      ? { ...existingStamp, stampCount: existingStamp.stampCount + 1 }
      : { stampCount: 1 };
    
    return {
      isComplete: finalStamp.stampCount >= card.requiredStamps,
      shopName: card.shopName,
      reward: card.reward,
    };
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


    // 支払いを受けたユーザーのスタンプを取得
    const { items: recipientStamps } = await listDocs({
      collection: 'userStamps',
      filter: {
        matcher: {
          description: `userId:${recipientPrincipal}`,
        },
      },
    });
    
    const existingStampDoc = recipientStamps.find(item => 
      (item.data as UserStamp).cardId === targetCard.id
    );
    const existingStamp = existingStampDoc ? existingStampDoc.data as UserStamp : null;

    if (existingStamp) {
      // 期限切れチェック
      if (targetCard.expirationDays && existingStamp.firstStampedAt) {
        const expirationDate = existingStamp.firstStampedAt + (targetCard.expirationDays * 24 * 60 * 60 * 1000);
        if (Date.now() > expirationDate) {
          // 期限切れの場合、スタンプをリセット
          const resetStamp: UserStamp = {
            ...existingStamp,
            stampCount: 1, // 1からやり直し
            lastStampedAt: Date.now(),
            updatedAt: Date.now(),
            firstStampedAt: Date.now(), // 新しい開始日時
          };

          const updateDoc = {
            key: existingStamp.id,
            data: resetStamp,
            description: `userId:${recipientPrincipal}`,
            version: undefined as bigint | undefined,
          };
          
          if (existingStampDoc && existingStampDoc.version !== undefined) {
            updateDoc.version = existingStampDoc.version;
          }
          
          await setDoc({
            collection: 'userStamps',
            doc: updateDoc,
          });

          // 履歴に期限切れリセットを記録
          const resetHistoryEntry: StampHistory = {
            id: nanoid(),
            userId: recipientPrincipal,
            cardId: targetCard.id,
            action: 'stamp',
            timestamp: Date.now(),
            metadata: {
              stampNumber: 1,
              autoStamp: true,
              paymentReceiver: user.key,
              expired: true, // 期限切れでリセットされたことを記録
            },
          };

          await setDoc({
            collection: 'stampHistory',
            doc: {
              key: resetHistoryEntry.id,
              data: resetHistoryEntry,
              description: `userId:${recipientPrincipal}`,
            },
          });

          await refreshStamps();
          throw new Error(`スタンプカードの有効期限が切れていたため、リセットされました。新たに1個目のスタンプが押されました。`);
        }
      }

      if (existingStamp.stampCount >= targetCard.requiredStamps) {
        throw new Error('Stamp card is already full');
      }

      const updatedStamp: UserStamp = {
        ...existingStamp,
        stampCount: existingStamp.stampCount + 1,
        lastStampedAt: Date.now(),
        updatedAt: Date.now(),
        firstStampedAt: existingStamp.firstStampedAt || existingStamp.createdAt,
      };

      const updateDoc = {
        key: existingStamp.id,
        data: updatedStamp,
        description: `userId:${recipientPrincipal}`,
        version: undefined as bigint | undefined,
      };
      
      // バージョンがある場合のみ追加（recipientStampsから取得）
      if (existingStampDoc && existingStampDoc.version !== undefined) {
        updateDoc.version = existingStampDoc.version;
      }
      
      await setDoc({
        collection: 'userStamps',
        doc: updateDoc,
      });
    } else {
      const now = Date.now();
      const newStamp: UserStamp = {
        id: nanoid(),
        userId: recipientPrincipal,
        cardId: targetCard.id,
        stampCount: 1,
        completedCount: 0,
        createdAt: now,
        lastStampedAt: now,
        updatedAt: now,
        firstStampedAt: now,
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
      firstStampedAt: undefined, // 次回スタンプ開始時にリセット
    };

    const updateDoc = {
      key: userStamp.id,
      data: updatedStamp,
      description: `userId:${user.key}`,
      version: undefined as bigint | undefined,
    };
    
    // バージョンがある場合のみ追加
    const version = userStampVersions.get(userStamp.id);
    if (version !== undefined) {
      updateDoc.version = version;
    }
    
    await setDoc({
      collection: 'userStamps',
      doc: updateDoc,
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