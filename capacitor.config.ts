import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vaultwise.app',
  appName: 'VaultWise',
  webDir: 'dist',
  ios: {
    contentInset: 'always'
  },
  plugins: {
    StatusBar: {
      style: 'dark',
      backgroundColor: '#3b82f6'
    }
  }
};

export default config;
