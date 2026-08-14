import { memo } from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { radius, space, text } from "@/theme/tokens";
import { tabularNums } from "@/theme/typography";
import { formatCurrency, formatNumber } from "@/lib/format";
import { PressableScale } from "@/components/ui/pressable-scale";
import type { ProductCard } from "./ai-api";
import type { AiMessage } from "./use-ai-chat";

/** Tool nomi → ikonka va i18n kaliti (javob ostidagi manba chipi uchun). */
const TOOL_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; key: string }> = {
  search_products: { icon: "search-outline", key: "ai.toolSearch" },
  get_today_sales: { icon: "today-outline", key: "ai.toolToday" },
  get_sales_stats: { icon: "stats-chart-outline", key: "ai.toolStats" },
  get_top_products: { icon: "trophy-outline", key: "ai.toolTop" },
  get_low_stock: { icon: "alert-circle-outline", key: "ai.toolLowStock" },
  get_product_details: { icon: "pricetag-outline", key: "ai.toolProduct" },
  get_sales_trend: { icon: "trending-up-outline", key: "ai.toolTrend" },
  get_slow_products: { icon: "hourglass-outline", key: "ai.toolSlow" },
  get_inventory_summary: { icon: "cube-outline", key: "ai.toolInventory" },
};

/**
 * Javob qaysi ma'lumotdan olinganini ko'rsatadigan chiplar.
 *
 * Bu bezak emas: foydalanuvchi raqam o'ylab topilmaganini, bazadan
 * olinganini ko'radi — AI javobiga ishonch aynan shu yerdan boshlanadi.
 */
const ToolChips = memo(function ToolChips({ tools }: { tools: string[] }) {
  const colors = useColors();
  const { t } = useTranslation();

  // Takrorlanuvchi chaqiruvlar bitta chip bo'lib ko'rinadi.
  const unique = Array.from(new Set(tools)).filter((name) => TOOL_META[name]);
  if (unique.length === 0) return null;

  return (
    <View className="mb-2 flex-row flex-wrap gap-1">
      {unique.map((name) => {
        const meta = TOOL_META[name];
        return (
          <View
            key={name}
            className="flex-row items-center gap-1 px-2 py-0.5"
            style={{ borderRadius: radius.full, backgroundColor: colors.primaryTint }}
          >
            <Ionicons name={meta.icon} size={text.xs} color={colors.primary} />
            <Text style={{ fontSize: text.micro, color: colors.primary }}>{t(meta.key)}</Text>
          </View>
        );
      })}
    </View>
  );
});

/**
 * Tool topgan mahsulotlar — bosiladigan kartalar.
 *
 * Nima uchun: AI "Coca-Cola 7 dona qoldi" desa, foydalanuvchining keyingi
 * harakati — o'sha mahsulotni ochish. Chatdan katalogga qaytib, qidirib
 * topish o'rniga bitta bosish yetadi. Kartalar javob matnidan OLDIN keladi,
 * ya'ni model hali yozayotganda ular allaqachon ekranda.
 */
const ProductCards = memo(function ProductCards({ cards }: { cards: ProductCard[] }) {
  const colors = useColors();
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <View className="mt-2 gap-1">
      {cards.map((card) => (
        <PressableScale
          key={card.id}
          onPress={() => router.push({ pathname: "/product-form", params: { id: card.id } })}
          accessibilityRole="button"
          accessibilityLabel={`${card.name} — ${t("ai.openProduct")}`}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: space.sm,
            paddingVertical: space.sm,
            paddingHorizontal: space.md,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.line,
            backgroundColor: colors.bg,
          }}
        >
          <Ionicons name="cube-outline" size={text.base} color={colors.primary} />
          <View className="flex-1">
            <Text numberOfLines={1} style={{ fontSize: text.sm, color: colors.ink }}>
              {card.name}
            </Text>
            {card.price !== undefined || card.qty !== undefined ? (
              <Text style={{ fontSize: text.xs, color: colors.muted, ...tabularNums }}>
                {[
                  card.price !== undefined ? formatCurrency(card.price) : null,
                  card.qty !== undefined ? `${formatNumber(card.qty)} ${t("ai.qtyUnit")}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={text.base} color={colors.tabInactive} />
        </PressableScale>
      ))}
    </View>
  );
});

function ErrorBubble({ code, onRetry }: { code: string; onRetry: () => void }) {
  const colors = useColors();
  const { t } = useTranslation();

  // Noma'lum kod ham tushunarli xabar oladi (i18n fallback).
  const messageKey = `ai.error.${code}`;
  const message = t(messageKey, { defaultValue: t("ai.error.unknown") });

  return (
    <View
      className="max-w-[85%] self-start p-3"
      style={{
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.dangerBorder,
        backgroundColor: colors.dangerTint,
      }}
    >
      <View className="flex-row items-center gap-2">
        <Ionicons name="warning-outline" size={text.base} color={colors.danger} />
        <Text className="flex-1" style={{ fontSize: text.sm, color: colors.dangerInk }}>
          {message}
        </Text>
      </View>

      {code === "quota_exceeded" || code === "owner_only" ? null : (
        <PressableScale
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={t("ai.retry")}
          style={{
            marginTop: space.sm,
            alignSelf: "flex-start",
            paddingHorizontal: space.md,
            paddingVertical: space.xs,
            borderRadius: radius.full,
            backgroundColor: colors.danger,
          }}
        >
          <Text style={{ fontSize: text.xs, fontWeight: "600", color: "#fff" }}>
            {t("ai.retry")}
          </Text>
        </PressableScale>
      )}
    </View>
  );
}

/**
 * Javob sifatini baholash (👍/👎).
 *
 * Nima uchun: AI javobi to'g'ri yoki noto'g'ri ekanini faqat foydalanuvchi
 * biladi. To'plangan bahо keyinchalik system prompt'ni yaxshilash uchun
 * ishlatiladi (yaxshi javoblar — few-shot misol, yomonlari — qoida).
 */
const RateRow = memo(function RateRow({
  rating,
  onRate,
}: {
  rating?: 1 | -1;
  onRate: (value: 1 | -1) => void;
}) {
  const colors = useColors();
  const { t } = useTranslation();

  const buttons: { value: 1 | -1; on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { value: 1, on: "thumbs-up", off: "thumbs-up-outline", label: t("ai.rateUp") },
    { value: -1, on: "thumbs-down", off: "thumbs-down-outline", label: t("ai.rateDown") },
  ];

  return (
    <View className="mt-2 flex-row justify-end gap-1">
      {buttons.map((b) => {
        const active = rating === b.value;
        return (
          <PressableScale
            key={b.value}
            onPress={() => onRate(b.value)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={b.label}
            accessibilityState={{ selected: active }}
            style={{ padding: space.xs }}
          >
            <Ionicons
              name={active ? b.on : b.off}
              size={text.base}
              color={active ? colors.primary : colors.tabInactive}
            />
          </PressableScale>
        );
      })}
    </View>
  );
});

/**
 * Bitta xabar puffagi.
 *
 * `memo` — chat ro'yxatida har yangi xabar qo'shilganda eskilarni qayta
 * chizmaslik uchun (ro'yxat uzayganda sezilarli).
 */
export const MessageBubble = memo(function MessageBubble({
  message,
  onRetry,
  onRate,
}: {
  message: AiMessage;
  onRetry: () => void;
  onRate: (id: string, value: 1 | -1) => void;
}) {
  const colors = useColors();

  if (message.errorCode) {
    return <ErrorBubble code={message.errorCode} onRetry={onRetry} />;
  }

  // Oqim boshlanmagan bo'sh puffak ko'rinmaydi — o'rnida "O'ylayapti…" turadi.
  if (
    message.role === "model" &&
    !message.text &&
    !message.tools?.length &&
    !message.cards?.length
  ) {
    return null;
  }

  const isUser = message.role === "user";

  return (
    <View
      className={`max-w-[85%] p-3 ${isUser ? "self-end" : "self-start"}`}
      style={{
        borderRadius: radius.lg,
        backgroundColor: isUser ? colors.primary : colors.surface,
        borderWidth: isUser ? 0 : 1,
        borderColor: colors.line,
      }}
    >
      {!isUser && message.tools?.length ? <ToolChips tools={message.tools} /> : null}
      <Text
        selectable
        style={{ fontSize: text.base, lineHeight: 22, color: isUser ? "#fff" : colors.ink }}
      >
        {message.text}
      </Text>

      {!isUser && message.cards?.length ? <ProductCards cards={message.cards} /> : null}

      {/* Baho faqat saqlangan javobda — oqim tugamaguncha `serverId` yo'q. */}
      {!isUser && message.serverId ? (
        <RateRow rating={message.rating} onRate={(value) => onRate(message.id, value)} />
      ) : null}
    </View>
  );
});
