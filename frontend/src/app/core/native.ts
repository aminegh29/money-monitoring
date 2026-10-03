import { App } from '@capacitor/app';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { Share } from '@capacitor/share';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { isNative, platform } from './config';
import { t } from './i18n';

/** Native integration for the iOS / Android apps. Every function is a safe no-op in the browser. */
export const Native = {
  async init() {
    document.documentElement.classList.add(`platform-${platform}`);
    if (!isNative) return;
    document.documentElement.classList.add('native');
    try {
      // Let the aurora background flow under the status bar; content is padded with safe-area insets.
      if (platform === 'android') await StatusBar.setOverlaysWebView({ overlay: true });
      await Keyboard.setResizeMode({ mode: KeyboardResize.Native }).catch(() => {});
      App.addListener('backButton', ({ canGoBack }) => {
        // Close an open modal/sheet first, then navigate back, then leave the app.
        const backdrop = document.querySelector<HTMLElement>('.modal-backdrop, .sheet-backdrop');
        if (backdrop) backdrop.click();
        else if (canGoBack && location.pathname !== '/app/dashboard' && location.pathname !== '/admin') history.back();
        else App.exitApp();
      });
    } finally {
      setTimeout(() => SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => {}), 300);
    }
  },

  async setStatusBarTheme(theme: 'light' | 'dark') {
    if (!isNative) return;
    await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light }).catch(() => {});
  },

  tap() {
    if (isNative) Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
  },

  success() {
    if (isNative) Haptics.notification({ type: NotificationType.Success }).catch(() => {});
  },

  warning() {
    if (isNative) Haptics.notification({ type: NotificationType.Warning }).catch(() => {});
  },

  /** Saves a file. Browser: regular download. App: writes it to the cache and opens the native share sheet. */
  async saveFile(blob: Blob, filename: string) {
    if (!isNative) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }
    const data = await blobToBase64(blob);
    const { uri } = await Filesystem.writeFile({ path: filename, data, directory: Directory.Cache });
    await Share.share({ title: filename, files: [uri], dialogTitle: t('web.reports.shareTitle') });
  },
};

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
