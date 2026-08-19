import {
  backoffMs,
  classifyPrintError,
  shouldForceReconnect,
  shouldRetryPrint,
  MAX_PRINT_ATTEMPTS,
} from "../printer-state";

describe("classifyPrintError", () => {
  it("foydalanuvchi bekor qilishini xato deb hisoblamaydi", () => {
    expect(classifyPrintError(new Error("Print job was cancelled"))).toBe("cancelled");
    expect(classifyPrintError(new Error("User dismissed the print dialog"))).toBe("cancelled");
    // expo-print iOS'da shu shaklda qaytaradi
    expect(classifyPrintError(new Error("Did not print"))).toBe("cancelled");
  });

  it("Android BluetoothGatt xatolarini aloqa deb tasniflaydi", () => {
    expect(classifyPrintError(new Error("BluetoothGattError: status 133"))).toBe("connection");
    expect(classifyPrintError(new Error("GATT_ERROR"))).toBe("connection");
  });

  it("SPP uzilishini aloqa deb tasniflaydi", () => {
    expect(classifyPrintError(new Error("Device is not connected"))).toBe("connection");
    expect(classifyPrintError(new Error("Broken pipe"))).toBe("connection");
    expect(classifyPrintError(new Error("write failed: EPIPE"))).toBe("connection");
    expect(classifyPrintError(new Error("Connection lost"))).toBe("connection");
    expect(classifyPrintError(new Error("socket closed"))).toBe("connection");
  });

  it("Bluetooth o'chirilgani va qurilma topilmaganini aloqa deb tasniflaydi", () => {
    expect(classifyPrintError(new Error("Bluetooth is disabled"))).toBe("connection");
    expect(classifyPrintError(new Error("Device not found"))).toBe("connection");
    expect(classifyPrintError(new Error("Unable to connect to device"))).toBe("connection");
  });

  it("muhlatni aloqa deb tasniflaydi (tarmoq printeri uchun ham)", () => {
    expect(classifyPrintError(new Error("Connection timed out"))).toBe("connection");
    expect(classifyPrintError(new Error("ETIMEDOUT"))).toBe("connection");
    expect(classifyPrintError(new Error("ECONNREFUSED"))).toBe("connection");
  });

  it("qog'oz/qopqoqni qurilma xatosi deb tasniflaydi", () => {
    expect(classifyPrintError(new Error("Printer is out of paper"))).toBe("device");
    expect(classifyPrintError(new Error("Cover open"))).toBe("device");
    expect(classifyPrintError(new Error("PAPER JAM"))).toBe("device");
  });

  it("noma'lum xatoni unknown qiladi", () => {
    expect(classifyPrintError(new Error("Something weird"))).toBe("unknown");
    expect(classifyPrintError(null)).toBe("unknown");
    expect(classifyPrintError(undefined)).toBe("unknown");
    expect(classifyPrintError({})).toBe("unknown");
  });

  it("Error bo'lmagan shakllarni ham o'qiydi", () => {
    expect(classifyPrintError("Connection lost")).toBe("connection");
    expect(classifyPrintError({ message: "out of paper" })).toBe("device");
  });
});

describe("backoffMs", () => {
  it("eksponensial o'sadi", () => {
    expect(backoffMs(1)).toBe(400);
    expect(backoffMs(2)).toBe(800);
    expect(backoffMs(3)).toBe(1600);
  });

  it("tepada to'xtaydi — kassa oqimi uzoq kutmaydi", () => {
    expect(backoffMs(10)).toBe(4000);
    expect(backoffMs(100)).toBe(4000);
  });

  it("noto'g'ri urinish raqamida kutmaydi", () => {
    expect(backoffMs(0)).toBe(0);
    expect(backoffMs(-3)).toBe(0);
  });
});

describe("shouldRetryPrint", () => {
  it("bekor qilishda HECH QACHON urinmaydi", () => {
    expect(shouldRetryPrint(1, "cancelled")).toBe(false);
  });

  it("qog'oz tugaganda urinmaydi — natija o'zgarmaydi", () => {
    expect(shouldRetryPrint(1, "device")).toBe(false);
  });

  it("aloqa xatosida chegaragacha urinadi", () => {
    expect(shouldRetryPrint(1, "connection")).toBe(true);
    expect(shouldRetryPrint(MAX_PRINT_ATTEMPTS - 1, "connection")).toBe(true);
  });

  it("cheksiz urinmaydi", () => {
    expect(shouldRetryPrint(MAX_PRINT_ATTEMPTS, "connection")).toBe(false);
    expect(shouldRetryPrint(MAX_PRINT_ATTEMPTS + 5, "unknown")).toBe(false);
  });
});

describe("shouldForceReconnect", () => {
  it("aloqa xatosidan keyin majburan uzadi (holat eskirgan bo'lishi mumkin)", () => {
    expect(shouldForceReconnect("connection")).toBe(true);
    expect(shouldForceReconnect("unknown")).toBe(true);
  });

  it("qog'oz/bekor qilishda ulanishga tegmaydi", () => {
    expect(shouldForceReconnect("device")).toBe(false);
    expect(shouldForceReconnect("cancelled")).toBe(false);
  });
});
