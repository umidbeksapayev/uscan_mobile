import { useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { colors } from "@/theme/colors";
import { formatCurrency } from "@/lib/format";
import { useActiveShopId } from "@/features/auth/use-memberships";
import {
  useCustomer,
  useCustomerSales,
  useCustomerPayments,
} from "@/features/customers/use-customers";
import { customerBalance } from "@/features/customers/debt-math";
import { ReceivePaymentSheet } from "@/features/customers/receive-payment-sheet";
import type { CustomerPayment } from "@/types/database";
import type { CustomerSaleRow } from "@/features/customers/customers-api";

/** "2026-06-07T09:18:33Z" → "07.06 14:18" (Asia/Tashkent). */
function fmt(iso: string): string {
  const t = new Date(new Date(iso).getTime() + 5 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(t.getUTCDate())}.${p(t.getUTCMonth() + 1)} ${p(t.getUTCHours())}:${p(t.getUTCMinutes())}`;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="rounded-2xl bg-surface p-4" style={{ borderWidth: 0.5, borderColor: colors.line }}>
      <Text className="mb-2 text-sm font-semibold text-ink">{title}</Text>
      {children}
    </View>
  );
}

function SaleRow({ s }: { s: CustomerSaleRow }) {
  const debt = Math.max(0, s.total_revenue - s.paid_amount);
  return (
    <View className="flex-row items-center justify-between py-2" style={{ borderTopWidth: 0.5, borderTopColor: colors.line }}>
      <View>
        <Text className="text-sm text-ink">{s.item_count} mahsulot</Text>
        <Text className="text-xs text-muted">{fmt(s.sold_at)}</Text>
      </View>
      <View className="items-end">
        <Text className="text-sm font-medium text-ink">{formatCurrency(s.total_revenue)}</Text>
        {debt > 0 ? (
          <Text className="text-xs" style={{ color: "#B42318" }}>qarz: {formatCurrency(debt)}</Text>
        ) : (
          <Text className="text-xs text-success">to'langan</Text>
        )}
      </View>
    </View>
  );
}

function PaymentRow({ p }: { p: CustomerPayment }) {
  return (
    <View className="flex-row items-center justify-between py-2" style={{ borderTopWidth: 0.5, borderTopColor: colors.line }}>
      <View className="flex-row items-center gap-2">
        <Ionicons name="arrow-down-circle" size={18} color={colors.success} />
        <Text className="text-xs text-muted">{fmt(p.paid_at)}</Text>
      </View>
      <Text className="text-sm font-medium text-success">+ {formatCurrency(p.amount)}</Text>
    </View>
  );
}

export default function CustomerDetailScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const shopId = useActiveShopId();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: customer } = useCustomer(id);
  const { data: sales, isLoading: salesLoading } = useCustomerSales(id);
  const { data: payments, isLoading: payLoading } = useCustomerPayments(id);
  const [payOpen, setPayOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const balance = customerBalance(sales ?? [], payments ?? []);
  const owes = balance > 0;
  const loading = salesLoading || payLoading;

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["customer-sales", id] }),
      qc.invalidateQueries({ queryKey: ["customer-payments", id] }),
    ]);
    setRefreshing(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <View className="flex-row items-center gap-2 px-3 py-2">
        <Pressable onPress={() => router.back()} hitSlop={8} className="h-10 w-10 items-center justify-center">
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <Text className="flex-1 text-xl font-semibold text-ink" numberOfLines={1}>
          {customer?.name ?? "Mijoz"}
        </Text>
        <Pressable
          onPress={() => router.push({ pathname: "/customer-form", params: { id: String(id) } })}
          hitSlop={8}
          className="h-10 w-10 items-center justify-center"
        >
          <Ionicons name="create-outline" size={22} color={colors.muted} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Balans */}
        <View className="rounded-2xl p-4" style={{ backgroundColor: owes ? "#FDECEC" : colors.primaryTint }}>
          <Text className="text-xs" style={{ color: owes ? "#B42318" : colors.primary, letterSpacing: 0.5 }}>
            {owes ? "QARZ" : balance < 0 ? "HAQDOR" : "QARZSIZ"}
          </Text>
          <Text
            className="mt-1 text-3xl font-bold"
            style={{ color: owes ? "#B42318" : colors.primaryDeep }}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatCurrency(Math.abs(balance))}
          </Text>
          {customer?.phone ? <Text className="mt-1 text-sm text-muted">{customer.phone}</Text> : null}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : (
          <>
            <Card title="Sotuvlar tarixi">
              {(sales?.length ?? 0) === 0 ? (
                <Text className="py-2 text-sm text-muted">Sotuv yo'q</Text>
              ) : (
                sales!.map((s) => <SaleRow key={s.id} s={s} />)
              )}
            </Card>

            <Card title="To'lovlar tarixi">
              {(payments?.length ?? 0) === 0 ? (
                <Text className="py-2 text-sm text-muted">To'lov yo'q</Text>
              ) : (
                payments!.map((p) => <PaymentRow key={p.id} p={p} />)
              )}
            </Card>
          </>
        )}
      </ScrollView>

      {/* To'lov qabul qilish */}
      <View className="absolute bottom-0 left-0 right-0 border-t border-line bg-surface px-4 pb-7 pt-3">
        <Pressable
          onPress={() => setPayOpen(true)}
          className="flex-row items-center justify-center rounded-2xl bg-primary"
          style={{ height: 54, gap: 8 }}
        >
          <Ionicons name="cash-outline" size={20} color="#fff" />
          <Text className="text-base font-semibold text-white">To'lov qabul qilish</Text>
        </Pressable>
      </View>

      {shopId && id ? (
        <ReceivePaymentSheet
          visible={payOpen}
          shopId={shopId}
          customerId={String(id)}
          currentBalance={balance}
          onClose={() => setPayOpen(false)}
        />
      ) : null}
    </SafeAreaView>
  );
}
