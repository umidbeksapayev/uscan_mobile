import { useSync } from "@/features/offline/use-sync";
import { usePrintQueue } from "@/features/print/use-print-queue";
import { usePushRegistration } from "@/features/notifications/use-push-registration";
import { SyncToast } from "./sync-toast";

/**
 * App ildizida bir marta mount qilinadi (auth-gate ichida, faqat sessiya
 * bo'lganda) — offline sync va chop etish navbati orkestratsiyasini ishga
 * tushiradi, push tokenini serverga moslab turadi, sync toast'ini ko'rsatadi.
 */
export function SyncManager() {
  useSync();
  usePrintQueue();
  usePushRegistration();
  return <SyncToast />;
}
