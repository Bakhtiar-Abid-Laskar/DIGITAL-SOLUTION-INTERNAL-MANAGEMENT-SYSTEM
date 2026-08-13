import * as ImageManipulator from 'expo-image-manipulator';

export async function compressImage(uri: string): Promise<string> {
  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1080 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    return manipResult.uri;
  } catch (error) {
    console.error('Image compression failed:', error);
    return uri; // Fallback to original uri if compression fails
  }
}
