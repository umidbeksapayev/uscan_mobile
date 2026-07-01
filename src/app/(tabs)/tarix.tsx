import { useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/theme/colors";
import { formatCurrency, formatWeight, formatDateTime } from "@/lib/format";
import type { Sale, SaleItem, SearchMethod } from "@/types/database";
import { useMemberships } from "@/features/auth/use-memberships";
import { useSalesHistoryInfinite } from "@/features/history/use-history";
import { ReturnSheet } from "@/features/history/return-sheet";
import { buildSaleReceiptData } from "@/features/history/sale-receipt";
import { printReceipt } from "@/features/print/print-receipt";

const METHOD: Record<
  SearchMethod,
  { label: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  barcode: { label: "Shtrix", icon: "barcode-outline" },
  manual: { label: "Qo'lda", icon: "search-outline" },
  visual: { label: "Qo'lda", icon: "search-outline" },
};

function refundedTotal(sale: Sale): number {
  return (sale.returns ?? []).reduce((sum, r) => sum + r.total_refund, 0);
}

function ItemLine({ it }: { it: SaleItem }) {
  const qtyLabel =
    it.sale_type === "weight" ? formatWeight(it.quantity_sold) : `${it.quantity_sold} dona`;
  return (
    <View className="flex-row items-center gap-3 px-3 py-2">
      {it.product?.image_url ? (
        <Image
          source={{ uri: it.product.image_url }}
          style={{ width: 36, height: 36, borderRadius: 10 }}
          contentFit="cover"
        />
      ) : (
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-primary-tint">
          <Ionicons name="cube-outline" size={16} color={colors.primary} />
        </View>
      )}
      <View className="min-w-0 flex-1">
        <Text className="text-sm text-ink" numberOfLines={1}>
          {it.product?.name ?? "—"}
        </Text>
        <Text className="text-xs text-muted">
          {qtyLabel} × {formatCurrency(it.selling_price_snapshot)}
        </Text>
      </View>
      <Text className="text-sm font-medium text-ink">{formatCurrency(it.total_revenue)}</Text>
    </View>
  );
}

function SaleCard({
  sale,
  open,
  onToggle,
  onReturn,
  shopName,
}: {
  sale: Sale;
  open: boolean;
  onToggle: () => void;
  onReturn?: () => void;
  shopName: string;
}) {
  const meta = METHOD[sale.search_method] ?? METHOD.manual;
  const refunded = refundedTotal(sale);
  const hasReturns = refunded > 0;

  function onReprint() {
    void printReceipt(buildSaleReceiptData(sale, shopName));
  }

  return (
    <View
      className="mb-3 overflow-hidden rounded-2xl bg-surface"
      style={{
        borderWidth: 0.5,
        borderColor: colors.line,
        shadowColor: "#0F172A",
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      <Pressable onPress={onToggle} className="flex-row items-center gap-3 p-3">
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary-tint">
          <Ionicons name="receipt-outline" size={22} color={colors.primary} />
        </View>

        <View className="min-w-0 flex-1">
          <Text className="text-base font-medium text-ink">{sale.item_count} mahsulot</Text>
          <View className="mt-1 flex-row flex-wrap items-center" style={{ gap: 8 }}>
            <Text className="text-xs text-muted">{formatDateTime(sale.sold_at)}</Text>
            <View
              className="flex-row items-center rounded-full px-2 py-0.5"
              style={{ gap: 3, backgroundColor: colors.primaryTint }}
            >
              <Ionicons name={meta.icon} size={11} color={colors.primary} />
              <Text style={{ fontSize: 10, fontWeight: "500", color: colors.primary }}>
                {meta.label}
              </Text>
            </View>
            {hasReturns ? (
              <View
                className="flex-row items-center rounded-full px-2 py-0.5"
                style={{ gap: 3, backgroundColor: "#FDECEC" }}
              >
                <Ionicons name="arrow-undo-outline" size={11} color="#B42318" />
                <Text style={{ fontSize: 10, fontWeight: "500", color: "#B42318" }}>
                  Qaytarilgan
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View className="items-end" style={{ gap: 4 }}>
          <Text className="text-base font-medium text-primary-deep">
            {formatCurrency(sale.total_revenue)}
          </Text>
          <Ionicons
            name={open ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.tabInactive}
          />
        </View>
      </Pressable>

      {open ? (
        <View
          style={{ borderTopWidth: 0.5, borderTopColor: colors.line, backgroundColor: colors.bg }}
        >
          {(sale.items ?? []).map((it) => (
            <ItemLine key={it.id} it={it} />
          ))}

          <View
            className="px-3 py-2.5"
            style={{ borderTopWidth: 0.5, borderTopColor: colors.line, gap: 8 }}
          >
            {hasReturns ? (
              <Text className="text-xs text-muted">
                Qaytarilgan:{" "}
                <Text style={{ fontWeight: "500", color: "#B42318" }}>
                  {formatCurrency(refunded)}
                </Text>
              </Text>
            ) : null}
            <View className="flex-row items-center justify-end" style={{ gap: 8 }}>
              <Pressable
                onPress={onReprint}
                className="flex-row items-center rounded-xl px-3 py-2"
                style={{ gap: 5, borderWidth: 1, borderColor: colors.primary }}
              >
                <Ionicons name="print-outline" size={15} color={colors.primary} />
                <Text className="text-sm font-medium" style={{ color: colors.primary }}>
                  Chek
                </Text>
              </Pressable>
              {onReturn ? (
                <Pressable
                  onPress={onReturn}
                  className="flex-row items-center rounded-xl px-3 py-2"
                  style={{ gap: 5, borderWidth: 1, borderColor: colors.danger }}
                >
                  <Ionicons name="arrow-undo-outline" size={15} color={colors.danger} />
                  <Text className="text-sm font-medium" style={{ color: colors.danger }}>
                    Qaytarish
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function EmptyState({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  return (
    <View className="flex-1 items-center justify-center px-10" style={{ paddingTop: 80 }}>
      <View className="mb-4 h-20 w-20 items-center justify-center rounded-3xl bg-primary-tint">
        <Ionicons name={icon} size={36} color={colors.primary} />
      </View>
      <Text className="text-center text-base text-muted">{text}</Text>
    </View>
  );
}

export default function TarixScreen() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [returnSale, setReturnSale] = useState<Sale | null>(null);

  const { data: memberships, isLoading: membershipsLoading } = useMemberships();
  const active = memberships?.[0];
  const isOwner = active?.role === "owner";
  const shopId = active?.shop.id;
  const shopName = active?.shop.name ?? "Do'kon";

  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSalesHistoryInfinite();

  const list = useMemo(() => data?.pages.flat() ?? [], [data]);
  const total = list.reduce((sum, s) => sum + s.total_revenue, 0);

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <View className="px-4 pt-2">
        <View className="flex-row items-end justify-between pb-3">
          <Text className="text-2xl font-medium text-primary-deep">Tarix</Text>
          {list.length > 0 ? (
            <Text className="text-sm text-muted">
              {list.length}
              {hasNextPage ? "+" : ""} sotuv ·{" "}
              <Text className="font-medium text-ink">{formatCurrency(total)}</Text>
            </Text>
          ) : null}
        </View>
      </View>

      {isLoading || membershipsLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : isError ? (
        <EmptyState
          icon="cloud-offline-outline"
          text="Tarixni yuklab bo'lmadi. Internetni tekshiring."
        />
      ) : list.length === 0 ? (
        <EmptyState icon="receipt-outline" text="Hali sotuvlar yo'q." />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => (
            <SaleCard
              sale={item}
              open={openId === item.id}
              onToggle={() => setOpenId(openId === item.id ? null : item.id)}
              onReturn={isOwner && shopId ? () => setReturnSale(item) : undefined}
              shopName={shopName}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 90 }}
          refreshing={isRefetching}
          onRefresh={() => {
            void refetch();
          }}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
          }}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="py-4">
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
          }
        />
      )}

      {shopId ? (
        <ReturnSheet
          visible={!!returnSale}
          sale={returnSale}
          shopId={shopId}
          onClose={() => setReturnSale(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}
