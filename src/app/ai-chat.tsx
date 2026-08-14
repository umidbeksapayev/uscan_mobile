import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, FlatList, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { radius, space, text } from "@/theme/tokens";
import { useOnline } from "@/lib/use-online";
import { useKeyboardHeight } from "@/lib/use-keyboard-height";
import { meta, MetaKeys } from "@/lib/offline/mmkv";
import { useActiveShopId, useActivePermissions } from "@/features/auth/use-memberships";
import { ScreenHeader } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { PressableScale } from "@/components/ui/pressable-scale";
import { EmptyState } from "@/components/ui/empty-state";
import { MessageBubble } from "@/features/ai/message-bubble";
import { useAiChat, type AiMessage } from "@/features/ai/use-ai-chat";

/** Bo'sh ekrandagi taklif chiplari — foydalanuvchi nima so'rashni bilmaydi. */
const SUGGESTIONS = ["ai.s1", "ai.s2", "ai.s5", "ai.s3", "ai.s4"] as const;

const MAX_LEN = 1000;

/**
 * Rozilik ekrani — do'kon ma'lumoti Google Gemini'ga yuborilishi haqida.
 * Bir marta ko'rsatiladi, javob MMKV'da saqlanadi.
 */
function ConsentGate({ onAccept }: { onAccept: () => void }) {
  const colors = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.lg + insets.bottom }}>
      <Card tone="brand">
        <View className="items-center">
          <View
            className="mb-3 h-14 w-14 items-center justify-center"
            style={{ borderRadius: radius.full, backgroundColor: colors.primary }}
          >
            <Ionicons name="sparkles-outline" size={text.xl2} color="#fff" />
          </View>
          <Text
            className="mb-2 text-center font-semibold"
            style={{ fontSize: text.lg, color: colors.heading }}
          >
            {t("ai.consentTitle")}
          </Text>
          <Text
            className="text-center"
            style={{ fontSize: text.sm, lineHeight: 20, color: colors.ink }}
          >
            {t("ai.consentBody")}
          </Text>
        </View>
      </Card>

      <View className="mt-3 gap-2">
        {["ai.consentPoint1", "ai.consentPoint2", "ai.consentPoint3"].map((key) => (
          <View key={key} className="flex-row items-start gap-2">
            <Ionicons name="checkmark-circle" size={text.base} color={colors.success} />
            <Text className="flex-1" style={{ fontSize: text.sm, color: colors.muted }}>
              {t(key)}
            </Text>
          </View>
        ))}
      </View>

      <PressableScale
        onPress={onAccept}
        accessibilityRole="button"
        accessibilityLabel={t("ai.consentAccept")}
        style={{
          marginTop: space.xl,
          alignItems: "center",
          paddingVertical: space.md,
          borderRadius: radius.lg,
          backgroundColor: colors.primary,
        }}
      >
        <Text style={{ fontSize: text.base, fontWeight: "600", color: "#fff" }}>
          {t("ai.consentAccept")}
        </Text>
      </PressableScale>
    </ScrollView>
  );
}

/** "AI yozyapti" ko'rsatkichi — kutish vaqtini tirik his qildiradi. */
function TypingRow() {
  const colors = useColors();
  const { t } = useTranslation();

  return (
    <View
      className="mb-2 flex-row items-center gap-2 self-start px-3 py-2"
      style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface }}
    >
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={{ fontSize: text.sm, color: colors.muted }}>{t("ai.thinking")}</Text>
    </View>
  );
}

export default function AiChatScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const online = useOnline();
  const shopId = useActiveShopId();
  const { isOwner } = useActivePermissions();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  const { chatId: openChatId } = useLocalSearchParams<{ chatId?: string }>();

  // Klaviatura ochiq — panel uning ustida; yopiq — navigatsiya paneli ustida.
  const bottomInset = keyboard > 0 ? keyboard : insets.bottom;

  const [consent, setConsent] = useState(() => meta.getBool(MetaKeys.aiConsent));
  const [draft, setDraft] = useState("");
  const { messages, pending, historyLoading, send, retry, reset, rate, resolveProposal, loadChat } =
    useAiChat(shopId);

  // Tarix ro'yxatidan ochilgan bo'lsa — o'sha suhbatni yuklaydi.
  useEffect(() => {
    if (openChatId) void loadChat(openChatId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openChatId]);

  const acceptConsent = useCallback(() => {
    meta.setBool(MetaKeys.aiConsent, true);
    setConsent(true);
  }, []);

  const onSend = useCallback(() => {
    const value = draft;
    setDraft("");
    void send(value);
  }, [draft, send]);

  const onSuggestion = useCallback(
    (key: string) => {
      void send(t(key));
    },
    [send, t],
  );

  // `inverted` ro'yxat oxirgi xabarni pastda ko'rsatadi va yangi xabar
  // kelganda avtomatik pastga suradi — qo'lda scroll boshqarish shart emas.
  const data = useMemo(() => [...messages].reverse(), [messages]);

  const renderItem = useCallback(
    ({ item }: { item: AiMessage }) => (
      <MessageBubble
        message={item}
        onRetry={retry}
        onRate={rate}
        onResolveProposal={(id, accept) => void resolveProposal(id, accept)}
      />
    ),
    [retry, rate, resolveProposal],
  );

  const canSend = draft.trim().length > 0 && !pending && online && Boolean(shopId);

  // "O'ylayapti…" faqat birinchi bo'lakgacha — matn oqa boshlagach ortiqcha.
  const last = messages[messages.length - 1];
  const showTyping = pending && !(last?.role === "model" && last.text.length > 0);

  if (!isOwner) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
        <ScreenHeader title={t("ai.title")} />
        <EmptyState icon="lock-closed-outline" text={t("ai.ownerOnly")} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <ScreenHeader
        title={t("ai.title")}
        right={
          <View className="flex-row items-center">
            <PressableScale
              onPress={() => router.push("/ai-chat-history")}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t("ai.openHistory")}
              style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="time-outline" size={text.xl} color={colors.primary} />
            </PressableScale>
            {messages.length > 0 ? (
              <PressableScale
                onPress={reset}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t("ai.newChat")}
                style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="create-outline" size={text.xl} color={colors.primary} />
              </PressableScale>
            ) : null}
          </View>
        }
      />

      {consent && historyLoading && messages.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : consent ? (
        <View className="flex-1" style={{ paddingBottom: bottomInset }}>
          <FlatList
            inverted
            data={data}
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: space.lg, gap: space.sm }}
            ListHeaderComponent={
              // `inverted` — header pastda, ya'ni oxirgi xabardan keyin chiqadi.
              showTyping ? <TypingRow /> : null
            }
          />

          {messages.length === 0 ? (
            <View className="px-4 pb-2">
              <Text className="mb-2" style={{ fontSize: text.xs, color: colors.muted }}>
                {t("ai.suggestionsTitle")}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {SUGGESTIONS.map((key) => (
                  <PressableScale
                    key={key}
                    onPress={() => onSuggestion(key)}
                    accessibilityRole="button"
                    accessibilityLabel={t(key)}
                    style={{
                      paddingHorizontal: space.md,
                      paddingVertical: space.sm,
                      borderRadius: radius.full,
                      borderWidth: 1,
                      borderColor: colors.line,
                      backgroundColor: colors.surface,
                    }}
                  >
                    <Text style={{ fontSize: text.sm, color: colors.ink }}>{t(key)}</Text>
                  </PressableScale>
                ))}
              </View>
            </View>
          ) : null}

          {online ? null : (
            <View
              className="mx-4 mb-2 flex-row items-center gap-2 px-3 py-2"
              style={{ borderRadius: radius.md, backgroundColor: colors.warningTint }}
            >
              <Ionicons name="cloud-offline-outline" size={text.base} color={colors.warningInk} />
              <Text style={{ fontSize: text.xs, color: colors.warningInk }}>{t("ai.offline")}</Text>
            </View>
          )}

          {/* Yozish paneli */}
          <View
            className="flex-row items-end gap-2 px-3 py-2"
            style={{ borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface }}
          >
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={t("ai.placeholder")}
              placeholderTextColor={colors.tabInactive}
              multiline
              maxLength={MAX_LEN}
              editable={!pending}
              accessibilityLabel={t("ai.placeholder")}
              className="flex-1 px-3 py-2"
              style={{
                maxHeight: 120,
                fontSize: text.base,
                color: colors.ink,
                borderRadius: radius.lg,
                backgroundColor: colors.bg,
              }}
            />
            <PressableScale
              onPress={onSend}
              disabled={!canSend}
              accessibilityRole="button"
              accessibilityLabel={t("ai.send")}
              style={{
                width: 44,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: radius.full,
                backgroundColor: canSend ? colors.primary : colors.neutralTint,
              }}
            >
              <Ionicons
                name="arrow-up"
                size={text.xl}
                color={canSend ? "#fff" : colors.tabInactive}
              />
            </PressableScale>
          </View>

          <Text
            className="px-4 pb-1 text-center"
            style={{ fontSize: text.micro, color: colors.muted }}
          >
            {t("ai.disclaimer")}
          </Text>
        </View>
      ) : (
        <ConsentGate onAccept={acceptConsent} />
      )}
    </SafeAreaView>
  );
}
