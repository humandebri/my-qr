'use client';

import React from 'react';
import { useAuth } from '@/app/client-providers';
import { StampCardList } from '@/components/StampCardList';
import { signIn } from '@junobuild/core';

export default function StampsPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">スタンプ機能</h1>
          <p className="text-gray-400 mb-8">
            ログインしてスタンプを集めましょう
          </p>
          <button
            onClick={() => signIn()}
            className="px-6 py-3 bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-bold rounded-lg hover:opacity-90 transition-opacity"
          >
            ログイン
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-lavender-blue-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-lavender-blue-500 text-white rounded-xl p-6 mb-8 shadow-lg">
          <h1 className="text-2xl font-bold mb-2">スタンプカード</h1>
          <p className="text-lavender-blue-100">
            お店を利用してスタンプを集めて、特典をゲットしよう！
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-lavender-blue-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-lavender-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-lavender-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 011-1h1m3 0h1a2 2 0 011 1v2M7 7h10" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800">スタンプカード一覧</h2>
          </div>
          <StampCardList />
        </div>
      </div>
    </main>
  );
}