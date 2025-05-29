'use client';

import React from 'react';

interface CelebrationAnimationProps {
  isVisible: boolean;
  shopName: string;
  reward: string;
  onClose: () => void;
}

export const CelebrationAnimation: React.FC<CelebrationAnimationProps> = ({
  isVisible,
  shopName,
  reward,
  onClose,
}) => {
  React.useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000); // 5秒後に自動的に閉じる
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* 背景のキラキラエフェクト */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute sparkle-animation"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          >
            ✨
          </div>
        ))}
      </div>

      {/* 紙吹雪エフェクト */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(30)].map((_, i) => (
          <div
            key={`confetti-${i}`}
            className="absolute confetti-animation"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              backgroundColor: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'][Math.floor(Math.random() * 6)],
            }}
          />
        ))}
      </div>

      {/* メインコンテンツ */}
      <div className="relative bg-white rounded-2xl p-8 shadow-2xl bounce-in-animation pointer-events-auto max-w-md mx-4">
        <div className="text-center">
          {/* トロフィーアイコン */}
          <div className="text-6xl mb-4 spin-slow-animation">
            🏆
          </div>
          
          <h2 className="text-3xl font-bold text-gray-800 mb-2 fade-in-animation">
            おめでとうございます！
          </h2>
          
          <p className="text-lg text-gray-600 mb-4 fade-in-delay-animation">
            {shopName}のスタンプカードが<br />
            完成しました！
          </p>
          
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg p-4 mb-6 pulse-animation">
            <p className="text-sm mb-1">獲得した特典</p>
            <p className="text-xl font-bold">{reward}</p>
          </div>
          
          <p className="text-sm text-gray-500 mb-4">
            お店で特典を受け取ってください
          </p>
          
          <button
            onClick={onClose}
            className="px-6 py-3 bg-lavender-blue-500 text-white rounded-lg hover:bg-lavender-blue-600 transition-colors font-semibold"
          >
            閉じる
          </button>
        </div>
      </div>

      {/* CSS-in-JS for animations */}
      <style jsx>{`
        @keyframes sparkle {
          0% {
            opacity: 0;
            transform: scale(0) rotate(0deg);
          }
          50% {
            opacity: 1;
            transform: scale(1) rotate(180deg);
          }
          100% {
            opacity: 0;
            transform: scale(0) rotate(360deg);
          }
        }
        
        @keyframes bounce-in {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fade-in-delay {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          50% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        .sparkle-animation {
          animation: sparkle 2s ease-in-out infinite;
        }
        
        .bounce-in-animation {
          animation: bounce-in 0.6s ease-out;
        }
        
        .fade-in-animation {
          animation: fade-in 0.5s ease-out;
        }
        
        .fade-in-delay-animation {
          animation: fade-in-delay 1s ease-out;
        }
        
        .spin-slow-animation {
          animation: spin-slow 3s linear infinite;
        }
        
        .pulse-animation {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: .8;
          }
        }
        
        .confetti-animation {
          width: 10px;
          height: 10px;
          animation: confetti-fall 3s ease-in-out infinite;
        }
        
        @keyframes confetti-fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};