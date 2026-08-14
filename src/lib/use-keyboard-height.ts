import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Klaviatura egallagan balandlik (px) — pastki `paddingBottom` uchun tayyor
 * qiymat. Klaviatura yopiq bo'lsa `0`.
 *
 * Nega `KeyboardAvoidingView` emas: Expo SDK 54 da Android **edge-to-edge**
 * rejimida ishlaydi, ya'ni klaviatura chiqqanda oyna QISQARMAYDI
 * (`softwareKeyboardLayoutMode: "resize"` amalda e'tiborsiz qoladi) va
 * `KeyboardAvoidingView` siljitadigan masofani bilmaydi — kiritish maydoni
 * klaviatura ostida qolib ketadi.
 *
 * ⚠️ Android'da `endCoordinates.height` navigatsiya paneli insetini HISOBGA
 * OLMAYDI, klaviatura esa uning ustiga chiziladi — shu sabab `insets.bottom`
 * qo'shiladi. Busiz panel nav-panel balandligicha klaviatura ostida qoladi.
 * iOS'da bu inset allaqachon ichida, qo'shilmaydi.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const ios = Platform.OS === "ios";
    // iOS — `Will*` (animatsiya bilan bir vaqtda siljisin);
    // Android — `Did*` (`Will*` u yerda umuman chiqmaydi).
    const showEvent = ios ? "keyboardWillChangeFrame" : "keyboardDidShow";
    const hideEvent = ios ? "keyboardWillHide" : "keyboardDidHide";

    const show = Keyboard.addListener(showEvent, (e) => {
      setHeight(e.endCoordinates?.height ?? 0);
    });
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (height === 0) return 0;
  return Platform.OS === "android" ? height + insets.bottom : height;
}
