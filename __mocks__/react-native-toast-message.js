// Jest manual mock — toast komponenti/imperativ API'ni test muhitida no-op qiladi
// (native render yoki provider talab qilmaydi).
const Toast = { show: jest.fn(), hide: jest.fn() };

module.exports = Toast;
module.exports.default = Toast;
