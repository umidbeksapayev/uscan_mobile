import { domainForScope } from "../log-domain";

describe("domainForScope", () => {
  it("printer scope'larini PRINT ga guruhlaydi", () => {
    expect(domainForScope("print.manager.attempt1")).toBe("PRINT");
    expect(domainForScope("print.bt.disconnect")).toBe("PRINT");
    expect(domainForScope("print.queue.drain")).toBe("PRINT");
    expect(domainForScope("printerSettings.parse")).toBe("PRINT");
  });

  it("sotuv va navbat scope'larini ajratadi", () => {
    expect(domainForScope("checkout.decrementLocal")).toBe("SALE");
    expect(domainForScope("payment.queueCount")).toBe("SALE");
    expect(domainForScope("sync.queue")).toBe("SYNC");
    expect(domainForScope("saleQueue.parseItems")).toBe("SYNC");
  });

  it("auth oilasini bitta domenga yig'adi", () => {
    for (const s of ["auth.x", "login.y", "reset.z", "verify.a", "profile.b", "deepLink.c"]) {
      expect(domainForScope(s)).toBe("AUTH");
    }
  });

  it("noma'lum prefiksni yo'qotmaydi — APP ga tushadi", () => {
    expect(domainForScope("nimadir.boshqa")).toBe("APP");
    expect(domainForScope("")).toBe("APP");
  });

  it("nuqtasiz scope ham ishlaydi", () => {
    expect(domainForScope("sync")).toBe("SYNC");
  });
});
