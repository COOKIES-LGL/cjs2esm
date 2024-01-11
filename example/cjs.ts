const babel = require("@babel/core");
const { traverse } = require("@babel/core");
const { types: t } = require("@babel/core");

require("./esm").then(({ lodashAdd }) => {
  lodashAdd(1, 101);
});

exports.bigNone = 10000;

exports.lodashAdd = (aValue, bValue) => {
  return aValue + bValue;
};

module.exports = {
  name: "NaTu",
  age: 24,
};
