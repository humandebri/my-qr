'use client';

import React from 'react';
import QRCode from 'qrcode';

interface RewardClaimQRCodeProps {
  cardId: string;
  userId: string;
  reward: string;
  size?: number;
}

export const RewardClaimQRCode: React.FC<RewardClaimQRCodeProps> = ({
  cardId,
  userId,
  reward,
  size = 200,
}) => {
  const [qrCodeUrl, setQrCodeUrl] = React.useState<string>('');

  React.useEffect(() => {
    const generateQRCode = async () => {
      try {
        // 特典受け取り用のQRコードデータ
        const claimData = `claim://${cardId}/${userId}`;
        const url = await QRCode.toDataURL(claimData, {
          width: size,
          margin: 1,
          color: {
            dark: '#6b7ae4',
            light: '#ffffff',
          },
        });
        setQrCodeUrl(url);
      } catch (error) {
        console.error('QRコード生成エラー:', error);
      }
    };

    generateQRCode();
  }, [cardId, userId, size]);

  if (!qrCodeUrl) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-100 rounded-lg"
        style={{ width: size, height: size }}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lavender-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qrCodeUrl}
        alt={`特典受け取り用QRコード - ${reward}`}
        className="rounded-lg shadow-sm mx-auto"
        style={{ width: size, height: size }}
      />
      <p className="text-xs text-gray-600 mt-2">
        店舗でこのQRコードを提示してください
      </p>
    </div>
  );
};