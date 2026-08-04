import { useSync } from "@/features/offline/use-sync";
import { usePushRegistration } from "@/features/notifications/use-push-registration";
import { SyncToast } from "./sync-toast";

/**
 * App ildizida bir marta mount qilinadi (auth-gate ichida, faqat sessiya
 * bo'lganda) — offline sync orkestratsiyasini ishga tushiradi, push tokenini
 * serverga moslab turadi va sync toast'ini ko'rsatadi.
 */
export function SyncManager() {
  useSync();
  usePushRegistration();
  return <SyncToast />;
}
