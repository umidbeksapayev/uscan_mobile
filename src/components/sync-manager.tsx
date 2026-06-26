import { useSync } from "@/features/offline/use-sync";
import { SyncToast } from "./sync-toast";

/**
 * App ildizida bir marta mount qilinadi (auth-gate ichida) — offline sync
 * orkestratsiyasini ishga tushiradi va sync toast'ini ko'rsatadi.
 */
export function SyncManager() {
  useSync();
  return <SyncToast />;
}
