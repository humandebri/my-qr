import { withJuno } from "@junobuild/nextjs-plugin";
import withPWA from "next-pwa";

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

const config = {
  // 開発環境でのファイル監視の最適化
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
  
  // 開発サーバーの最適化
  experimental: {
    // ファイルシステムキャッシュを無効化（開発環境のみ）
    workerThreads: false,
    cpus: 1,
  },
  
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "worker-src 'self' blob:",      // QRスキャナーのWorker用
              "connect-src 'self' https: wss:",
              "media-src 'self' blob:",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default withJuno(pwaConfig(config));
