import { NodePath, PluginItem } from "@babel/core";

interface Process {
  // 临时变量，用于判断单次转化的类型
  __transform_type__: "EsmToCjs" | "CjsToEsm" | "";
}

declare const process: Process & NodeJS.Process;

const declareTransformType = (type) => {
  const typeList: any[] = ["EsmToCjs", "CjsToEsm"];
  if (process.__transform_type__ === type) {
    return true;
  }
  process.__transform_type__ = typeList.find((item) => item !== type);
  return false;
};

export default function (babel): PluginItem {
  const { types: t } = babel;
  return {
    name: "cjs-to-esm",
    visitor: {
      /** 处理cjs2esm */
      CallExpression(path: NodePath | any) {
        /* ------------ 框住部分是处理esm2cjs --------------- */
        if (t.isImport(path.node.callee)) {
          // 处理动态导入import()
          if (declareTransformType("CjsToEsm")) {
            return;
          }
          const newNode = t.callExpression(t.identifier("require"), path.node.arguments);
          path.replaceWith(newNode);
        }
        /* ------------ 处理esm2cjs --------------- */
        if (t.isIdentifier(path.node.callee, { name: "require" })) {
          if (declareTransformType("EsmToCjs")) {
            return;
          }
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
        if (declareTransformType("EsmToCjs")) {
          return;
        }
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
      /** 下面处理esm2cjs */
      ImportDeclaration(path: NodePath | any) {
        if (declareTransformType("CjsToEsm")) {
          return;
        }
        const { node } = path;
        const specifiers = node.specifiers;
        const source = node.source;
        if (
          t.isImportDefaultSpecifier(specifiers[0]) ||
          t.isImportNamespaceSpecifier(specifiers[0])
        ) {
          // 默认default、 * as 导入处理
          const newNode = t.variableDeclaration("const", [
            t.variableDeclarator(
              t.identifier(specifiers[0].local.name),
              t.callExpression(t.identifier("require"), [source])
            ),
          ]);
          path.replaceWith(newNode);
          if (t.isImportDefaultSpecifier(specifiers[0]) && specifiers.length > 1) {
            // 处理即有默认default又有 { * } 部分导入的场景
            specifiers.splice(0, 1);
            const newNode = t.variableDeclaration("const", [
              t.variableDeclarator(
                t.objectPattern(
                  specifiers.map((item) => {
                    return t.objectProperty(
                      t.identifier(item.imported.name),
                      t.identifier(item.local.name),
                      false,
                      true
                    );
                  })
                ),
                t.callExpression(t.identifier("require"), [source])
              ),
            ]);
            path.insertAfter(newNode);
          }
        } else {
          const newNode = t.variableDeclaration("const", [
            t.variableDeclarator(
              t.objectPattern(
                specifiers.map((item) => {
                  return t.objectProperty(
                    t.identifier(item.imported.name),
                    t.identifier(item.local.name),
                    false,
                    true
                  );
                })
              ),
              t.callExpression(t.identifier("require"), [source])
            ),
          ]);
          path.replaceWith(newNode);
        }
      },
      ExportNamedDeclaration(path: NodePath | any) {
        if (declareTransformType("CjsToEsm")) {
          return;
        }
        const { node } = path;
        debugger;
        if (node.declaration) {
          if (t.isVariableDeclaration(node.declaration)) {
            const newNodes: any[] = [];
            for (let i = 0; i < node.declaration.declarations.length; i++) {
              const newNode = t.expressionStatement(
                t.assignmentExpression(
                  "=",
                  t.memberExpression(t.identifier("exports"), node.declaration.declarations[i].id),
                  node.declaration.declarations[i].init
                )
              );
              newNodes.push(newNode);
            }
            path.replaceWithMultiple(newNodes);
          }
        } else {
          debugger;
          if (node.specifiers.length > 0) {
            const newNodes: any[] = [];
            for (let i = 0; i < node.specifiers.length; i++) {
              const newNode = t.expressionStatement(
                t.assignmentExpression(
                  "=",
                  t.memberExpression(t.identifier("exports"), node.specifiers[i].exported),
                  node.specifiers[i].local
                )
              );
              newNodes.push(newNode);
            }
            path.replaceWithMultiple(newNodes);
          }
        }
      },
      ExportDefaultDeclaration(path: NodePath | any) {
        if (declareTransformType("CjsToEsm")) {
          return;
        }
        const { node } = path;
        if (t.isIdentifier(node.declaration)) {
          const newNode = t.expressionStatement(
            t.assignmentExpression(
              "=",
              t.memberExpression(t.identifier("module"), t.identifier("exports")),
              node.declaration
            )
          );
          path.replaceWith(newNode);
        } else {
          if (t.isFunctionDeclaration(node.declaration)) {
            const newNode = t.expressionStatement(
              t.assignmentExpression(
                "=",
                t.memberExpression(t.identifier("module"), t.identifier("exports")),
                t.functionExpression(
                  null,
                  node.declaration.params,
                  node.declaration.body,
                  node.declaration.generator,
                  node.declaration.async
                )
              )
            );
            path.replaceWith(newNode);
          } else if (t.isClassDeclaration(node.declaration)) {
            const newNode = t.expressionStatement(
              t.assignmentExpression(
                "=",
                t.memberExpression(t.identifier("module"), t.identifier("exports")),
                t.classExpression(
                  node.declaration.id,
                  node.declaration.superClass,
                  node.declaration.body,
                  node.declaration.decorators
                )
              )
            );
            path.replaceWith(newNode);
          } else {
            const newNode = t.expressionStatement(
              t.assignmentExpression(
                "=",
                t.memberExpression(t.identifier("module"), t.identifier("exports")),
                node.declaration
              )
            );
            path.replaceWith(newNode);
          }
        }
      },
    },
  };
}
