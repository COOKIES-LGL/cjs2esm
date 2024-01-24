import * as vscode from "vscode";
import * as babel from "@babel/core";
import TransformPlugin from "./plugins/transform-plugin";
import TransformTsPlugin from "@babel/plugin-transform-typescript";

const commandsList = [
  {
    command: "cjs2esm.cjsToEsm",
    plugin: TransformPlugin,
  },
  {
    command: "cjs2esm.selectionRunTransform",
    plugin: TransformPlugin,
  },
];

interface Process {
  // 临时变量，用于判断单次转化的类型
  __transform_type__: "EsmToCjs" | "CjsToEsm" | "";
}

declare const process: Process & NodeJS.Process;

process.__transform_type__ = "";

export function activate(context: vscode.ExtensionContext) {
  commandsList.forEach((commandItem) => {
    const commonjsToEsModuleDisposable = vscode.commands.registerCommand(
      commandItem.command,
      () => {
        const activeTextEditor = vscode.window.activeTextEditor;
        if (!activeTextEditor) {
          return;
        }
        const isFileTransform = commandItem.command === "cjs2esm.cjsToEsm"; // 文件转化
        activeTextEditor.edit(async (editBuilder) => {
          const text = isFileTransform
            ? activeTextEditor.document.getText()
            : activeTextEditor.document.getText(activeTextEditor.selection);
          if (text.length === 0) {
            return vscode.window.showWarningMessage("请先选择需要转换的代码块");
          }
          try {
            const plugins = isFileTransform
              ? [TransformTsPlugin, commandItem.plugin]
              : [commandItem.plugin];
            // TransformTsPlugin 插件会把未使用的import 移除生成export {} 当使用用户选择的激活方式时不使用这个插件
            const babelFileResult = babel.transformSync(text, {
              sourceType: "module",
              plugins,
            });
            const code = babelFileResult?.code || "";
            const end = new vscode.Position(activeTextEditor.document.lineCount + 1, 0);
            const location = isFileTransform
              ? new vscode.Range(new vscode.Position(0, 0), end)
              : new vscode.Range(activeTextEditor.selection.start, activeTextEditor.selection.end);
            await editBuilder.replace(location, code);
            process.__transform_type__ = ""; // 重置transform_type
            vscode.commands.executeCommand("editor.action.formatDocument");
          } catch (error) {
            vscode.window.showWarningMessage("文件存在无法解析节点");
            console.log(error);
          }
        });
      }
    );
    context.subscriptions.push(commonjsToEsModuleDisposable);
  });
}

export function deactivate() {}
