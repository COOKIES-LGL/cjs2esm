const babel = require("@babel/core");
const { traverse } = require("@babel/core");
const { types: t } = require("@babel/core");

require("./esm").then(({ lodashAdd }) => {
  lodashAdd(1, 101);
});

exports.bigNone = 10000;

const smallNone = 0.001;

exports.smallNone = smallNone;

exports.lodashAdd = (aValue, bValue) => {
  return aValue + bValue;
};

module.exports = {
  name: "NaTu",
  age: 24,
};
