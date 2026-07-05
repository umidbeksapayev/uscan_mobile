import { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors } from "@/theme/colors";
import { formatCurrency, formatDateTime, formatDateTimeFull, formatNumber } from "@/lib/format";
import { useOnline } from "@/lib/use-online";
import { useAuth } from "@/features/auth/auth-context";
import { useActiveShopId, useActivePermissions } from "@/features/auth/use-memberships";
import { useStaff } from "@/features/auth/use-staff";
import { useExpectedCash, useCloseShift, useCashClosures } from "@/features/shift/use-shift";
import { parseAmount, closureDifference, diffStatus } from "@/features/shift/shift-math";
import type { CashClosure } from "@/features/shift/shift-math";

/** Farq holati → rang/fon/label (match=yashil, surplus=sariq, shortage=qizil). */
const DIFF_UI = {
  match: { color: "#0F6E56", bg: "#E7F6EE", label: "Mos tushdi" },
  surplus: { color: "#B45309", bg: "#FEF6E7", label: "Ortiqcha" },
  shortage: { color: "#B42318", bg: "#FDECEC", label: "Kamomad" },
} as const;

export default function ShiftCloseScreen() {
  const router = useRouter();
  const online = useOnline();
  const { session } = useAuth();
  const shopId = useActiveShopId();
  const { isOwner } = useActivePermissions();

  const expected = useExpectedCash();
  const closeShift = useCloseShift();
  const closures = useCashClosures();
  // Kassir emaillari faqat egaga (RPC ham owner-gated)
  const { data: staff } = useStaff(isOwner ? shopId : undefined);

  const [countedText, setCountedText] = useState("");
  const [note, setNote] = useState("");

  const exp = expected.data;
  const counted = parseAmount(countedText);
  const hasInput = countedText.trim().length > 0;
  const diff = exp ? closureDifference(counted, exp.expectedCash) : 0;
  const dui = DIFF_UI[diffStatus(diff)];

  const emailByUser = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of staff ?? []) m.set(s.user_id, s.email);
    return m;
  }, [staff]);

  // Kassir faqat o'zi yopganlarini ko'radi; egasi hammasini
  const visibleClosures = useMemo(() => {
    const list = closures.data ?? [];
    if (isOwner) return list;
    return list.filter((c) => c.cashier_id === session?.user.id);
  }, [closures.data, isOwner, session?.user.id]);

  const canClose = online && !!exp && hasInput && !closeShift.isPending;

  function onClosePress() {
    if (!exp) return;
    Alert.alert(
      "Kassani yopish",
      `Kutilgan: ${formatCurrency(exp.expectedCash)}\nSanalgan: ${formatCurrency(counted)}\n${
        diff === 0 ? "Farq yo'q." : `${dui.label}: ${formatCurrency(Math.abs(diff))}.`
      }\n\nYopilsinmi?`,
      [
        { text: "Bekor qilish", style: "cancel" },
        {
          text: "Yopish",
          style: diff < 0 ? "destructive" : "default",
          onPress: () =>
            closeShift.mutate(
              { countedCash: counted, note: note.trim() || null },
              {
                onSuccess: () => {
                  setCountedText("");
                  setNote("");
                },
              },
            ),
        },
      ],
    );
  }

  const result = closeShift.data;

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <View className="flex-row items-center gap-2 px-3 py-2">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityLabel="Orqaga"
          className="h-10 w-10 items-center justify-center"
        >
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <Text className="text-xl font-semibold text-ink">Kassani yopish</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {!online ? (
          <View
            className="mb-3 flex-row items-center gap-2 rounded-2xl border p-3"
            style={{ borderColor: colors.warning, backgroundColor: "#FEF6E7" }}
          >
            <Ionicons name="cloud-offline-outline" size={18} color={colors.warning} />
            <Text className="flex-1 text-sm text-ink">
              Kassa yopish uchun internet kerak (hisob serverda yuritiladi).
            </Text>
          </View>
        ) : null}

        {result ? (
          /* Yopilgandan keyingi xulosa kartasi */
          <View className="mb-3 items-center rounded-2xl border border-line bg-surface p-5">
            <View
              className="mb-3 h-14 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: "#E7F6EE" }}
            >
              <Ionicons name="checkmark" size={30} color={colors.success} />
            </View>
            <Text className="text-lg font-medium text-ink">Kassa yopildi</Text>
            <ResultRow label="Kutilgan" value={formatCurrency(result.expected_cash)} />
            <ResultRow label="Sanalgan" value={formatCurrency(result.counted_cash)} />
            <ResultRow
              label="Farq"
              value={
                result.difference === 0
                  ? "0 so'm"
                  : `${result.difference > 0 ? "+" : "−"}${formatCurrency(Math.abs(result.difference))}`
              }
              color={DIFF_UI[diffStatus(result.difference)].color}
            />
          </View>
        ) : null}

        {/* Kutilgan naqd (server hisobi) */}
        <View className="mb-3 rounded-2xl border border-line bg-surface p-4">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-sm font-medium text-ink">Kutilgan naqd</Text>
            {exp ? (
              <Text className="text-xs text-muted">{formatDateTime(exp.from)} dan beri</Text>
            ) : null}
          </View>

          {expected.isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ paddingVertical: 16 }} />
          ) : expected.isError ? (
            <Text className="py-2 text-sm text-danger">
              {(expected.error as Error)?.message ?? "Xatolik yuz berdi"}
            </Text>
          ) : exp ? (
            <>
              <BreakdownRow label="Naqd sotuvlar" value={exp.cashSales} />
              <BreakdownRow label="Nasiya to'lovlari" value={exp.debtPayments} />
              <BreakdownRow label="Qaytarishlar" value={-exp.refunds} negative />
              <View className="my-2 border-t border-line" />
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-medium text-ink">Jami kutilgan</Text>
                <Text className="text-lg font-semibold" style={{ color: colors.primary }}>
                  {formatCurrency(exp.expectedCash)}
                </Text>
              </View>
            </>
          ) : null}
        </View>

        {/* Sanalgan naqd + farq + izoh */}
        <View className="mb-3 rounded-2xl border border-line bg-surface p-4">
          <Text className="mb-1 text-sm font-medium text-ink">Sanalgan naqd</Text>
          <TextInput
            value={countedText}
            onChangeText={setCountedText}
            keyboardType="number-pad"
            placeholder={exp ? formatNumber(exp.expectedCash) : "0"}
            placeholderTextColor={colors.tabInactive}
            accessibilityLabel="Sanalgan naqd summa"
            className="rounded-2xl border border-line bg-bg px-4 text-xl font-medium text-ink"
            style={{ height: 56 }}
          />
          {exp ? (
            <Pressable
              onPress={() => setCountedText(String(exp.expectedCash))}
              className="mt-2 items-center justify-center self-start rounded-xl bg-bg px-4"
              style={{ height: 40 }}
            >
              <Text className="text-sm font-medium text-ink">Aniq (kutilganday)</Text>
            </Pressable>
          ) : null}

          {hasInput && exp ? (
            <View
              className="mt-3 flex-row items-center justify-between rounded-2xl px-4 py-3"
              style={{ backgroundColor: dui.bg }}
            >
              <Text className="text-sm" style={{ color: dui.color }}>
                {dui.label}
              </Text>
              <Text className="text-base font-medium" style={{ color: dui.color }}>
                {diff === 0 ? "0 so'm" : formatCurrency(Math.abs(diff))}
              </Text>
            </View>
          ) : null}

          <Text className="mb-1 mt-3 text-sm font-medium text-ink">Izoh (ixtiyoriy)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={diff < 0 ? "Kamomad sababi..." : "Izoh..."}
            placeholderTextColor={colors.tabInactive}
            accessibilityLabel="Yopilish izohi"
            className="rounded-2xl border border-line bg-bg px-4 text-base text-ink"
            style={{ height: 48 }}
          />

          {closeShift.isError ? (
            <Text className="mt-3 text-center text-sm text-danger">
              {(closeShift.error as Error)?.message ?? "Xatolik yuz berdi"}
            </Text>
          ) : null}

          <Pressable
            disabled={!canClose}
            onPress={onClosePress}
            accessibilityLabel="Kassani yopish"
            className="mt-4 flex-row items-center justify-center rounded-2xl bg-primary"
            style={{ height: 54, opacity: canClose ? 1 : 0.5 }}
          >
            {closeShift.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-medium text-white">Kassani yopish</Text>
            )}
          </Pressable>
        </View>

        {/* Oxirgi yopilishlar */}
        <Text className="mb-2 mt-1 text-sm font-medium text-muted">OXIRGI YOPILISHLAR</Text>
        {closures.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ paddingVertical: 12 }} />
        ) : visibleClosures.length === 0 ? (
          <Text className="py-3 text-center text-sm text-muted">Hali yopilish yo'q.</Text>
        ) : (
          visibleClosures.map((c) => (
            <ClosureCard
              key={c.id}
              closure={c}
              cashierEmail={isOwner && c.cashier_id ? emailByUser.get(c.cashier_id) : undefined}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ResultRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View className="mt-2 w-full flex-row items-center justify-between">
      <Text className="text-sm text-muted">{label}</Text>
      <Text className="text-base font-medium" style={{ color: color ?? colors.ink }}>
        {value}
      </Text>
    </View>
  );
}

function BreakdownRow({ label, value, negative }: { label: string; value: number; negative?: boolean }) {
  return (
    <View className="flex-row items-center justify-between py-1">
      <Text className="text-sm text-muted">{label}</Text>
      <Text className="text-sm font-medium" style={{ color: negative ? colors.danger : colors.ink }}>
        {negative && value !== 0 ? "−" : ""}
        {formatCurrency(Math.abs(value))}
      </Text>
    </View>
  );
}

function ClosureCard({ closure, cashierEmail }: { closure: CashClosure; cashierEmail?: string }) {
  const ui = DIFF_UI[diffStatus(closure.difference)];
  return (
    <View className="mb-2.5 rounded-2xl border border-line bg-surface p-3.5">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-medium text-ink">
          {formatDateTimeFull(closure.created_at)}
        </Text>
        <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: ui.bg }}>
          <Text className="text-xs font-medium" style={{ color: ui.color }}>
            {closure.difference === 0
              ? "Mos"
              : `${closure.difference > 0 ? "+" : "−"}${formatNumber(Math.abs(closure.difference))}`}
          </Text>
        </View>
      </View>
      <View className="mt-1.5 flex-row items-center justify-between">
        <Text className="text-xs text-muted">
          Kutilgan {formatNumber(closure.expected_cash)} · Sanalgan {formatNumber(closure.counted_cash)}
        </Text>
      </View>
      {cashierEmail ? <Text className="mt-0.5 text-xs text-muted">{cashierEmail}</Text> : null}
      {closure.note ? (
        <Text className="mt-0.5 text-xs text-muted" numberOfLines={2}>
          {closure.note}
        </Text>
      ) : null}
    </View>
  );
}
