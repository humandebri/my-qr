'use client';

import React from 'react';
import QRCode from 'qrcode';

interface DownloadableQRCodeProps {
  stampCardId: string;
  shopName: string;
  description: string;
  requiredStamps: number;
  reward: string;
  size?: number;
}

export const DownloadableQRCode: React.FC<DownloadableQRCodeProps> = ({
  stampCardId,
  shopName,
  description,
  requiredStamps,
  reward,
  size = 300,
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [qrCodeUrl, setQrCodeUrl] = React.useState<string>('');

  React.useEffect(() => {
    const generateQRCode = async () => {
      try {
        const stampData = `stamp://${stampCardId}`;
        const url = await QRCode.toDataURL(stampData, {
          width: size,
          margin: 2,
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
  }, [stampCardId, size]);

  const downloadQRCodeWithInfo = async () => {
    if (!qrCodeUrl || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // キャンバスサイズを設定（QRコード + 説明文のスペース）
    const canvasWidth = 600;
    const canvasHeight = 800;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // 背景を白に設定
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // QRコードを描画
    const qrImage = new Image();
    qrImage.onload = () => {
      const qrSize = 300;
      const qrX = (canvasWidth - qrSize) / 2;
      const qrY = 50;
      
      ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

      // テキスト情報を追加
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      
      // タイトル
      ctx.font = 'bold 28px Arial';
      ctx.fillText('スタンプカード', canvasWidth / 2, qrY + qrSize + 60);
      
      // 店舗名
      ctx.font = 'bold 24px Arial';
      ctx.fillStyle = '#6b7ae4';
      ctx.fillText(shopName, canvasWidth / 2, qrY + qrSize + 100);
      
      // 説明
      ctx.font = '18px Arial';
      ctx.fillStyle = '#333333';
      const maxWidth = canvasWidth - 80;
      wrapText(ctx, description, canvasWidth / 2, qrY + qrSize + 140, maxWidth, 25);
      
      // 必要スタンプ数と特典
      ctx.font = 'bold 20px Arial';
      ctx.fillStyle = '#000000';
      ctx.fillText(`必要スタンプ数: ${requiredStamps}個`, canvasWidth / 2, qrY + qrSize + 220);
      
      ctx.font = '18px Arial';
      ctx.fillStyle = '#e53e3e';
      ctx.fillText(`特典: ${reward}`, canvasWidth / 2, qrY + qrSize + 250);
      
      // 使用方法
      ctx.font = '16px Arial';
      ctx.fillStyle = '#666666';
      ctx.fillText('スマートフォンでQRコードを読み取って', canvasWidth / 2, qrY + qrSize + 300);
      ctx.fillText('スタンプを貯めましょう！', canvasWidth / 2, qrY + qrSize + 325);
      
      // URL表示
      ctx.font = '14px Arial';
      ctx.fillStyle = '#999999';
      ctx.fillText('MyQR スタンプカードシステム', canvasWidth / 2, qrY + qrSize + 370);

      // ダウンロード実行
      const link = document.createElement('a');
      link.download = `${shopName}_スタンプカード_QR.png`;
      link.href = canvas.toDataURL();
      link.click();
    };
    
    qrImage.src = qrCodeUrl;
  };

  // テキストを複数行に分割する関数
  const wrapText = (
    context: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ) => {
    const words = text.split('');
    let line = '';
    let currentY = y;

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i];
      const metrics = context.measureText(testLine);
      const testWidth = metrics.width;

      if (testWidth > maxWidth && i > 0) {
        context.fillText(line, x, currentY);
        line = words[i];
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    context.fillText(line, x, currentY);
  };

  if (!qrCodeUrl) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lavender-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrCodeUrl}
          alt={`${shopName}のスタンプカード用QRコード`}
          className="rounded-lg shadow-sm mx-auto"
          style={{ width: size, height: size }}
        />
      </div>
      
      <button
        onClick={downloadQRCodeWithInfo}
        className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        QRコード（説明付き）をダウンロード
      </button>
      
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
      />
    </div>
  );
};