import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from "expo-camera";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/theme/colors";
import { useMemberships } from "@/features/auth/use-memberships";
import { findProductsByBarcode } from "@/features/sell/lookup";
import { useCart } from "@/features/sell/cart-store";

export default function ScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const { data: memberships } = useMemberships();
  const shopId = memberships?.[0]?.shop.id;
  const add = useCart((s) => s.add);

  const locked = useRef(false);
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  async function onScan(result: BarcodeScanningResult) {
    if (locked.current || !shopId) return;
    locked.current = true;
    setStatus({ text: "Qidirilmoqda..." });
    try {
      const found = await findProductsByBarcode(result.data, shopId);
      if (found.length === 0) {
        setStatus({ text: `Topilmadi: ${result.data}`, error: true });
        setTimeout(() => {
          locked.current = false;
          setStatus(null);
        }, 1500);
        return;
      }
      add(found[0]);
      router.back();
    } catch {
      setStatus({ text: "Xatolik yuz berdi", error: true });
      setTimeout(() => {
        locked.current = false;
        setStatus(null);
      }, 1500);
    }
  }

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-bg" style={{ padding: 24 }}>
        <Ionicons name="camera-outline" size={48} color={colors.muted} />
        <Text className="mt-4 text-center text-lg font-medium text-ink">
          Kameraga ruxsat kerak
        </Text>
        <Text className="mt-1 text-center text-sm text-muted">
          Shtrix-kodni skanerlash uchun kamera ruxsatini bering.
        </Text>
        <Pressable
          onPress={requestPermission}
          className="mt-6 rounded-2xl bg-primary"
          style={{ paddingHorizontal: 24, paddingVertical: 13 }}
        >
          <Text className="text-base font-medium text-white">Ruxsat berish</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} className="mt-3">
          <Text className="text-sm text-muted">Orqaga</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={onScan}
        barcodeScannerSettings={{
          barcodeTypes: [
            "qr",
            "ean13",
            "ean8",
            "upc_a",
            "upc_e",
            "code128",
            "code39",
            "code93",
            "itf14",
          ],
        }}
      />
      <SafeAreaView style={{ flex: 1, justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", justifyContent: "flex-end", padding: 16 }}>
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "rgba(0,0,0,0.5)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
        </View>

        <View style={{ alignItems: "center" }}>
          <View
            style={{
              width: 250,
              height: 160,
              borderWidth: 3,
              borderColor: "#fff",
              borderRadius: 18,
            }}
          />
          <Text style={{ color: "#fff", marginTop: 16, fontSize: 15 }}>
            Shtrix-kodni ramka ichiga tuting
          </Text>
        </View>

        <View style={{ alignItems: "center", padding: 24, minHeight: 70 }}>
          {status ? (
            <View
              style={{
                backgroundColor: status.error ? colors.danger : "rgba(0,0,0,0.65)",
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 12,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "500" }}>{status.text}</Text>
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
});
