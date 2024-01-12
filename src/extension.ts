import * as vscode from "vscode";
import * as babel from "@babel/core";
import EsmCjsPlugin from "./plugins/esm-2-cjs-plugin";
import CjsEsmPlugin from "./plugins/cjs-2-esm-plugin";

const commandsList = [
  {
    command: "cjs2esm.cjsToEsm",
    plugin: CjsEsmPlugin,
  },
  {
    command: "cjs2esm.esmToCjs",
    plugin: EsmCjsPlugin,
  },
];

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
          const text = activeTextEditor.document.getText();
          try {
            const babelFileResult = babel.transformSync(text, {
              sourceType: "module",
              plugins: [commandItem.plugin],
            });
            const code = babelFileResult?.code || "";
            const end = new vscode.Position(activeTextEditor.document.lineCount + 1, 0);
            await editBuilder.replace(new vscode.Range(new vscode.Position(0, 0), end), code);
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
