'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import Image from 'next/image';
import { HiDownload } from 'react-icons/hi';

interface StampQRCodeProps {
  stampCardId: string;
  shopName: string;
}

export const StampQRCode: React.FC<StampQRCodeProps> = ({ stampCardId, shopName }) => {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const generateQR = async () => {
      try {
        const stampData = `stamp://${stampCardId}`;
        const url = await QRCode.toDataURL(stampData, {
          errorCorrectionLevel: 'M',
          type: 'image/png',
          width: 256,
          margin: 1,
        });
        setQrUrl(url);
      } catch (err) {
        console.error('QRコード生成エラー:', err);
      }
    };

    generateQR();
  }, [stampCardId]);

  const handleDownload = () => {
    if (qrUrl) {
      const link = document.createElement('a');
      link.download = `stamp-qr-${shopName.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = qrUrl;
      link.click();
    }
  };

  if (!qrUrl) {
    return <div className="animate-pulse bg-gray-600 w-32 h-32 rounded"></div>;
  }

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="relative group"
        aria-label="スタンプQRコードを拡大"
      >
        <Image 
          src={qrUrl} 
          alt={`${shopName} スタンプQRコード`} 
          width={128} 
          height={128} 
          className="w-32 h-32 border border-white/20 rounded hover:opacity-90 transition-opacity"
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded">
          <span className="text-white text-xs">クリックで拡大</span>
        </div>
      </button>

      {modalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" 
          style={{backdropFilter: 'blur(2px)'}}
          onClick={() => setModalOpen(false)}
        >
          <div 
            className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-black text-lg font-bold mb-4">{shopName} スタンプQR</h3>
            <Image 
              src={qrUrl} 
              alt={`${shopName} スタンプQRコード`} 
              width={288} 
              height={288} 
              className="w-72 h-72 mb-4"
            />
            <p className="text-gray-600 text-sm mb-4">
              お客様にこのQRコードをスキャンしてもらってください
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-lavender-blue-500 text-white rounded hover:bg-lavender-blue-600 flex items-center gap-2"
              >
                <HiDownload className="w-5 h-5" />
                Download
              </button>
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 text-gray-700"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};