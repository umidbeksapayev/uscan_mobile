/**
 * `printer-settings.ts` `@/lib/offline/mmkv` (react-native-mmkv) import
 * qiladi — loyihada bu modul uchun jest mock yo'q, shuning uchun shu yerda
 * xotiradagi soxta `storage` beriladi (faqat `getString`/`set` — modul
 * shu ikkitasidan boshqasini ishlatmaydi).
 */
let mockMemStorage: Map<string, string>;

jest.mock("@/lib/offline/mmkv", () => {
  mockMemStorage = new Map<string, string>();
  return {
    storage: {
      getString: (k: string) => mockMemStorage.get(k),
      set: (k: string, v: string) => {
        mockMemStorage.set(k, v);
      },
    },
  };
});

import { usePrinterStore, getPrinterConfig } from "../printer-settings";

beforeEach(() => {
  mockMemStorage.clear();
  usePrinterStore.setState({
    type: "system",
    btAddress: null,
    btName: null,
    codepage: "cp866",
    paperWidth: 58,
  });
});

describe("printer-settings — legacy moslik", () => {
  it("paperWidth'siz eski JSON → effektiv qiymat 58, storage QAYTA YOZILMAYDI", () => {
    const legacy = { type: "bluetooth", btAddress: "AA:BB", btName: "POS-58", codepage: "cp1251" };
    mockMemStorage.set("printerConfig", JSON.stringify(legacy));

    const cfg = getPrinterConfig();

    expect(cfg.paperWidth).toBe(58);
    expect(cfg.btAddress).toBe("AA:BB"); // boshqa maydonlar saqlangan
    expect(cfg.codepage).toBe("cp1251");
    expect(mockMemStorage.get("printerConfig")).toBe(JSON.stringify(legacy)); // o'zgarmagan
  });
});

describe("printer-settings — setPaperWidth", () => {
  it("boshqa maydonlarni buzmasdan paperWidth'ni yangilaydi", () => {
    usePrinterStore.setState({ ...usePrinterStore.getState(), codepage: "cp1251", btAddress: "AA:BB", btName: "X", type: "bluetooth" });
    usePrinterStore.getState().setPaperWidth(80);

    expect(usePrinterStore.getState().paperWidth).toBe(80);
    expect(usePrinterStore.getState().codepage).toBe("cp1251");
    expect(usePrinterStore.getState().btAddress).toBe("AA:BB");
  });

  it("setSystem/setBluetooth chaqirilganda paperWidth saqlanib qoladi", () => {
    usePrinterStore.getState().setPaperWidth(80);
    usePrinterStore.getState().setSystem();
    expect(usePrinterStore.getState().paperWidth).toBe(80);

    usePrinterStore.getState().setBluetooth("AA:BB", "POS-80");
    expect(usePrinterStore.getState().paperWidth).toBe(80);
  });
});
