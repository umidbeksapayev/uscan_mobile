import { useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { toast } from "@/lib/toast";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { colors } from "@/theme/colors";
import { useActiveMembership } from "@/features/auth/use-memberships";
import { usePrinterStore, type PrinterType } from "@/features/print/printer-settings";
import { listBluetoothDevices } from "@/features/print/bt-print";
import { printReceipt } from "@/features/print/print-receipt";
import type { ReceiptData } from "@/features/print/types";

type Device = { name: string; address: string };

function TypeCard({
  active, icon, title, subtitle, onPress, accessibilityLabel,
}: {
  active: boolean; icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; onPress: () => void; accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel ?? title}
      className="mb-2 flex-row items-center gap-3 rounded-2xl p-4"
      style={{ backgroundColor: colors.surface, borderWidth: 1.5, borderColor: active ? colors.primary : colors.line }}
    >
      <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: active ? colors.primary : colors.bg }}>
        <Ionicons name={icon} size={20} color={active ? "#fff" : colors.muted} />
      </View>
      <View className="flex-1">
        <Text className="text-base font-medium text-ink">{title}</Text>
        <Text className="text-xs text-muted">{subtitle}</Text>
      </View>
      {active ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
    </Pressable>
  );
}

export default function PrinterSettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const shopName = useActiveMembership()?.shop.name ?? "uscan";

  const type = usePrinterStore((s) => s.type);
  const btAddress = usePrinterStore((s) => s.btAddress);
  const btName = usePrinterStore((s) => s.btName);
  const setSystem = usePrinterStore((s) => s.setSystem);
  const setBluetooth = usePrinterStore((s) => s.setBluetooth);

  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [testing, setTesting] = useState(false);

  async function scan() {
    setScanning(true);
    setDevices([]);
    try {
      const found = (await listBluetoothDevices()) as Device[];
      setDevices(found);
      if (found.length === 0) {
        toast.info(
          t("printer.notFoundTitle", "Qurilma topilmadi"),
          t("printer.notFoundBody", "Printer yoqilgan va telefon bilan ulangan (paired) ekanini tekshiring."),
        );
      }
    } catch (e) {
      toast.error(t("printer.errorTitle", "Bluetooth xatosi"), e instanceof Error ? e.message : t("printer.errorBody", "Qidirib bo'lmadi"));
    } finally {
      setScanning(false);
    }
  }

  async function testPrint() {
    setTesting(true);
    const sample: ReceiptData = {
      shopName,
      saleId: "TEST-0001",
      soldAt: new Date().toISOString(),
      items: [
        { name: t("printer.testItem", "Test mahsulot"), saleType: "unit", quantity: 1, unitPrice: 1000, lineTotal: 1000 },
        { name: t("printer.testSugar", "Shakar"), saleType: "weight", quantity: 0.5, unitPrice: 2000, lineTotal: 1000 },
      ],
      totalRevenue: 2000,
      paymentMethod: "Naqd",
      givenAmount: 5000,
      changeAmount: 3000,
    };
    await printReceipt(sample);
    setTesting(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <View className="flex-row items-center gap-2 px-3 py-2">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityLabel={t("common.close", "Orqaga")}
          className="h-10 w-10 items-center justify-center"
        >
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <Text className="text-xl font-semibold text-ink">{t("printer.title", "Printer")}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text className="mb-2 ml-1 text-xs font-medium text-muted" style={{ letterSpacing: 0.5 }}>
          {t("printer.typeHeader", "PRINTER TURI")}
        </Text>
        <TypeCard
          active={type === "system"}
          icon="print-outline"
          title={t("printer.systemTitle", "Tizim printeri / PDF")}
          subtitle={t("printer.systemSub", "Wi-Fi, AirPrint yoki PDF saqlash (tizim dialogi)")}
          accessibilityLabel={t("printer.systemTitle", "Tizim printeri / PDF")}
          onPress={() => setSystem()}
        />
        <TypeCard
          active={type === "bluetooth"}
          icon="bluetooth-outline"
          title={t("printer.btTitle", "Bluetooth termal (58mm)")}
          subtitle={t("printer.btSub", "ESC-POS chek printeri (to'g'ridan ulanish)")}
          accessibilityLabel={t("printer.btTitle", "Bluetooth termal (58mm)")}
          onPress={() => {
            if (!btAddress) void scan();
            else setBluetooth(btAddress, btName ?? "Printer");
          }}
        />

        {type === "bluetooth" ? (
          <View className="mt-2">
            {btAddress ? (
              <View className="mb-3 flex-row items-center gap-3 rounded-2xl border border-line bg-surface p-4">
                <Ionicons name="bluetooth" size={20} color={colors.primary} />
                <View className="flex-1">
                  <Text className="text-base font-medium text-ink">{btName ?? "Printer"}</Text>
                  <Text className="text-xs text-muted">{btAddress}</Text>
                </View>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              </View>
            ) : null}

            <Pressable
              onPress={scan}
              disabled={scanning}
              accessibilityLabel={t("printer.scanBtn", "Qurilmalarni qidirish")}
              className="mb-3 flex-row items-center justify-center gap-2 rounded-2xl bg-primary-tint"
              style={{ height: 50 }}
            >
              {scanning ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="search" size={18} color={colors.primary} />
                  <Text className="text-base font-medium" style={{ color: colors.primary }}>
                    {t("printer.scanBtn", "Qurilmalarni qidirish")}
                  </Text>
                </>
              )}
            </Pressable>

            {devices.map((d) => {
              const sel = d.address === btAddress;
              const deviceLabel = d.name || t("printer.unknownDevice", "Noma'lum qurilma");
              return (
                <Pressable
                  key={d.address}
                  onPress={() => setBluetooth(d.address, d.name || "Printer")}
                  accessibilityLabel={deviceLabel}
                  className="mb-2 flex-row items-center gap-3 rounded-2xl border bg-surface p-3"
                  style={{ borderColor: sel ? colors.primary : colors.line }}
                >
                  <Ionicons name="hardware-chip-outline" size={20} color={colors.muted} />
                  <View className="flex-1">
                    <Text className="text-base text-ink">{deviceLabel}</Text>
                    <Text className="text-xs text-muted">{d.address}</Text>
                  </View>
                  {sel ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
                </Pressable>
              );
            })}

            <Text className="mt-1 px-1 text-xs text-muted">
              {t("printer.pairHint", "Printerni avval telefon Bluetooth sozlamasida ulang (paired), keyin shu yerda qidiring.")}
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={testPrint}
          disabled={testing}
          accessibilityLabel={t("printer.testBtn", "Test chek chiqarish")}
          className="mt-5 flex-row items-center justify-center gap-2 rounded-2xl bg-primary"
          style={{ height: 54, opacity: testing ? 0.6 : 1 }}
        >
          {testing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="document-text-outline" size={20} color="#fff" />
              <Text className="text-base font-medium text-white">{t("printer.testBtn", "Test chek chiqarish")}</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
