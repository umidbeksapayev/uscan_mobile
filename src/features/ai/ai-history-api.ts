import { supabase } from "@/lib/supabase";
import type { AiMessage } from "./use-ai-chat";
import type { Proposal } from "./ai-api";

export interface AiChatSummary {
  id: string;
  title: string | null;
  updated_at: string;
}

/** Suhbatlar ro'yxati — eng so'nggi yangilangani birinchi (RLS: faqat o'ziniki). */
export async function listAiChats(shopId: string): Promise<AiChatSummary[]> {
  const { data, error } = await supabase
    .from("ai_chats")
    .select("id, title, updated_at")
    .eq("shop_id", shopId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as AiChatSummary[];
}

/** CASCADE orqali `ai_messages` va `ai_actions` ham o'chadi (migration 034/036). */
export async function deleteAiChat(chatId: string): Promise<void> {
  const { error } = await supabase.from("ai_chats").delete().eq("id", chatId);
  if (error) throw new Error(error.message);
}

interface MessageRow {
  id: string;
  role: "user" | "model" | "tool";
  content: string | null;
  tool_calls: string[] | null;
  rating: 1 | -1 | null;
  created_at: string;
}

interface ActionRow {
  id: string;
  action: "update_price" | "update_stock";
  product_id: string;
  product_name: string;
  old_value: number;
  new_value: number;
}

/**
 * Eski suhbatni qayta ochish uchun xabarlarni tiklaydi.
 *
 * ⚠️ Cheklov: bosiladigan mahsulot kartalari (`cards`) DB'da saqlanmaydi —
 * ular faqat joriy javob oqimida hisoblanadi (`chat-run.ts`). Eski suhbatda
 * ular qayta chiqmaydi, faqat matn va tool chiplari tiklanadi.
 *
 * Hali TASDIQLANMAGAN takliflar (`ai_actions.status = 'proposed'`) yo'qolib
 * qolmasligi uchun ro'yxat oxiriga sintetik model xabari sifatida qo'shiladi
 * (`text: ""`, faqat `proposal`) — `MessageBubble` buni tabiiy qo'llab-quvvatlaydi.
 */
export async function loadChatDetail(chatId: string): Promise<AiMessage[]> {
  const [messagesRes, actionsRes] = await Promise.all([
    supabase
      .from("ai_messages")
      .select("id, role, content, tool_calls, rating, created_at")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true }),
    supabase
      .from("ai_actions")
      .select("id, action, product_id, product_name, old_value, new_value")
      .eq("chat_id", chatId)
      .eq("status", "proposed"),
  ]);
  if (messagesRes.error) throw new Error(messagesRes.error.message);
  if (actionsRes.error) throw new Error(actionsRes.error.message);

  const rows = (messagesRes.data ?? []) as MessageRow[];
  const messages: AiMessage[] = rows
    .filter((r) => r.role === "user" || r.role === "model")
    .map((r) => ({
      id: r.id,
      role: r.role as "user" | "model",
      text: r.content ?? "",
      tools: r.tool_calls ?? undefined,
      serverId: r.role === "model" ? r.id : undefined,
      rating: r.rating ?? undefined,
    }));

  const pending = (actionsRes.data ?? []) as ActionRow[];
  for (const a of pending) {
    const proposal: Proposal = {
      action_id: a.id,
      action: a.action,
      product_id: a.product_id,
      product_name: a.product_name,
      old_value: Number(a.old_value),
      new_value: Number(a.new_value),
    };
    messages.push({
      id: `proposal-${a.id}`,
      role: "model",
      text: "",
      proposal,
      proposalStatus: "pending",
    });
  }

  return messages;
}
