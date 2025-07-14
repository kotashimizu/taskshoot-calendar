/**
 * 実行時環境変数管理システム
 * サーバーサイドとクライアントサイドの環境変数の不整合を解決
 */

import { logger } from './logger';

interface RuntimeConfig {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  NEXTAUTH_SECRET?: string;
  NEXTAUTH_URL?: string;
  NODE_ENV: string;
  NEXT_PUBLIC_DEMO_MODE: string;
}

type ConfigKey = keyof RuntimeConfig;

class EnvironmentManager {
  private static instance: EnvironmentManager;
  private config: Partial<RuntimeConfig> = {};
  private isInitialized = false;
  private isDemo = false;

  private constructor() {}

  static getInstance(): EnvironmentManager {
    if (!this.instance) {
      this.instance = new EnvironmentManager();
    }
    return this.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.loadConfiguration();
      await this.validateConfiguration();
      this.isInitialized = true;
      logger.info('Environment configuration initialized successfully');
    } catch (error) {
      logger.warn('Failed to initialize environment, activating demo mode', error);
      this.activateDemoMode();
    }
  }

  private async loadConfiguration(): Promise<void> {
    // サーバーサイドでの環境変数読み込み
    if (typeof window === 'undefined') {
      this.config = {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || '',
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
        NODE_ENV: process.env.NODE_ENV || 'development',
        NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE || 'true',
      };
    } else {
      // クライアントサイドでの環境変数読み込み
      // Next.js のビルドタイムに注入された値を使用
      this.config = {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 
          this.getFromWindow('NEXT_PUBLIC_SUPABASE_URL') || '',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
          this.getFromWindow('NEXT_PUBLIC_SUPABASE_ANON_KEY') || '',
        GOOGLE_CLIENT_ID: this.getFromWindow('GOOGLE_CLIENT_ID') || '',
        GOOGLE_CLIENT_SECRET: this.getFromWindow('GOOGLE_CLIENT_SECRET') || '',
        NEXTAUTH_SECRET: this.getFromWindow('NEXTAUTH_SECRET') || '',
        NEXTAUTH_URL: this.getFromWindow('NEXTAUTH_URL') || 'http://localhost:3000',
        NODE_ENV: process.env.NODE_ENV || 'development',
        NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE || 
          this.getFromWindow('NEXT_PUBLIC_DEMO_MODE') || 'true',
      };
    }

    // ローカルストレージからの補完（クライアントサイドのみ）
    if (typeof window !== 'undefined') {
      this.supplementFromLocalStorage();
    }
  }

  private getFromWindow(key: string): string | undefined {
    try {
      return (window as any).__NEXT_DATA__?.env?.[key] || 
             (window as any).__ENV__?.[key];
    } catch {
      return undefined;
    }
  }

  private supplementFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem('taskshoot-env-config');
      if (stored) {
        const parsedConfig = JSON.parse(stored);
        // 空の値のみを補完
        Object.keys(parsedConfig).forEach(key => {
          if (!this.config[key as ConfigKey]) {
            this.config[key as ConfigKey] = parsedConfig[key];
          }
        });
      }
    } catch (error) {
      logger.debug('Failed to load config from localStorage', error);
    }
  }

  private async validateConfiguration(): Promise<void> {
    const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];
    const missing = required.filter(key => !this.config[key as ConfigKey]);

    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }

    // Supabase接続テスト
    if (typeof window !== 'undefined') {
      await this.testSupabaseConnection();
    }
  }

  private async testSupabaseConnection(): Promise<void> {
    try {
      const response = await fetch(
        `${this.config.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`,
        {
          headers: {
            'apikey': this.config.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Supabase connection test failed: ${response.status}`);
      }

      logger.debug('Supabase connection test successful');
    } catch (error) {
      logger.warn('Supabase connection test failed', error);
      throw error;
    }
  }

  private activateDemoMode(): void {
    this.isDemo = true;
    this.config = {
      NEXT_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'demo-anon-key',
      GOOGLE_CLIENT_ID: 'demo-google-client-id',
      GOOGLE_CLIENT_SECRET: 'demo-google-client-secret',
      NEXTAUTH_SECRET: 'demo-nextauth-secret',
      NEXTAUTH_URL: 'http://localhost:3000',
      NODE_ENV: 'development',
      NEXT_PUBLIC_DEMO_MODE: 'true',
    };
    this.isInitialized = true;
    logger.info('Demo mode activated');
  }

  get<K extends ConfigKey>(key: K): RuntimeConfig[K] {
    if (!this.isInitialized) {
      logger.warn(`Accessing config '${key}' before initialization`);
      return '' as RuntimeConfig[K];
    }

    const value = this.config[key];
    if (value === undefined || value === '') {
      logger.warn(`Configuration '${key}' is empty or undefined`);
    }

    return value || ('' as RuntimeConfig[K]);
  }

  getBoolean(key: ConfigKey): boolean {
    const value = this.get(key);
    return value === 'true' || value === '1' || value === 'yes';
  }

  isDemoMode(): boolean {
    return this.isDemo || this.getBoolean('NEXT_PUBLIC_DEMO_MODE');
  }

  isSupabaseConfigured(): boolean {
    return !!(this.get('NEXT_PUBLIC_SUPABASE_URL') && 
              this.get('NEXT_PUBLIC_SUPABASE_ANON_KEY') &&
              !this.isDemo);
  }

  isGoogleOAuthConfigured(): boolean {
    return !!(this.get('GOOGLE_CLIENT_ID') && 
              this.get('GOOGLE_CLIENT_SECRET') &&
              this.get('GOOGLE_CLIENT_ID') !== 'demo-google-client-id');
  }

  // 設定をローカルストレージに保存（オプション）
  saveToLocalStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const saveableConfig = {
          NEXT_PUBLIC_SUPABASE_URL: this.config.NEXT_PUBLIC_SUPABASE_URL,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: this.config.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          NEXTAUTH_URL: this.config.NEXTAUTH_URL,
          NEXT_PUBLIC_DEMO_MODE: this.config.NEXT_PUBLIC_DEMO_MODE,
        };
        localStorage.setItem('taskshoot-env-config', JSON.stringify(saveableConfig));
      } catch (error) {
        logger.debug('Failed to save config to localStorage', error);
      }
    }
  }

  // 設定状態の診断情報
  getDiagnostics() {
    return {
      isInitialized: this.isInitialized,
      isDemoMode: this.isDemoMode(),
      isSupabaseConfigured: this.isSupabaseConfigured(),
      isGoogleOAuthConfigured: this.isGoogleOAuthConfigured(),
      configKeys: Object.keys(this.config),
      environment: this.get('NODE_ENV'),
    };
  }
}

// シングルトンインスタンスをエクスポート
export const envManager = EnvironmentManager.getInstance();

// 従来のインターフェースとの互換性のための関数
export const env = {
  get NEXT_PUBLIC_SUPABASE_URL() {
    return envManager.get('NEXT_PUBLIC_SUPABASE_URL');
  },
  get NEXT_PUBLIC_SUPABASE_ANON_KEY() {
    return envManager.get('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  },
  get SUPABASE_SERVICE_ROLE_KEY() {
    return envManager.get('SUPABASE_SERVICE_ROLE_KEY');
  },
  get GOOGLE_CLIENT_ID() {
    return envManager.get('GOOGLE_CLIENT_ID');
  },
  get GOOGLE_CLIENT_SECRET() {
    return envManager.get('GOOGLE_CLIENT_SECRET');
  },
  get NEXTAUTH_SECRET() {
    return envManager.get('NEXTAUTH_SECRET');
  },
  get NEXTAUTH_URL() {
    return envManager.get('NEXTAUTH_URL');
  },
  get NODE_ENV() {
    return envManager.get('NODE_ENV');
  },
  get isDevelopment() {
    return this.NODE_ENV === 'development';
  },
  get isProduction() {
    return this.NODE_ENV === 'production';
  },
  get isDemoMode() {
    return envManager.isDemoMode();
  },
  get isSupabaseConfigured() {
    return envManager.isSupabaseConfigured();
  },
  get isGoogleOAuthConfigured() {
    return envManager.isGoogleOAuthConfigured();
  },
};

// 初期化用のヘルパー関数
export async function initializeEnvironment(): Promise<void> {
  await envManager.initialize();
}

// React コンポーネント用のフック
export function useEnvironment() {
  return {
    isInitialized: envManager.getDiagnostics().isInitialized,
    isDemoMode: envManager.isDemoMode(),
    config: env,
    diagnostics: envManager.getDiagnostics(),
  };
}