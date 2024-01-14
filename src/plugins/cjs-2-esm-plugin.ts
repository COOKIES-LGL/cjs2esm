import { NodePath, PluginItem } from "@babel/core";

export default function (babel): PluginItem {
  const { types: t } = babel;
  return {
    name: "cjs-to-esm",
    visitor: {
      CallExpression(path: NodePath | any) {
        if (t.isIdentifier(path.node.callee, { name: "require" })) {
          if (t.isMemberExpression(path.parentPath.node) && path.node.callee.name === "require") {
            // 处理require()
            const newNode = t.callExpression(t.import(), path.node.arguments);
            path.replaceWith(newNode);
          }
          if (t.isVariableDeclarator(path.parentPath.node)) {
            const newNode = t.isObjectPattern(path.parentPath.node.id)
              ? t.importDeclaration(
                  path.parentPath.node.id.properties.map((item) => {
                    return t.importSpecifier(
                      t.identifier(item.value.name),
                      t.identifier(item.key.name)
                    );
                  }),
                  t.stringLiteral(path.node.arguments[0].value)
                )
              : t.importDeclaration(
                  [t.importDefaultSpecifier(t.identifier(path.parentPath.node.id.name))],
                  t.stringLiteral(path.node.arguments[0].value)
                );
            path.parentPath.replaceWith(newNode);
          }
          if (t.isVariableDeclaration(path.parentPath.node)) {
            const newNode = t.importDeclaration(
              [
                t.importDefaultSpecifier(
                  t.identifier(path.parentPath.node.declarations[0].id.name)
                ),
              ],
              t.stringLiteral(path.node.arguments[0].value)
            );
            path.parentPath.replaceWith(newNode);
          }
          if (t.isObjectProperty(path.parentPath.node)) {
            const newNode = t.importDeclaration(
              [t.importDefaultSpecifier(t.identifier(path.parentPath.node.key.name))],
              t.stringLiteral(path.node.arguments[0].value)
            );
            path.parentPath.replaceWith(newNode);
          }
          if (t.isObjectExpression(path.parentPath.node)) {
            const newNode = t.importDeclaration(
              [t.importDefaultSpecifier(t.identifier(path.parentPath.node.properties[0].key.name))],
              t.stringLiteral(path.node.arguments[0].value)
            );
            path.parentPath.replaceWith(newNode);
          }
          if (t.isCallExpression(path.parentPath.node)) {
            const newNode = t.importDeclaration(
              [t.importDefaultSpecifier(t.identifier(path.parentPath.node.arguments[0].name))],
              t.stringLiteral(path.node.arguments[0].value)
            );
            path.parentPath.replaceWith(newNode);
          }
          // 删除最左侧的const或var,但是要保留import语句
          if (path.parentPath.parentPath.node.type === "VariableDeclaration") {
            path.parentPath.parentPath.replaceWith(path.parentPath.node);
          }
        }
      },
      AssignmentExpression(path: NodePath | any) {
        if (!t.isMemberExpression(path.node.left)) {
          return;
        }
        if (
          t.isIdentifier(path.node.left.object, { name: "module" }) &&
          t.isIdentifier(path.node.left.property, { name: "exports" })
        ) {
          // 处理module.exports
          const newNode = t.exportDefaultDeclaration(path.node.right);
          path.parentPath.replaceWith(newNode);
        } else if (t.isIdentifier(path.node.left.object, { name: "exports" })) {
          if (t.isIdentifier(path.node.right)) {
            // 处理 exports.a = a;
            const newNode = t.exportNamedDeclaration(
              null,
              [
                t.exportSpecifier(
                  t.identifier(path.node.left.property.name),
                  t.identifier(path.node.left.property.name)
                ),
              ],
              null
            );
            path.parentPath.replaceWith(newNode);
          } else {
            // 处理 exports.a = 字面量;
            const newNode = t.exportNamedDeclaration(
              t.variableDeclaration("const", [
                t.variableDeclarator(t.identifier(path.node.left.property.name), path.node.right),
              ]),
              [],
              null
            );
            path.parentPath.replaceWith(newNode);
          }
        }
      },
    },
  };
}
