import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from "react-native-vision-camera";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { useScanHandler } from "@/features/scanner/use-scan-handler";
import { useCart } from "@/features/sell/cart-store";
import { cartTotal } from "@/features/sell/cart-total";
import { useScanReturn } from "@/features/products/scan-return";
import { formatCurrency } from "@/lib/format";
import { radius, text } from "@/theme/tokens";
import { easing } from "@/theme/motion";

const MASK = "rgba(15,23,42,0.55)";

/** Nishon burchak qavsi (L-shakl). */
function Corner({
  pos,
  color,
}: {
  pos: "tl" | "tr" | "bl" | "br";
  color: string;
}) {
  const size = 30;
  const w = 4;
  const r = 14;
  const base = { position: "absolute" as const, width: size, height: size, borderColor: color };
  const corners = {
    tl: { top: 0, left: 0, borderTopWidth: w, borderLeftWidth: w, borderTopLeftRadius: r },
    tr: { top: 0, right: 0, borderTopWidth: w, borderRightWidth: w, borderTopRightRadius: r },
    bl: { bottom: 0, left: 0, borderBottomWidth: w, borderLeftWidth: w, borderBottomLeftRadius: r },
    br: { bottom: 0, right: 0, borderBottomWidth: w, borderRightWidth: w, borderBottomRightRadius: r },
  };
  return <View style={[base, corners[pos]]} />;
}

export default function ScannerScreen() {
  const colors = useColors();

  const router = useRouter();
  const { t } = useTranslation();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { width } = useWindowDimensions();

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice("back");

  const setScanCode = useScanReturn((s) => s.setCode);
  // Savat paneli uchun — har skandan keyin qayta render bo'lishi KERAK
  // (sanoq va summa darhol yangilanadi).
  const cartItems = useCart((s) => s.items);

  const [active, setActive] = useState(true);
  const [torch, setTorch] = useState(false);

  const WINDOW_W = Math.min(width * 0.74, 300);
  const WINDOW_H = Math.round(WINDOW_W * 0.68);

  // Lazer chizig'i: ramka ichida yuqoridan pastga sekin tebranadi.
  // Tizimda "harakatni kamaytirish" yoqilgan bo'lsa — cheksiz tebranish
  // o'rniga chiziq ramka o'rtasida qimirlamay turadi (vestibulyar sezgirlik).
  const reduceMotion = useReducedMotion();
  const laser = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) {
      laser.set(0.5);
      return;
    }
    laser.set(withRepeat(withTiming(1, { duration: 2200, easing: easing.inOut }), -1, true));
  }, [laser, reduceMotion]);
  const laserStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: laser.get() * (WINDOW_H - 6) }],
  }));

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  /*
    Skanerlash mantiqi endi `features/scanner` da (kamera, HID va kelajakdagi
    boshqa manbalar bitta quvurdan o'tadi). Bu ekran faqat UI va navigatsiya.
  */
  const { handleScan, status } = useScanHandler({
    // VAZN mahsulot → kg so'raydigan oyna SOTUV ekranida yashaydi.
    // ⚠️ `router.back()` YETMAYDI: skaner pastki navigatsiyaning markaziy
    // tugmasidan, ya'ni ISTALGAN ekrandan ochiladi — Bosh sahifadan
    // ochilganda `back()` Bosh sahifaga qaytarardi va oyna umuman
    // ochilmasdi (mahsulot jimgina yo'qolardi).
    onWeight: () => {
      setActive(false);
      router.dismissTo("/sotuv");
    },
  });

  function onScan(raw: string) {
    // Forma rejimi: kodni qaytaramiz (savatga qo'shmaymiz).
    if (mode === "form") {
      setScanCode(raw);
      setActive(false);
      router.back();
      return;
    }
    /*
      DONALI mahsulotda skanerdan CHIQMAYMIZ — kassir odatda ketma-ket bir
      nechta mahsulot skanerlaydi; har safar ekran almashishi shu oqimni
      uzardi. Savat pastdagi panelda yangilanadi.
    */
    handleScan(raw);
  }

  const codeScanner = useCodeScanner({
    codeTypes: [
      "qr",
      "ean-13",
      "ean-8",
      "upc-e",
      "code-128",
      "code-39",
      "code-93",
      "itf",
      "data-matrix",
    ],
    onCodeScanned: (codes) => {
      const value = codes[0]?.value;
      if (value) onScan(value);
    },
  });

  // --- Ruxsat yo'q ---
  if (!hasPermission) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-bg" style={{ padding: 24 }}>
        <View className="h-20 w-20 items-center justify-center rounded-full bg-primary-tint">
          <Ionicons name="camera-outline" size={40} color={colors.primary} />
        </View>
        <Text className="mt-5 text-center text-lg font-medium text-ink">{t("scanner.camPermTitle", "Kameraga ruxsat kerak")}</Text>
        <Text className="mt-1 text-center text-sm text-muted">
          {t("scanner.camPermSub", "Shtrix-kodni skanerlash uchun kamera ruxsatini bering.")}
        </Text>
        <Pressable
          onPress={requestPermission}
          accessibilityLabel={t("scanner.permBtn", "Ruxsat berish")}
          className="mt-6 rounded-2xl bg-primary"
          style={{ paddingHorizontal: 28, paddingVertical: 14 }}
        >
          <Text className="text-base font-medium text-white">{t("scanner.permBtn", "Ruxsat berish")}</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} accessibilityLabel={t("common.close", "Orqaga")} className="mt-3 p-2">
          <Text className="text-sm text-muted">{t("common.close", "Orqaga")}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // --- Kamera topilmadi ---
  if (!device) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-bg" style={{ padding: 24 }}>
        <View className="h-20 w-20 items-center justify-center rounded-full bg-primary-tint">
          <Ionicons name="videocam-off-outline" size={40} color={colors.muted} />
        </View>
        <Text className="mt-5 text-center text-lg font-medium text-ink">{t("scanner.noCamTitle", "Kamera topilmadi")}</Text>
        <Text className="mt-1 text-center text-sm text-muted">
          {t("scanner.noCamSub", "Qurilmada orqa kamera aniqlanmadi.")}
        </Text>
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel={t("common.close", "Orqaga")}
          className="mt-6 rounded-2xl bg-primary"
          style={{ paddingHorizontal: 28, paddingVertical: 14 }}
        >
          <Text className="text-base font-medium text-white">{t("common.close", "Orqaga")}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const cornerColor = status ? (status.tone === "error" ? colors.danger : colors.primary) : "#fff";

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={active}
        codeScanner={codeScanner}
        torch={torch ? "on" : "off"}
      />

      {/* Maska (qorong'i vignette + tiniq markaziy oyna) */}
      <View style={StyleSheet.absoluteFill}>
        <View style={{ flex: 1, backgroundColor: MASK }} />
        <View style={{ flexDirection: "row", height: WINDOW_H }}>
          <View style={{ flex: 1, backgroundColor: MASK }} />
          <View style={{ width: WINDOW_W, height: WINDOW_H }}>
            <Corner pos="tl" color={cornerColor} />
            <Corner pos="tr" color={cornerColor} />
            <Corner pos="bl" color={cornerColor} />
            <Corner pos="br" color={cornerColor} />
            {!status ? (
              <Animated.View
                style={[
                  {
                    position: "absolute",
                    left: 14,
                    right: 14,
                    top: 0,
                    height: 3,
                    borderRadius: radius.full,
                    backgroundColor: colors.primary,
                    // Ataylab `theme/shadows.ts` presetlaridan foydalanmaydi:
                    // bu karta soyasi emas, skaner nurining porlashi (elevation
                    // yo'q, offset nol, opacity 0.9).
                    shadowColor: colors.primary,
                    shadowOpacity: 0.9,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 0 },
                  },
                  laserStyle,
                ]}
              />
            ) : null}
          </View>
          <View style={{ flex: 1, backgroundColor: MASK }} />
        </View>
        <View style={{ flex: 1, backgroundColor: MASK, alignItems: "center", paddingTop: 18 }}>
          <Text style={{ color: "rgba(255,255,255,0.92)", fontSize: text.base, fontWeight: "500" }}>
            {t("scanner.frameHint", "Shtrix-kodni ramka ichiga tuting")}
          </Text>
        </View>
      </View>

      {/* Ustki boshqaruv + pastki status */}
      <SafeAreaView style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View
          style={{ flexDirection: "row", justifyContent: "space-between", padding: 16 }}
          pointerEvents="box-none"
        >
          {device.hasTorch ? (
            <Pressable
              onPress={() => setTorch((t) => !t)}
              accessibilityLabel={t("scanner.torchBtn", "Chiroqni yoqish/o'chirish")}
              style={styles.iconBtn}
            >
              <Ionicons name={torch ? "flash" : "flash-off"} size={22} color="#fff" />
            </Pressable>
          ) : (
            <View style={{ width: 44 }} />
          )}
          <Pressable
            onPress={() => router.back()}
            accessibilityLabel={t("common.close", "Yopish")}
            style={styles.iconBtn}
          >
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
        </View>

        <View style={{ flex: 1 }} pointerEvents="none" />

        <View style={{ alignItems: "center", paddingHorizontal: 24, minHeight: 68 }} pointerEvents="none">
          {status ? (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(200)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor:
                  status.tone === "error"
                    ? colors.danger
                    : status.tone === "ok"
                      ? colors.success
                      : "rgba(0,0,0,0.7)",
                paddingHorizontal: 18,
                paddingVertical: 12,
                borderRadius: radius.lg,
              }}
            >
              {status.tone === "ok" ? (
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
              ) : status.tone === "info" ? (
                <ActivityIndicator color={colors.primaryLight} size="small" />
              ) : null}
              <Text
                numberOfLines={1}
                style={{ color: "#fff", fontWeight: "500", fontSize: text.base, flexShrink: 1 }}
              >
                {status.text}
              </Text>
            </Animated.View>
          ) : null}
        </View>

        {/*
          Savat paneli — skaner endi Sotuv ekranidan emas, pastki
          navigatsiyadan ham ochiladi, ya'ni savatga qaytish yo'li shu
          yerda bo'lishi SHART (aks holda to'lovga o'tish uchun majburan
          biror narsa skanerlash kerak bo'lardi).
        */}
        <View style={{ padding: 16, paddingTop: 0 }} pointerEvents="box-none">
          {/* "form" rejimida (mahsulot formasiga shtrix-kod tanlash) savat
              umuman aloqasiz — panel ko'rsatilmaydi. */}
          {mode !== "form" && cartItems.length > 0 ? (
            <Pressable
              onPress={() => {
                setActive(false);
                router.dismissTo("/sotuv");
              }}
              accessibilityRole="button"
              accessibilityLabel={`${t("sell.goToCart")}: ${cartItems.length}`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                height: 58,
                paddingHorizontal: 18,
                borderRadius: radius.lg,
                backgroundColor: colors.primary,
              }}
            >
              <Ionicons name="cart" size={22} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#fff", fontSize: text.base, fontWeight: "600" }}>
                  {t("sell.goToCart")}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: text.xs }}>
                  {/* Atayin `count` EMAS, `n`: i18next `count` ni ko'rsa
                      ko'plik shakllarini (`_one`/`_few`/`_many`) qidiradi va
                      rus tilida kalit topilmay qolardi. */}
                  {t("sell.cartCount", { n: cartItems.length })} ·{" "}
                  {formatCurrency(cartTotal(cartItems))}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
});
