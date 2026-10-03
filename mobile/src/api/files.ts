import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { ApiError, authHeader, buildUrl } from './client';
import { serverUrl } from '@/config/server';
import { t } from '@/i18n';

/** Downloads a PDF report with the user's token and opens the share sheet (save to Files, AirDrop, Mail…). */
export async function shareReport(kind: 'monthly' | 'yearly', period: string | number): Promise<void> {
  const name = kind === 'monthly' ? `money-monitor-${period}.pdf` : `money-monitor-${period}-annual.pdf`;
  const destination = new File(Paths.cache, name);
  if (destination.exists) destination.delete();
  const params = kind === 'monthly' ? { month: String(period) } : { year: Number(period) };
  try {
    const file = await File.downloadFileAsync(buildUrl(`/reports/${kind}`, params), destination, { headers: authHeader() });
    await share(file.uri, 'application/pdf', 'com.adobe.pdf');
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, t('errors.download', { url: serverUrl() }));
  }
}

/** Writes text to a cache file and opens the share sheet. */
export async function shareText(name: string, content: string, mimeType: string, uti?: string): Promise<void> {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  await share(file.uri, mimeType, uti);
}

async function share(uri: string, mimeType: string, UTI?: string) {
  if (!(await Sharing.isAvailableAsync())) throw new ApiError(0, t('errors.noSharing'));
  await Sharing.shareAsync(uri, { mimeType, UTI });
}
