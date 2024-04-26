const vscode = require("vscode");

/**
 * @param {string} newText
 */
function updateCode(newText) {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const fullRange = getFullRange(editor);
    editText(editor, fullRange, newText);
  }
}

/**
 * @param {vscode.TextEditor} editor
 */
function getFullRange(editor) {
  const firstLine = editor.document.lineAt(0);
  const lastLine = editor.document.lineAt(editor.document.lineCount - 1);
  return new vscode.Range(firstLine.range.start, lastLine.range.end);
}

/**
 * @param {vscode.TextEditor} editor
 * @param {vscode.Range} range
 * @param {string} newText
 */
function editText(editor, range, newText) {
  editor.edit((editBuilder) => {
    editBuilder.replace(range, newText);
  });
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log('Extension "a2-codepal-helper" is now active!');

  const commands = {
    "a2-codepal-helper.setApiKey": async () => await setApiKey(context),
    "a2-codepal-helper.delApiKey": async () => await delApiKey(context),
    "a2-codepal-helper.runCodeDoc": async () => await runCodeDoc(context),
  };

  for (const [commandId, callback] of Object.entries(commands)) {
    context.subscriptions.push(
      vscode.commands.registerCommand(commandId, callback)
    );
  }
}

/**
 * @param {vscode.ExtensionContext} [context]
 */
async function setApiKey(context) {
  const options = {
    placeHolder: "Enter API Key: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  };
  const apiKey = await vscode.window.showInputBox(options);
  if (apiKey != undefined) {
    await context.secrets.store("api-key", apiKey);
    vscode.window.showInformationMessage("API Key stored!");
  }
}

/**
 * @param {vscode.ExtensionContext} [context]
 */
async function delApiKey(context) {
  vscode.window
    .showInformationMessage("Do you want to remove API key?", "Yes", "No")
    .then(async (answer) => {
      if (answer === "Yes") {
        await context.secrets.delete("api-key");
        vscode.window.showInformationMessage("API Key removed!");
      }
    });
}

/**
 * @param {vscode.ExtensionContext} [context]
 */
async function runCodeDoc(context) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }
  let apiKey = await context.secrets.get("api-key");
  if (!apiKey) {
    vscode.window.showInformationMessage("Please, set API key!");
    return;
  }
  const form = createForm(editor.document.getText());
  const apiURL = "https://api.codepal.ai/v1/code-documentation/query";
  const response = await sendRequest(apiURL, form, apiKey);
  if (response.ok) {
    let jsonContent = await response.json();
    // @ts-ignore
    updateCode(jsonContent.result);
  } else {
    vscode.window.showInformationMessage(response.statusText);
  }
}

/**
 * @param {string} text
 */
function createForm(text) {
  const form = new FormData();
  form.append("code", text);
  form.append("flavor", "verbose");
  return form;
}

/**
 * @param {string | URL | Request} url
 * @param {import("undici-types").FormData} form
 * @param {string} key
 */
async function sendRequest(url, form, key) {
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "codepal.ai Helper",
      cancellable: false,
    },
    async (progress) => {
      progress.report({ message: "In progress..." });
      return fetch(url, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + key,
        },
        body: form,
      });
    }
  );
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
