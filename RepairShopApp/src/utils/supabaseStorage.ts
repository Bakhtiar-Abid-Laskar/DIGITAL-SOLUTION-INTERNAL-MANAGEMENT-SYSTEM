import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../lib/supabase';

/**
 * Reads a local file:// URI via the Expo FileSystem legacy API,
 * decodes the base64 into a Uint8Array (ArrayBuffer), and uploads it to Supabase Storage.
 * This prevents the "Network request failed" error when React Native fetch tries to send standard ArrayBuffers.
 * Returns the public URL of the uploaded object.
 */
export async function uploadFileToSupabaseStorage(
  bucket: string,
  filePath: string,
  localUri: string,
  contentType: string = 'image/jpeg'
): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
  const arrayBuffer = decode(base64);

  const { error: uploadErr } = await supabase.storage
    .from(bucket)
    .upload(filePath, arrayBuffer, {
      contentType,
      upsert: true,
    });

  if (uploadErr) throw uploadErr;

  const { data: publicData } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return publicData.publicUrl;
}
