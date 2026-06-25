import { useEffect, useRef, useState } from "react";
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
  Easing,
  useAnimatedStyle,
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

import { colors } from "@/theme/colors";
import { useMemberships } from "@/features/auth/use-memberships";
import { findProductsByBarcode } from "@/features/sell/lookup";
import { useCart } from "@/features/sell/cart-store";
import { useScanReturn } from "@/features/products/scan-return";

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
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { width } = useWindowDimensions();

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice("back");

  const { data: memberships } = useMemberships();
  const shopId = memberships?.[0]?.shop.id;
  const add = useCart((s) => s.add);
  const setPendingWeight = useCart((s) => s.setPendingWeight);
  const setScanCode = useScanReturn((s) => s.setCode);

  const locked = useRef(false);
  const [active, setActive] = useState(true);
  const [torch, setTorch] = useState(false);
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);

  const WINDOW_W = Math.min(width * 0.74, 300);
  const WINDOW_H = Math.round(WINDOW_W * 0.68);

  // Lazer chizig'i: ramka ichida yuqoridan pastga sekin tebranadi.
  const laser = useSharedValue(0);
  useEffect(() => {
    laser.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [laser]);
  const laserStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: laser.value * (WINDOW_H - 6) }],
  }));

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  async function onScan(raw: string) {
    if (locked.current) return;
    locked.current = true;

    // Forma rejimi: kodni qaytaramiz (savatga qo'shmaymiz).
    if (mode === "form") {
      setScanCode(raw);
      setActive(false);
      router.back();
      return;
    }
    if (!shopId) {
      locked.current = false;
      return;
    }
    setStatus({ text: "Qidirilmoqda..." });
    try {
      const found = await findProductsByBarcode(raw, shopId);
      if (found.length === 0) {
        setStatus({ text: `Topilmadi: ${raw}`, error: true });
        setTimeout(() => {
          locked.current = false;
          setStatus(null);
        }, 1500);
        return;
      }
      const product = found[0];
      // VAZN mahsulot → Sotuv ekrani tezkor oynada kg/so'm so'raydi.
      if (product.sale_type === "weight") {
        setPendingWeight(product);
      } else {
        add(product);
      }
      setActive(false);
      router.back();
    } catch {
      setStatus({ text: "Xatolik yuz berdi", error: true });
      setTimeout(() => {
        locked.current = false;
        setStatus(null);
      }, 1500);
    }
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
      if (value) void onScan(value);
    },
  });

  // --- Ruxsat yo'q ---
  if (!hasPermission) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-bg" style={{ padding: 24 }}>
        <View className="h-20 w-20 items-center justify-center rounded-full bg-primary-tint">
          <Ionicons name="camera-outline" size={40} color={colors.primary} />
        </View>
        <Text className="mt-5 text-center text-lg font-medium text-ink">Kameraga ruxsat kerak</Text>
        <Text className="mt-1 text-center text-sm text-muted">
          Shtrix-kodni skanerlash uchun kamera ruxsatini bering.
        </Text>
        <Pressable
          onPress={requestPermission}
          className="mt-6 rounded-2xl bg-primary"
          style={{ paddingHorizontal: 28, paddingVertical: 14 }}
        >
          <Text className="text-base font-medium text-white">Ruxsat berish</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} className="mt-3 p-2">
          <Text className="text-sm text-muted">Orqaga</Text>
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
        <Text className="mt-5 text-center text-lg font-medium text-ink">Kamera topilmadi</Text>
        <Text className="mt-1 text-center text-sm text-muted">
          Qurilmada orqa kamera aniqlanmadi.
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-6 rounded-2xl bg-primary"
          style={{ paddingHorizontal: 28, paddingVertical: 14 }}
        >
          <Text className="text-base font-medium text-white">Orqaga</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const cornerColor = status ? (status.error ? colors.danger : colors.primary) : "#fff";

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
                    borderRadius: 2,
                    backgroundColor: colors.primary,
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
          <Text style={{ color: "rgba(255,255,255,0.92)", fontSize: 15, fontWeight: "500" }}>
            Shtrix-kodni ramka ichiga tuting
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
            <Pressable onPress={() => setTorch((t) => !t)} style={styles.iconBtn}>
              <Ionicons name={torch ? "flash" : "flash-off"} size={22} color="#fff" />
            </Pressable>
          ) : (
            <View style={{ width: 44 }} />
          )}
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
        </View>

        <View style={{ flex: 1 }} pointerEvents="none" />

        <View style={{ alignItems: "center", padding: 24, minHeight: 80 }} pointerEvents="none">
          {status ? (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(200)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: status.error ? colors.danger : "rgba(0,0,0,0.7)",
                paddingHorizontal: 18,
                paddingVertical: 12,
                borderRadius: 14,
              }}
            >
              {!status.error ? <ActivityIndicator color={colors.primaryLight} size="small" /> : null}
              <Text style={{ color: "#fff", fontWeight: "500", fontSize: 15 }}>{status.text}</Text>
            </Animated.View>
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
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
});
