import * as babel from "@babel/core";
import { traverse } from "@babel/core";
import { types as t } from "@babel/core";

export const bigNone = 10000;

const ast = babel.parse("code");

import("./cjs").then(({ lodashAdd }) => {
  lodashAdd(1, 101);
});

export const lodashAdd = (aValue, bValue) => {
  return aValue + bValue;
};

export default () => {
  const a = 1,
    b = 2;
  return a + b;
};
