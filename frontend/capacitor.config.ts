import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.moneymonitor.app',
  appName: 'Money Monitor',
  webDir: 'dist/frontend/browser',
  backgroundColor: '#04050d',
  server: {
    // The backend runs on your computer over plain HTTP during development.
    androidScheme: 'https',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
  ios: {
    contentInset: 'never',
    backgroundColor: '#04050d',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: false,
      backgroundColor: '#04050d',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#00000000',
      overlaysWebView: true,
    },
    Keyboard: {
      resizeOnFullScreen: true,
    },
  },
};

export default config;
