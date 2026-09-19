import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../lib/supabase';

/**
 * Reads a local URI (file:// on native, blob:/data: on web),
 * decodes or extracts the file data, and uploads it to Supabase Storage.
 * This prevents the "Network request failed" error when React Native fetch tries to send standard ArrayBuffers.
 * Returns the public URL of the uploaded object.
 */
export async function uploadFileToSupabaseStorage(
  bucket: string,
  filePath: string,
  localUri: string,
  contentType: string = 'image/jpeg'
): Promise<string> {
  let fileData: ArrayBuffer | Blob;

  if (Platform.OS === 'web') {
    const res = await fetch(localUri);
    fileData = await res.blob();
  } else {
    const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
    fileData = decode(base64);
  }

  const { error: uploadErr } = await supabase.storage
    .from(bucket)
    .upload(filePath, fileData, {
      contentType,
      upsert: true,
    });

  if (uploadErr) throw uploadErr;

  const { data: publicData } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return publicData.publicUrl;
}
