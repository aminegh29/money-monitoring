/**
 * Default backend address baked into the iOS / Android app builds.
 * Set it to your computer's Wi-Fi IP (run `ipconfig`) before `npm run android:apk`, so a real phone
 * on the same network connects without typing anything. Leave empty to use the emulator defaults
 * (10.0.2.2 on Android, localhost on iOS). It can always be changed from the "Server" button on sign-in.
 */
export const NATIVE_SERVER_URL = 'http://172.20.10.4:8080';
