// Jest manual mock — expo-crypto native modulini test muhitida Node crypto bilan
// almashtiradi. randomUUID() haqiqiy RFC 4122 v4 UUID qaytaradi, shuning uchun
// uuid testlari (format + takrorlanmaslik) mazmunli qoladi.
const nodeCrypto = require("crypto");

module.exports = {
  randomUUID: () => nodeCrypto.randomUUID(),
};
