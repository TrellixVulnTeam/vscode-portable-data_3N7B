"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GltfActionProvider = void 0;
const vscode = require("vscode");
// This file offers "Quick Fixes" for select validation issues.
const GLTF_VALIDATOR = 'glTF Validator';
const UNDECLARED_EXTENSION = 'UNDECLARED_EXTENSION';
const ADD_EXTENSION = 'Add Extension to \'extensionsUsed\'';
class GltfActionProvider {
    provideCodeActions(document, range, context, token) {
        // for each diagnostic entry that has the matching `code`, create a code action command
        return context.diagnostics
            .filter(diagnostic => diagnostic.source === GLTF_VALIDATOR && diagnostic.code === UNDECLARED_EXTENSION)
            .map(diagnostic => this.createCommandDeclareExtension(diagnostic));
    }
    createCommandDeclareExtension(diagnostic) {
        const action = new vscode.CodeAction(ADD_EXTENSION, vscode.CodeActionKind.QuickFix);
        action.command = {
            command: 'gltf.declareExtension',
            arguments: [diagnostic],
            title: ADD_EXTENSION,
            tooltip: 'Add this extension to the extensionsUsed array.'
        };
        action.diagnostics = [diagnostic];
        action.isPreferred = true;
        return action;
    }
    static declareExtension(diagnostic, map, textEditor, edit) {
        const document = textEditor.document;
        let searchRange;
        // This could be called by the QuickFix system, or just invoked directly
        // by a user as an editor command.  Figure out where this was invoked.
        if (diagnostic) {
            searchRange = diagnostic.range;
        }
        else {
            const selection = textEditor.selection;
            searchRange = new vscode.Range(selection.active, selection.active);
        }
        // Next, figure out if we're on (or inside) a named extension, and
        // what the extension name is.
        const pointers = map.pointers;
        let bestKey = '';
        for (let key of Object.keys(pointers)) {
            let pointer = pointers[key];
            if (pointer.key) {
                const range = new vscode.Range(document.positionAt(pointer.key.pos), document.positionAt(pointer.valueEnd.pos));
                if (range.contains(searchRange)) {
                    bestKey = key;
                }
            }
        }
        let pos = bestKey.lastIndexOf('/extensions/');
        if (pos < 0) {
            return;
        }
        let extensionName = bestKey.substring(pos + 12);
        let pos2 = extensionName.indexOf('/');
        if (pos2 >= 0) {
            extensionName = extensionName.substring(0, pos2);
        }
        if (extensionName === '') {
            return;
        }
        // Now we know the extension name.  Figure out if there's already
        // an "extensionsUsed" block, create one if not, and add the extension name to it.
        const eol = (document.eol === vscode.EndOfLine.CRLF) ? '\r\n' : '\n';
        const tabSize = textEditor.options.tabSize;
        const space = textEditor.options.insertSpaces ? (new Array(tabSize + 1).join(' ')) : '\t';
        let insert = -1;
        let newJson;
        if (pointers['/extensionsUsed'] !== undefined) {
            // Add extension name to existing extensionsUsed list.
            for (let key of Object.keys(pointers)) {
                if (key.startsWith('/extensionsUsed/')) {
                    insert = Math.max(insert, pointers[key].valueEnd.pos);
                }
            }
            newJson =
                ',' + eol +
                    space + space + '"' + extensionName + '"';
            if (insert < 0) {
                // This block only executes if "extensionsUsed" is an empty array,
                // which is invalid glTF, but possible in the editor.
                insert = pointers['/extensionsUsed'].value.pos + 1;
                newJson = newJson.substring(1);
            }
        }
        else {
            // Create a new extensionsUsed section.
            for (let key of Object.keys(pointers)) {
                if (key.length > 2) {
                    insert = Math.max(insert, pointers[key].valueEnd.pos);
                }
            }
            newJson =
                ',' + eol +
                    space + '"extensionsUsed": [' + eol +
                    space + space + '"' + extensionName + '"' + eol +
                    space + ']';
        }
        edit.insert(document.positionAt(insert), newJson);
    }
}
exports.GltfActionProvider = GltfActionProvider;
GltfActionProvider.providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix
];
//# sourceMappingURL=gltfActionProvider.js.map