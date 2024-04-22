const vscode = require('vscode');

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
	editor.edit(editBuilder => {
		editBuilder.replace(range, newText);
	});
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	console.log('Extension "a2-codepal-helper" is now active!');

	let disposable = vscode.commands.registerCommand('a2-codepal-helper.runCodeDocumentation', async function () {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}
		let apiKey = await context.secrets.get("api-key");
		if (!apiKey) {
			apiKey = await vscode.window.showInputBox();
			await context.secrets.store("api-key", apiKey);
		}
		const form = createForm(editor.document.getText());
		const apiURL = 'https://api.codepal.ai/v1/code-documentation/query';
		const response = await sendRequest(apiURL, form, apiKey);

		if (response.ok) {
			const jsonContent = await response.json();
			updateCode(jsonContent.result);
		} else {
			vscode.window.showInformationMessage(response.statusText);
		}
	});

	context.subscriptions.push(disposable);
}

/**
 * @param {string} text
 */
function createForm(text) {
	const form = new FormData();
	form.append('code', text);
	form.append('flavor', 'verbose');
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
				method: 'POST',
				headers: {
					'Authorization': 'Bearer ' + key
				},
				body: form
			});
		}
	);
}

// This method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
};