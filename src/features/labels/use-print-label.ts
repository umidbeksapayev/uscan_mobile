import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { toast } from "@/lib/toast";
import { assignBarcode } from "@/lib/products";
import { useMemberships } from "@/features/auth/use-memberships";
import type { Product } from "@/types/database";

import { printLabels } from "./print-labels";
import type { LabelData } from "./barcode-format";

/**
 * Yorliq chop etish oqimi: barcode'siz mahsulotlarga avtomatik barcode yozadi,
 * keyin yorliqlarni (nusxa soni bilan) sozlangan printerga chiqaradi.
 * `print` chaqirilganda barcha mahsulotlar uchun barcode kafolatlanadi.
 */
export function useLabelPrint() {
  const qc = useQueryClient();
  const { data: memberships } = useMemberships();
  const shopName = memberships?.[0]?.shop?.name;
  const [printing, setPrinting] = useState(false);

  async function print(products: Product[], copies = 1): Promise<boolean> {
    if (products.length === 0 || printing) return false;
    setPrinting(true);
    try {
      const labels: LabelData[] = [];
      let assignedAny = false;
      for (const p of products) {
        let barcode = p.barcode;
        if (!barcode) {
          barcode = await assignBarcode(p.id); // avtomatik kod yoziladi
          assignedAny = true;
        }
        const label: LabelData = { name: p.name, price: p.selling_price, barcode, shopName };
        for (let i = 0; i < copies; i += 1) labels.push(label);
      }

      const ok = await printLabels(labels, { showShopName: !!shopName });
      // Yangi barcode yozilgan bo'lsa katalog (["products"]) va forma (["product", id]) yangilanadi
      if (assignedAny) {
        qc.invalidateQueries({ queryKey: ["products"] });
        qc.invalidateQueries({ queryKey: ["product"] });
      }
      if (ok) toast.success("Yorliq", `${labels.length} yorliq chiqarildi`);
      return ok;
    } catch (e) {
      toast.error("Yorliq", e instanceof Error ? e.message : "Yorliq chiqmadi");
      return false;
    } finally {
      setPrinting(false);
    }
  }

  return { print, printing };
}
