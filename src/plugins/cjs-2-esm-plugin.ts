import { NodePath, PluginItem } from "@babel/core";

export default function (babel): PluginItem {
  const { types: t } = babel;
  return {
    name: "cjs-to-esm",
    visitor: {
      CallExpression(path: NodePath | any) {
        if (t.isIdentifier(path.node.callee, { name: "require" })) {
          if (t.isVariableDeclarator(path.parentPath.node)) {
            let newNode;
            if (t.isObjectPattern(path.parentPath.node.id)) {
              newNode = t.importDeclaration(
                path.parentPath.node.id.properties.map((item) => {
                  return t.importSpecifier(
                    t.identifier(item.value.name),
                    t.identifier(item.key.name)
                  );
                }),
                t.stringLiteral(path.node.arguments[0].value)
              );
              path.parentPath.replaceWith(newNode);
            } else {
              newNode = t.importDeclaration(
                [t.importDefaultSpecifier(t.identifier(path.parentPath.node.id.name))],
                t.stringLiteral(path.node.arguments[0].value)
              );
              path.parentPath.replaceWith(newNode);
            }
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
          // 删除最左则的const或var,但是要保留import语句
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
          const newNode = t.exportDefaultDeclaration(path.node.right);
          path.parentPath.replaceWith(newNode);
        } else if (t.isIdentifier(path.node.left.object, { name: "exports" })) {
          if (t.isIdentifier(path.node.right)) {
            //如果right是一个Identifier，那么就是exports.a = a;
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
            //如果right是一个值，那么就是exports.a = 1;
            const newNode = t.variableDeclaration("const", [
              t.variableDeclarator(
                t.identifier(path.node.left.property.name),
                path.node.right.value
              ),
            ]);
            path.parentPath.replaceWith(newNode);
            const newNode2 = t.exportNamedDeclaration(
              null,
              [
                t.exportSpecifier(
                  t.identifier(path.node.left.property.name),
                  t.identifier(path.node.left.property.name)
                ),
              ],
              null
            );
            path.insertAfter(newNode2);
          }
        }
      },
    },
  };
}
