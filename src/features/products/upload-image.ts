import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";

import { uploadProductImage } from "@/lib/storage";

/**
 * Kamera yoki galereyadan rasm tanlab (kvadrat, siqilgan), bucket'ga yuklaydi.
 * Public URL qaytaradi (yoki bekor qilinsa null).
 */
export async function pickAndUpload(
  source: "camera" | "library",
  shopId: string,
): Promise<string | null> {
  const opts: ImagePicker.ImagePickerOptions = {
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.5,
    base64: true,
  };

  let res: ImagePicker.ImagePickerResult;
  if (source === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Ruxsat kerak", "Kameraga ruxsat bering.");
      return null;
    }
    res = await ImagePicker.launchCameraAsync(opts);
  } else {
    res = await ImagePicker.launchImageLibraryAsync({ ...opts, mediaTypes: ["images"] });
  }

  if (res.canceled || !res.assets?.[0]?.base64) return null;
  return uploadProductImage(res.assets[0].base64, shopId);
}
