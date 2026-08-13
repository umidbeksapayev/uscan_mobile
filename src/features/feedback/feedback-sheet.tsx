import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { toast } from "@/lib/toast";
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_MAX_LENGTH,
  remainingChars,
  validateFeedback,
  type FeedbackCategory,
} from "./validate-feedback";
import { useSubmitFeedback } from "./use-feedback";
import { text } from "@/theme/tokens";

/** Kategoriya ikonlari — UI qatlami (validatsiya faylida emas). */
const CATEGORY_ICONS: Record<FeedbackCategory, keyof typeof Ionicons.glyphMap> = {
  suggestion: "bulb-outline",
  complaint: "sad-outline",
  bug: "bug-outline",
};

/** Kategoriya → tarjima kaliti (kalitlar `settings` namespace'ida tayyor). */
const CATEGORY_KEYS: Record<FeedbackCategory, { key: string; fallback: string }> = {
  suggestion: { key: "settings.feedbackSuggestion", fallback: "Taklif" },
  complaint: { key: "settings.feedbackComplaint", fallback: "Shikoyat" },
  bug: { key: "settings.feedbackBug", fallback: "Xato" },
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function FeedbackSheet({ visible, onClose }: Props) {
  const colors = useColors();
  const { t } = useTranslation();
  const submitMut = useSubmitFeedback();

  const [category, setCategory] = useState<FeedbackCategory>("suggestion");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (visible) {
      setCategory("suggestion");
      setMessage("");
      submitMut.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const remaining = remainingChars(message);
  const invalid = validateFeedback({ category, message });
  const canSend = !invalid && !submitMut.isPending;

  async function onSend() {
    if (!canSend) return;
    try {
      await submitMut.mutateAsync({ category, message });
      toast.success(t("settings.feedbackSent", "Rahmat! Fikringiz yuborildi."));
      onClose();
    } catch (e) {
      toast.error(
        t("settings.feedbackError", "Yuborishda xato. Qayta urinib ko'ring."),
        e instanceof Error ? e.message : undefined,
      );
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} keyboardAvoiding contentStyle={{ gap: 10 }}>
      <Text className="text-lg font-medium text-ink">
        {t("settings.feedbackTitle", "Fikr-mulohaza")}
      </Text>
      <Text className="text-xs text-muted" style={{ lineHeight: 17 }}>
        {t("settings.feedbackHint", "Taklif, shikoyat yoki xato? Bizga yozing.")}
      </Text>

      {/* Kategoriya chiplari */}
      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        {FEEDBACK_CATEGORIES.map((c) => {
          const active = category === c;
          const label = t(CATEGORY_KEYS[c].key, CATEGORY_KEYS[c].fallback);
          return (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={label}
              className="flex-row items-center rounded-full px-3 py-2"
              style={{
                gap: 5,
                backgroundColor: active ? colors.primary : colors.bg,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.line,
              }}
            >
              <Ionicons name={CATEGORY_ICONS[c]} size={15} color={active ? "#fff" : colors.muted} />
              <Text style={{ fontSize: text.sm, fontWeight: "500", color: active ? "#fff" : colors.muted }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        value={message}
        onChangeText={setMessage}
        multiline
        textAlignVertical="top"
        maxLength={FEEDBACK_MAX_LENGTH}
        placeholder={t("settings.feedbackPlaceholder", "Fikringizni yozing…")}
        placeholderTextColor={colors.tabInactive}
        accessibilityLabel={t("settings.feedbackTitle", "Fikr-mulohaza")}
        className="rounded-2xl border border-line bg-bg px-4 py-3 text-base text-ink"
        style={{ height: 130 }}
      />

      {/* Belgi hisoblagichi — chegaraga yaqinlashganda ko'rinadi */}
      <Text
        className="text-right text-xs"
        style={{ color: remaining < 100 ? colors.danger : colors.muted }}
      >
        {remaining < 200 ? `${remaining}` : " "}
      </Text>

      <Pressable
        disabled={!canSend}
        onPress={onSend}
        accessibilityRole="button"
        accessibilityLabel={t("settings.feedbackSend", "Yuborish")}
        className="flex-row items-center justify-center rounded-2xl bg-primary"
        style={{ height: 52, opacity: canSend ? 1 : 0.5 }}
      >
        {submitMut.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-base font-semibold text-white">
            {t("settings.feedbackSend", "Yuborish")}
          </Text>
        )}
      </Pressable>
    </BottomSheet>
  );
}
