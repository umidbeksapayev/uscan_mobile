import { View, Text } from "react-native";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { text } from "@/theme/tokens";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { SectionLabel } from "@/components/ui/section-label";
import type { Shop } from "@/types/database";
import { DailySummaryCard } from "./daily-summary-card";
import { LocalReminderCard } from "./local-reminder-card";

/**
 * Bildirishnomalar oynasi — Sozlamalardagi bitta qatordan ochiladi.
 *
 * Ilgari bu ikkala blok Sozlamalar ekranining TANASIDA turardi va ekranning
 * yarmini egallardi, holbuki foydalanuvchi ularni yiliga bir marta ochadi.
 * Endi Sozlamalar — sof qatorlar ro'yxati, tafsilot esa shu oynada.
 *
 * `bare` propi bilan kartalar o'z ramkasini chizmaydi: sheet ichida ramka
 * "karta ichida karta" bo'lib ko'rinardi.
 *
 * ⚠️ Server xulosasi faqat do'kon EGASIGA yuboriladi (`get_push_summaries`
 * `sh.owner_id` tokenlariga yozadi), shuning uchun kassir faqat telefondagi
 * lokal eslatmani ko'radi.
 */
export function NotificationsSheet({
  visible,
  onClose,
  shop,
  isOwner,
}: {
  visible: boolean;
  onClose: () => void;
  shop?: Shop;
  isOwner: boolean;
}) {
  const colors = useColors();
  const { t } = useTranslation();

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={{ fontSize: text.lg, fontWeight: "700", color: colors.ink, marginBottom: 20 }}>
        {t("settings.sectionNotifications")}
      </Text>

      {isOwner && shop ? (
        <View style={{ marginBottom: 24 }}>
          <SectionLabel label={t("notif.sheetServer")} />
          <DailySummaryCard shop={shop} bare />
        </View>
      ) : null}

      <View>
        <SectionLabel label={t("notif.sheetLocal")} />
        <LocalReminderCard bare />
      </View>
    </BottomSheet>
  );
}
