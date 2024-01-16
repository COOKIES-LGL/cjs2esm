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
        activeTextEditor.edit(async (editBuilder) => {
          const text =
            commandItem.command === "cjs2esm.cjsToEsm"
              ? activeTextEditor.document.getText()
              : activeTextEditor.document.getText(activeTextEditor.selection);
          if (text.length === 0) {
            return vscode.window.showWarningMessage("请先选择需要转换的代码块");
          }
          try {
            const babelFileResult = babel.transformSync(text, {
              sourceType: "module",
              plugins: [TransformTsPlugin, commandItem.plugin],
            });
            const code = babelFileResult?.code || "";
            const end = new vscode.Position(activeTextEditor.document.lineCount + 1, 0);
            const location =
              commandItem.command === "cjs2esm.cjsToEsm"
                ? new vscode.Range(new vscode.Position(0, 0), end)
                : new vscode.Range(
                    activeTextEditor.selection.start,
                    activeTextEditor.selection.end
                  );
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
