import { useCallback, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { toast } from "@/lib/toast";
import { useColors } from "@/theme/theme-store";
import { useActiveMembership, useActiveShopId } from "@/features/auth/use-memberships";
import { usePrinterStore, printerTarget } from "@/features/print/printer-settings";
import { listBluetoothDevices } from "@/features/print/transports/bluetooth";
import { connectPrinter, disconnectPrinter, usePrinterManager } from "@/features/print/printer-manager";
import { statusView, showsConnectionStatus } from "@/features/print/printer-status";
import { printErrorMessage } from "@/features/print/print-messages";
import { printTest } from "@/features/print/print-receipt";
import { loadFailedJobs, resetJobForRetry } from "@/features/print/print-queue-db";
import { discardJob } from "@/features/print/print-queue-runner";
import { retryPrintQueue } from "@/features/print/use-print-queue";
import type { PrintJob } from "@/features/print/print-queue";
import type { Codepage } from "@/features/print/escpos-codepage";
import type { ReceiptData } from "@/features/print/types";
import { ScreenHeader } from "@/components/ui/screen";
import { radius } from "@/theme/tokens";

type Device = { name: string; address: string };

function TypeCard({
  active, icon, title, subtitle, onPress, accessibilityLabel,
}: {
  active: boolean; icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; onPress: () => void; accessibilityLabel?: string;
}) {
  const colors = useColors();

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

/** Bo'lim sarlavhasi — takrorlanadigan uslubni bitta joyga yig'adi. */
function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="mb-2 ml-1 text-xs font-medium text-muted" style={{ letterSpacing: 0.5 }}>
      {children}
    </Text>
  );
}

export default function PrinterSettingsScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const qc = useQueryClient();

  const shopId = useActiveShopId();
  const shopName = useActiveMembership()?.shop.name ?? "uscan";

  const type = usePrinterStore((s) => s.type);
  const btAddress = usePrinterStore((s) => s.btAddress);
  const btName = usePrinterStore((s) => s.btName);
  const codepage = usePrinterStore((s) => s.codepage);
  const paperWidth = usePrinterStore((s) => s.paperWidth);
  const setSystem = usePrinterStore((s) => s.setSystem);
  const setBluetooth = usePrinterStore((s) => s.setBluetooth);
  const setCodepage = usePrinterStore((s) => s.setCodepage);
  const setPaperWidth = usePrinterStore((s) => s.setPaperWidth);

  const status = usePrinterManager((s) => s.status);

  /*
    Panel ko'rinishi `type` DAN ATAYLAB AJRATILGAN.

    XATO (qurilmada topildi): panel avval `type === "bluetooth"` shartiga
    bog'langan edi — ya'ni qurilmalar ro'yxati faqat qurilma TANLANGANDAN
    keyin ko'rinardi. Lekin qurilma tanlash uchun ro'yxatni ko'rish kerak —
    tuxum-tovuq. Foydalanuvchi "Bluetooth termal" ni bosganda hech narsa
    ko'rinmasdi, chunki scan() ishlagan bo'lsa ham natijasini chiqaradigan
    joy hali yopiq edi.

    Endi panel FOYDALANUVCHI NIYATIGA (bosdimi) bog'langan, saqlangan
    HOLATGA emas. Boshlang'ich qiymat `isBt`dan — printer allaqachon
    Bluetooth'ga sozlangan bo'lsa panel ochiq kelsin.
  */
  const [btPanelOpen, setBtPanelOpen] = useState(type === "bluetooth");

  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [testing, setTesting] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const { data: failedJobs } = useQuery({
    queryKey: ["print-queue-failed", shopId],
    queryFn: () => loadFailedJobs(shopId as string),
    enabled: !!shopId,
  });

  const refreshQueue = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["print-queue-failed"] });
  }, [qc]);

  async function scan() {
    setScanning(true);
    setDevices([]);
    try {
      const found = (await listBluetoothDevices()) as Device[];
      setDevices(found);
      if (found.length === 0) {
        toast.info(t("printer.notFoundTitle"), t("printer.notFoundBody"));
      }
    } catch (e) {
      toast.error(t("printer.errorTitle"), e instanceof Error ? e.message : t("printer.errorBody"));
    } finally {
      setScanning(false);
    }
  }

  async function reconnect() {
    setReconnecting(true);
    const res = await connectPrinter(printerTarget());
    setReconnecting(false);
    if (!res.ok) toast.error(t("printer.errorTitle"), printErrorMessage(res.kind));
  }

  function removePrinter() {
    Alert.alert(t("printer.removeTitle"), t("printer.removeBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("printer.remove"),
        style: "destructive",
        onPress: () => {
          // Ulanishni ham yopamiz — aks holda BT stack'da osilib qolardi.
          void disconnectPrinter();
          setSystem();
          setDevices([]);
        },
      },
    ]);
  }

  async function testPrint() {
    setTesting(true);
    const sample: ReceiptData = {
      shopName,
      saleId: "TEST-0001",
      soldAt: new Date().toISOString(),
      items: [
        { name: t("printer.testItem"), saleType: "unit", quantity: 1, unitPrice: 1000, lineTotal: 1000 },
        { name: t("printer.testSugar"), saleType: "weight", quantity: 0.5, unitPrice: 2000, lineTotal: 1000 },
      ],
      totalRevenue: 2000,
      paymentMethod: "Naqd",
      givenAmount: 5000,
      changeAmount: 3000,
    };
    await printTest(sample);
    setTesting(false);
  }

  async function retryAll() {
    if (!shopId) return;
    setRetrying(true);
    // Chiqmay qolganlar `failed` da turadi — drenaj faqat `pending` ni oladi,
    // shuning uchun avval ularni qayta urinishga qo'yamiz.
    for (const j of failedJobs ?? []) await resetJobForRetry(j.job_id);
    await retryPrintQueue(shopId);
    setRetrying(false);
    refreshQueue();
  }

  function onDiscard(job: PrintJob) {
    Alert.alert(t("printer.queueDiscardTitle"), t("printer.queueDiscardBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("printer.queueDiscard"),
        style: "destructive",
        onPress: () => {
          void discardJob(job.job_id).then(refreshQueue);
        },
      },
    ]);
  }

  const isBt = type === "bluetooth";
  const view = statusView(status);
  const toneColor = {
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
    muted: colors.tabInactive,
  }[view.tone];

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <ScreenHeader title={t("printer.title")} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <SectionLabel>{t("printer.typeHeader")}</SectionLabel>
        <TypeCard
          active={type === "system"}
          icon="print-outline"
          title={t("printer.systemTitle")}
          subtitle={t("printer.systemSub")}
          onPress={() => {
            setBtPanelOpen(false);
            void disconnectPrinter();
            setSystem();
          }}
        />
        <TypeCard
          active={isBt}
          icon="bluetooth-outline"
          title={t("printer.btTitle")}
          subtitle={t("printer.btSub")}
          onPress={() => {
            setBtPanelOpen(true);
            if (!btAddress) void scan();
            else setBluetooth(btAddress, btName ?? "Printer");
          }}
        />

        {btPanelOpen ? (
          <View className="mt-2">
            {btAddress ? (
              <View className="mb-3 rounded-2xl border border-line bg-surface p-4">
                <View className="flex-row items-center gap-3">
                  <Ionicons name="bluetooth" size={20} color={colors.primary} />
                  <View className="flex-1">
                    <Text className="text-base font-medium text-ink">{btName ?? "Printer"}</Text>
                    <Text className="text-xs text-muted">{btAddress}</Text>
                  </View>
                </View>

                {/* Jonli ulanish holati — ilgari foydalanuvchi buni faqat
                    chek bosib ko'rib bilardi (P0-3). */}
                {showsConnectionStatus(type) ? (
                  <View className="mt-3 flex-row items-center gap-2">
                    <View
                      style={{ width: 9, height: 9, borderRadius: radius.full, backgroundColor: toneColor }}
                    />
                    <Text className="text-sm font-medium" style={{ color: toneColor }}>
                      {t(view.labelKey)}
                    </Text>
                  </View>
                ) : null}

                <View className="mt-3 flex-row gap-2">
                  <Pressable
                    onPress={() => void reconnect()}
                    disabled={reconnecting}
                    accessibilityRole="button"
                    accessibilityLabel={t("printer.reconnect")}
                    className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary-tint"
                    style={{ height: 44, opacity: reconnecting ? 0.6 : 1 }}
                  >
                    {reconnecting ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <>
                        <Ionicons name="refresh" size={17} color={colors.primary} />
                        <Text className="text-sm font-medium" style={{ color: colors.primary }}>
                          {t("printer.reconnect")}
                        </Text>
                      </>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={removePrinter}
                    accessibilityRole="button"
                    accessibilityLabel={t("printer.remove")}
                    className="items-center justify-center rounded-xl bg-bg"
                    style={{ height: 44, width: 44 }}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </Pressable>
                </View>
              </View>
            ) : null}

            <Pressable
              onPress={scan}
              disabled={scanning}
              accessibilityLabel={t("printer.scanBtn")}
              className="mb-3 flex-row items-center justify-center gap-2 rounded-2xl bg-primary-tint"
              style={{ height: 50 }}
            >
              {scanning ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="search" size={18} color={colors.primary} />
                  <Text className="text-base font-medium" style={{ color: colors.primary }}>
                    {t("printer.scanBtn")}
                  </Text>
                </>
              )}
            </Pressable>

            {devices.map((d) => {
              const sel = d.address === btAddress;
              const deviceLabel = d.name || t("printer.unknownDevice");
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

            <Text className="mt-1 px-1 text-xs text-muted">{t("printer.pairHint")}</Text>

            {/* Kod sahifasi — FAQAT termal printer uchun. Tizim printeri
                HTML chiqaradi va Unicode'ni o'zi uddalaydi. */}
            <View style={{ marginTop: 24 }}>
              <SectionLabel>{t("printer.codepageHeader")}</SectionLabel>
              {(
                [
                  ["cp866", t("printer.cp866"), t("printer.cp866Sub")],
                  ["cp1251", t("printer.cp1251"), t("printer.cp1251Sub")],
                  ["ascii", t("printer.ascii"), t("printer.asciiSub")],
                ] as [Codepage, string, string][]
              ).map(([cp, label, sub]) => (
                <Pressable
                  key={cp}
                  onPress={() => setCodepage(cp)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: codepage === cp }}
                  accessibilityLabel={label}
                  className="mb-2 flex-row items-center gap-3 rounded-2xl bg-surface p-3"
                  style={{
                    borderWidth: 1.5,
                    borderColor: codepage === cp ? colors.primary : colors.line,
                  }}
                >
                  <Ionicons
                    name={codepage === cp ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={codepage === cp ? colors.primary : colors.tabInactive}
                  />
                  <View className="flex-1">
                    <Text className="text-base text-ink">{label}</Text>
                    <Text className="text-xs text-muted">{sub}</Text>
                  </View>
                </Pressable>
              ))}
              <Text className="mt-1 px-1 text-xs text-muted">{t("printer.codepageHint")}</Text>
            </View>
          </View>
        ) : null}

        <View style={{ marginTop: 20 }}>
          <SectionLabel>{t("printer.widthHeader")}</SectionLabel>
          {(
            [
              [58, t("printer.width58"), t("printer.width58Sub")],
              [80, t("printer.width80"), t("printer.width80Sub")],
            ] as [58 | 80, string, string][]
          ).map(([w, label, sub]) => (
            <Pressable
              key={w}
              onPress={() => setPaperWidth(w)}
              accessibilityRole="radio"
              accessibilityState={{ selected: paperWidth === w }}
              accessibilityLabel={label}
              className="mb-2 flex-row items-center gap-3 rounded-2xl bg-surface p-3"
              style={{
                borderWidth: 1.5,
                borderColor: paperWidth === w ? colors.primary : colors.line,
              }}
            >
              <Ionicons
                name={paperWidth === w ? "radio-button-on" : "radio-button-off"}
                size={20}
                color={paperWidth === w ? colors.primary : colors.tabInactive}
              />
              <View className="flex-1">
                <Text className="text-base text-ink">{label}</Text>
                <Text className="text-xs text-muted">{sub}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={testPrint}
          disabled={testing}
          accessibilityLabel={t("printer.testBtn")}
          className="mt-6 flex-row items-center justify-center gap-2 rounded-2xl bg-primary"
          style={{ height: 54, opacity: testing ? 0.6 : 1 }}
        >
          {testing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="document-text-outline" size={20} color="#fff" />
              <Text className="text-base font-medium text-white">{t("printer.testBtn")}</Text>
            </>
          )}
        </Pressable>

        {/* Chiqmay qolgan cheklar — ilgari ular umuman yo'qolardi (P0-1). */}
        {failedJobs && failedJobs.length > 0 ? (
          <View style={{ marginTop: 28 }}>
            <SectionLabel>{t("printer.queueHeader")}</SectionLabel>
            {failedJobs.map((job) => (
              <View
                key={job.job_id}
                className="mb-2 rounded-2xl border border-line bg-surface p-3"
              >
                <Text className="text-base font-medium text-ink" numberOfLines={1}>
                  {job.title}
                </Text>
                <Text className="mt-0.5 text-xs text-muted" numberOfLines={2}>
                  {job.error_kind ? printErrorMessage(job.error_kind) : (job.error ?? "")}
                </Text>
                <View className="mt-2 flex-row gap-2">
                  <Pressable
                    onPress={() => {
                      void resetJobForRetry(job.job_id)
                        .then(() => (shopId ? retryPrintQueue(shopId) : undefined))
                        .then(refreshQueue);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t("printer.queueRetry")}
                    className="flex-1 items-center justify-center rounded-xl bg-primary-tint"
                    style={{ height: 40 }}
                  >
                    <Text className="text-sm font-medium" style={{ color: colors.primary }}>
                      {t("printer.queueRetry")}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onDiscard(job)}
                    accessibilityRole="button"
                    accessibilityLabel={t("printer.queueDiscard")}
                    className="items-center justify-center rounded-xl bg-bg"
                    style={{ height: 40, width: 40 }}
                  >
                    <Ionicons name="close" size={18} color={colors.danger} />
                  </Pressable>
                </View>
              </View>
            ))}

            <Pressable
              onPress={() => void retryAll()}
              disabled={retrying}
              accessibilityRole="button"
              accessibilityLabel={t("printer.queueRetryAll")}
              className="mt-1 flex-row items-center justify-center gap-2 rounded-2xl bg-primary-tint"
              style={{ height: 48, opacity: retrying ? 0.6 : 1 }}
            >
              {retrying ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text className="text-base font-medium" style={{ color: colors.primary }}>
                  {t("printer.queueRetryAll")}
                </Text>
              )}
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
