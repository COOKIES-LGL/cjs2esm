import * as vscode from "vscode";
import babel from "@babel/core";
import EsmCjsPlugin from "./plugins/esm-2-cjs-plugin";
import CjsEsmPlugin from "./plugins/cjs-2-esm-plugin";

export function activate(context: vscode.ExtensionContext) {
  const esModuleToCommonjsDisposable = vscode.commands.registerCommand("cjs2esm.cjsToEsm", () => {
    const activeTextEditor = vscode.window.activeTextEditor;
    if (!activeTextEditor) {
      return;
    }
    activeTextEditor.edit((editBuilder) => {
      const text = activeTextEditor.document.getText();
      const babelFileResult = babel.transformSync(text, {
        sourceType: "module",
        plugins: [EsmCjsPlugin],
      });
      const code = babelFileResult?.code || "";
      const end = new vscode.Position(activeTextEditor.document.lineCount + 1, 0);
      editBuilder.replace(new vscode.Range(new vscode.Position(0, 0), end), code);
    });
  });
  context.subscriptions.push(esModuleToCommonjsDisposable);
  const commonjsToEsModuleDisposable = vscode.commands.registerCommand("cjs2esm.esmToCjs", () => {
    const activeTextEditor = vscode.window.activeTextEditor;
    if (!activeTextEditor) {
      return;
    }
    activeTextEditor.edit((editBuilder) => {
      const text = activeTextEditor.document.getText();
      const babelFileResult = babel.transformSync(text, {
        sourceType: "module",
        plugins: [CjsEsmPlugin],
      });
      const code = babelFileResult?.code || "";
      const end = new vscode.Position(activeTextEditor.document.lineCount + 1, 0);
      editBuilder.replace(new vscode.Range(new vscode.Position(0, 0), end), code);
    });
  });
  context.subscriptions.push(commonjsToEsModuleDisposable);
}

export function deactivate() {}
