// 認証設定を一箇所にまとめる
export const AUTH_CONFIG = {
  // Internet Identity ログイン時間設定（30日間）
  MAX_TIME_TO_LIVE: BigInt(30) * BigInt(24) * BigInt(60) * BigInt(60) * BigInt(1_000_000_000), // ナノ秒
  
  // AuthClient アイドルタイムアウト設定（30日間）
  IDLE_TIMEOUT: 30 * 24 * 60 * 60 * 1000, // ミリ秒
  
  // その他の認証設定
  WINDOWED: false,
  ALLOW_PIN: true,
  DISABLE_DEFAULT_IDLE_CALLBACK: true,
} as const; 