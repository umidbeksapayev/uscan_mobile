import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { deleteAiChat, listAiChats } from "./ai-history-api";

export function useAiChats(shopId: string | undefined) {
  return useQuery({
    queryKey: ["ai-chats", shopId],
    enabled: !!shopId,
    queryFn: () => listAiChats(shopId!),
  });
}

export function useDeleteAiChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (chatId: string) => deleteAiChat(chatId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-chats"] }),
  });
}
