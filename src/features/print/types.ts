/** Chek printi uchun barcha kerakli ma'lumotlar (cart/sale + shop). cost_price YO'Q. */
export interface ReceiptData {
  // Do'kon
  shopName: string;
  shopPhone?: string;
  shopAddress?: string;
  // Sotuv
  saleId: string;
  soldAt: string; // ISO datetime
  items: ReceiptLine[];
  // Pul (hammasi so'm)
  totalRevenue: number;
  paymentMethod: string; // "Naqd" | "Karta" | "QR" | "Nasiya"
  // Faqat naqd
  givenAmount?: number;
  changeAmount?: number;
  // Nasiya
  debtAmount?: number;
  customerName?: string;
  // Kassir (ixtiyoriy)
  cashierName?: string;
}

export interface ReceiptLine {
  name: string;
  saleType: "unit" | "weight";
  quantity: number; // dona yoki kg
  unitPrice: number; // so'm — selling_price (cost_price EMAS)
  lineTotal: number; // so'm = quantity × unitPrice
}
