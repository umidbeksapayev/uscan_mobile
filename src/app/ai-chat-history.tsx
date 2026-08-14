import { useCallback } from "react";
import { View, FlatList, Alert, ActivityIndicator, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { toast } from "@/lib/toast";
import { useColors } from "@/theme/theme-store";
import { formatDateTimeFull } from "@/lib/format";
import { useActiveShopId } from "@/features/auth/use-memberships";
import { ScreenHeader } from "@/components/ui/screen";
import { ListItemCard } from "@/components/ui/list-item-card";
import { EmptyState } from "@/components/ui/empty-state";
import { useAiChats, useDeleteAiChat } from "@/features/ai/use-ai-chat-history";
import type { AiChatSummary } from "@/features/ai/ai-history-api";

/** AI chatlar ro'yxati — eski suhbatni davom ettirish yoki o'chirish uchun. */
export default function AiChatHistoryScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t } = useTranslation();
  const shopId = useActiveShopId();

  const { data: chats, isLoading, isError } = useAiChats(shopId);
  const deleteMut = useDeleteAiChat();

  const onOpen = useCallback(
    (id: string) => router.push({ pathname: "/ai-chat", params: { chatId: id } }),
    [router],
  );

  const onDelete = useCallback(
    (chat: AiChatSummary) => {
      Alert.alert(
        t("ai.deleteChatTitle"),
        t("ai.deleteChatMsg", { title: chat.title || t("ai.untitledChat") }),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.delete"),
            style: "destructive",
            onPress: () =>
              deleteMut.mutate(chat.id, {
                onError: (e) => toast.error(t("common.error"), (e as Error)?.message ?? t("common.unknownError")),
              }),
          },
        ],
      );
    },
    [t, deleteMut],
  );

  const renderItem = useCallback(
    ({ item }: { item: AiChatSummary }) => (
      <ListItemCard
        leading={
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary-tint">
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
          </View>
        }
        title={item.title || t("ai.untitledChat")}
        subtitle={formatDateTimeFull(item.updated_at)}
        onPress={() => onOpen(item.id)}
        trailing={
          <Pressable
            onPress={() => onDelete(item)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`${t("common.delete")}: ${item.title || t("ai.untitledChat")}`}
            className="h-9 w-9 items-center justify-center"
          >
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </Pressable>
        }
      />
    ),
    [t, colors.primary, colors.danger, onOpen, onDelete],
  );

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <ScreenHeader title={t("ai.historyTitle")} />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : isError ? (
        <EmptyState icon="cloud-offline-outline" text={t("common.loadError")} />
      ) : (chats ?? []).length === 0 ? (
        <EmptyState icon="chatbubbles-outline" text={t("ai.historyEmpty")} />
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          renderItem={renderItem}
        />
      )}
    </SafeAreaView>
  );
}
