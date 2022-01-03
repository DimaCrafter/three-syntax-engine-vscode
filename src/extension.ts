import * as vscode from 'vscode'

export function activate (context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.languages.registerDefinitionProvider('twostrokejs-syntax', {
		provideDefinition (doc, pos) {
			const word = doc.getText(doc.getWordRangeAtPosition(pos, /(:)?\$?[a-z_]+|[A-Z_]+/));
			if (word[0] == ':') return;

			const prefix  = word + ': ';
			const lines = doc.getText().split('\n');
			for (let l = 0; l < lines.length; l++) {
				if (lines[l].startsWith(prefix)) {
					return { uri: doc.uri, range: new vscode.Range(l, 0, l, word.length) };
				}
			}
		}
	}));

	context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider('twostrokejs-syntax', { provideDocumentSymbols }));

	context.subscriptions.push(vscode.languages.registerCompletionItemProvider('twostrokejs-syntax', {
		provideCompletionItems (doc, pos) {
			const word = doc.getText(doc.getWordRangeAtPosition(pos, /(:)?\$?[a-z_]+|[A-Z_]+/));
			if (word[0] == ':') return;

			const symbols = provideDocumentSymbols(doc);
			const result = [];
			for (const symbol of symbols) {
				if (symbol.name.startsWith(word) || symbol.name.startsWith('$' + word)) {
					let kind = 0;
					switch (symbol.kind) {
						case vscode.SymbolKind.Property: kind = vscode.CompletionItemKind.Property; break;
						case vscode.SymbolKind.Variable: kind = vscode.CompletionItemKind.Variable; break;
						case vscode.SymbolKind.Field:    kind = vscode.CompletionItemKind.Field;    break;
					}

					const hint = new vscode.CompletionItem(symbol.name, kind);
					hint.insertText = symbol.name.replace(/^\$/, '');
					result.push(hint);
				}
			}

			return result;
		}
	}))
}

const SYMBOL_REGEXP = /^(?:([A-Z_]+)|(\$?[a-z_]+))(\?)?:\s+/;
function provideDocumentSymbols (doc: vscode.TextDocument) {
	const result = [];
	const lines = doc.getText().split('\n');
	for (let l = 0; l < lines.length; l++) {
		const match = SYMBOL_REGEXP.exec(lines[l]);
		if (match) {
			let name = '', detail = '', kind = 0;
			if (match[1]) {
				name = match[1];
				kind = vscode.SymbolKind.Property;

				if (match[3]) {
					detail = 'Ignorable';
				}
			}

			if (match[2]) {
				name = match[2];
				if (name[0] == '$') {
					kind = vscode.SymbolKind.Variable;
					detail = 'Flatable'
				} else {
					kind = vscode.SymbolKind.Field;
				}
			}

			const lineEnd = lines[l].length - 1;
			result.push(new vscode.DocumentSymbol(
				name,
				detail,
				kind,
				new vscode.Range(l, 0, l, lineEnd),
				new vscode.Range(l, match[0].length, l, lineEnd)
			));
		}
	}

	return result;
}
