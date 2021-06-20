'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const vscode_1 = require("vscode");
let allWords = [];
function activate(context) {
    // Built-in wordlist
    const builtInWords = fs.readFileSync(context.asAbsolutePath('words')).toString().split(/\r?\n/);
    loadOtherWordsAndRebuildIndex(builtInWords);
    context.subscriptions.push(vscode.commands.registerCommand('completion.openUserDict', () => {
        if (vscode.workspace.getConfiguration('dictCompletion').get('useExternalUserDictFile')) {
            vscode.window.showQuickPick(getUserDictFilenames(), { placeHolder: 'Select a dictionary file' }).then(userDictFilename => {
                if (!userDictFilename) {
                    return;
                }
                if (!fs.existsSync(userDictFilename)) {
                    fs.closeSync(fs.openSync(userDictFilename, 'w'));
                }
                vscode.workspace.openTextDocument(userDictFilename).then(doc => vscode.window.showTextDocument(doc));
            });
        }
        else {
            vscode.commands.executeCommand('workbench.action.openSettingsJson');
        }
    }));
    vscode.workspace.onDidSaveTextDocument(doc => {
        if (vscode.workspace.getConfiguration('dictCompletion').get('useExternalUserDictFile')
            && getUserDictFilenames().map(n => n.toLowerCase()).includes(doc.fileName.toLowerCase())) {
            loadOtherWordsAndRebuildIndex(builtInWords);
        }
    });
    vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('dictCompletion.useExternalUserDictFile')
            || (e.affectsConfiguration('dictCompletion.userDictionary')
                && !vscode.workspace.getConfiguration('dictCompletion').get('useExternalUserDictFile'))) {
            loadOtherWordsAndRebuildIndex(builtInWords);
        }
        if (e.affectsConfiguration('dictCompletion.programmingLanguage')) {
            vscode.window.showInformationMessage("Please reload VSCode to take effect. (Dictionary completion for programming languages)");
        }
    });
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(getDocSelector('markdown'), new DictionaryCompletionItemProvider("markdown")), vscode.languages.registerCompletionItemProvider(getDocSelector('latex'), new DictionaryCompletionItemProvider("latex")), vscode.languages.registerCompletionItemProvider(getDocSelector('html'), new DictionaryCompletionItemProvider("html")));
    // Feature: programming language
    if (vscode.workspace.getConfiguration('dictCompletion').get('programmingLanguage')) {
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(getDocSelector('javascript'), new DictionaryCompletionItemProvider("javascript")), vscode.languages.registerCompletionItemProvider(getDocSelector('typescript'), new DictionaryCompletionItemProvider("typescript")), vscode.languages.registerCompletionItemProvider(getDocSelector('python'), new DictionaryCompletionItemProvider("python")));
        //// Make sure `quickSuggestions` for string/comment is enabled
        const cfgQuickSuggestions = vscode.workspace.getConfiguration('editor').get('quickSuggestions');
        const pythonObject = vscode.workspace.getConfiguration("[python]");
        const javascriptObject = vscode.workspace.getConfiguration("[javascript]");
        const typescriptObject = vscode.workspace.getConfiguration("[typescript]");
        const somehowSet = cfgQuickSuggestions && cfgQuickSuggestions['comments'] && cfgQuickSuggestions['strings']
            || pythonObject['editor.quickSuggestions']
            || javascriptObject['editor.quickSuggestions']
            || typescriptObject['editor.quickSuggestions'];
        if (!somehowSet && !context.globalState.get('dictCompl.progLang.userDisabled', false)) {
            const option1 = 'Do it';
            const option2 = 'Disable';
            const option3 = 'Remind me later';
            vscode.window.showInformationMessage('To enable dictionary completion for programming languages, we need to enable `quickSuggestions` for string/comment in user settings.', option1, option2, option3).then(option => {
                switch (option) {
                    case option1:
                        vscode.workspace.getConfiguration('editor').update('quickSuggestions', {
                            "other": true,
                            "comments": true,
                            "strings": true
                        }, vscode.ConfigurationTarget.Global);
                        break;
                    case option2:
                        context.globalState.update('dictCompl.progLang.userDisabled', true);
                        vscode.workspace.getConfiguration('dictCompletion').update('programmingLanguage', false, vscode.ConfigurationTarget.Global);
                        break;
                    case option3:
                        break;
                }
            });
        }
    }
}
exports.activate = activate;
function getDocSelector(lang) {
    return [{ language: lang, scheme: 'file' }, { language: lang, scheme: 'untitled' }];
}
/**
 * Add following wordlists and rebuild index
 * - User wordlist
 * - `Code Spell Checker` extension user words if exist
 */
function loadOtherWordsAndRebuildIndex(builtInWords) {
    // User wordlists
    let userWordlists = [];
    if (vscode.workspace.getConfiguration('dictCompletion').get('useExternalUserDictFile')) {
        for (const dictFilename of getUserDictFilenames()) {
            if (fs.existsSync(dictFilename)) {
                let userWordListStr = fs.readFileSync(dictFilename).toString();
                if (userWordListStr.length > 0) {
                    let list = userWordListStr.split(/\r?\n/);
                    //// Hunspell format compatibility
                    if (/\d+/.test(list[0])) {
                        list.splice(0, 1);
                    }
                    list = list.map(word => word.replace(/\/.*$/, ''));
                    userWordlists.push(list);
                }
            }
        }
    }
    else {
        userWordlists.push(vscode.workspace.getConfiguration('dictCompletion').get('userDictionary', []));
    }
    // User words from `Code Spell Checker` extension (#13)
    let otherWordLists = [];
    let cSpellConfig;
    const folders = vscode.workspace.workspaceFolders || [];
    folders.forEach(folder => {
        cSpellConfig = vscode.workspace.getConfiguration('cSpell', folder.uri);
        if (cSpellConfig) {
            otherWordLists.push(cSpellConfig.get('words', []));
        }
    });
    cSpellConfig = vscode.workspace.getConfiguration('cSpell', null);
    if (cSpellConfig) {
        otherWordLists.push(cSpellConfig.get('userWords', []));
    }
    // All the words
    let words = builtInWords.concat(...userWordlists, ...otherWordLists);
    words = Array.from(new Set(words));
    words = words.filter(word => word.length > 0 && !word.startsWith('//'));
    allWords = words;
}
function wordlistToComplItems(words) {
    return words.map(word => new vscode.CompletionItem(word, vscode.CompletionItemKind.Text));
}
// Adapted from https://github.com/bartosz-antosik/vscode-spellright/blob/master/src/spellright.js
function getUserDictFilenames() {
    let defaultDictFile = '';
    let codeFolder = 'Code';
    const dictName = 'wordlist';
    if (vscode.version.indexOf('insider') >= 0)
        codeFolder = 'Code - Insiders';
    if (process.platform == 'win32')
        defaultDictFile = path.join(process.env.APPDATA, codeFolder, 'User', dictName);
    else if (process.platform == 'darwin')
        defaultDictFile = path.join(process.env.HOME, 'Library', 'Application Support', codeFolder, 'User', dictName);
    else if (process.platform == 'linux')
        defaultDictFile = path.join(process.env.HOME, '.config', codeFolder, 'User', dictName);
    const cfgDictFiles = vscode.workspace.getConfiguration('dictCompletion').get('externalUserDictFiles');
    return [defaultDictFile, ...cfgDictFiles];
}
;
/**
 * Provide completion according to the first letter
 */
class DictionaryCompletionItemProvider {
    constructor(fileType) {
        this.fileType = fileType;
    }
    provideCompletionItems(document, position, _token) {
        const lineText = document.lineAt(position.line).text;
        const textBefore = lineText.substring(0, position.character);
        const docTextBefore = document.getText(new vscode_1.Range(new vscode_1.Position(0, 0), position));
        const wordBefore = textBefore.replace(/\W/g, ' ').split(/[\s]+/).pop();
        const firstLetter = wordBefore.charAt(0);
        const followingChar = lineText.charAt(position.character);
        const addSpace = vscode.workspace.getConfiguration('dictCompletion').get('addSpaceAfterCompletion') && !followingChar.match(/[ ,.:;?!\-]/);
        if (wordBefore.length < vscode.workspace.getConfiguration('dictCompletion').get('leastNumOfChars')) {
            return [];
        }
        switch (this.fileType) {
            case "markdown":
                // [caption](don't complete here)
                if (/\[[^\]]*\]\([^\)]*$/.test(textBefore)) {
                    return [];
                }
                return this.completeByFirstLetter(firstLetter, addSpace);
            case "latex":
                // `|` means cursor
                // \command|
                if (/\\[^ {\[]*$/.test(textBefore)) {
                    return [];
                }
                // \begin[...|] or \begin{...}[...|]
                if (/\\(documentclass|usepackage|begin|end|cite|ref|includegraphics)({[^}]*}|)?\[[^\]]*$/.test(textBefore)) {
                    return [];
                }
                // \begin{...|} or \begin[...]{...|}
                if (/\\(documentclass|usepackage|begin|end|cite|ref|includegraphics|input|include)(\[[^\]]*\]|)?{[^}]*$/.test(textBefore)) {
                    return [];
                }
                return this.completeByFirstLetter(firstLetter, addSpace);
            case "html":
                // <don't complete here>
                if (/<[^>]*$/.test(textBefore)) {
                    return [];
                }
                //// Inside <style> or <srcipt>
                let docBefore = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
                if (docBefore.includes('<style>')
                    && (!docBefore.includes('</style>')
                        || docBefore.match(/<style>/g).length > docBefore.match(/<\/style>/g).length)) {
                    return [];
                }
                if (docBefore.includes('<script>')
                    && (!docBefore.includes('</script>')
                        || docBefore.match(/<script>/g).length > docBefore.match(/<\/script>/g).length)) {
                    return [];
                }
                return this.completeByFirstLetter(firstLetter, addSpace);
            case "javascript":
            case "typescript":
                //// Multiline comment
                if (/\/\*((?!\*\/)[\W\w])*$/.test(docTextBefore)) {
                    return this.completeByFirstLetter(firstLetter, addSpace);
                }
                //// Inline comment or string
                const tmpTextBeforeJs = textBefore.replace(/(?<!\\)('|").*?(?<!\\)\1/g, '');
                if (/\/{2,}/.test(tmpTextBeforeJs) //// inline comment
                    || (/(?<!\\)['"]/.test(tmpTextBeforeJs) //// inline string
                        && !/(import|require)/.test(tmpTextBeforeJs.split(/['"]/)[0]) //// reject if in import/require clauses
                    )) {
                    return this.completeByFirstLetter(firstLetter, addSpace);
                }
                return [];
            case "python":
                //// Multiline comment (This check should go before inline comment/string check)
                const tmpDocTextBefore = docTextBefore.replace(/('''|""")[\W\w]*?\1/g, '');
                if (/('''|""")((?!\1)[\W\w])*$/.test(tmpDocTextBefore)) {
                    return this.completeByFirstLetter(firstLetter, addSpace);
                }
                //// Inline comment or string
                const inlineCheckStr1 = textBefore.replace(/('''|""")/g, '').replace(/f?(?<!\\)('|").*?(?<!\\)\1/g, '');
                const inlineCheckStr2 = inlineCheckStr1.replace(/((?<!\\){).*?((?<!\\)})/g, '');
                if (/#+/.test(inlineCheckStr1)
                    || /(?<!\\|f)['"]/.test(inlineCheckStr1)
                    || /f(?<!\\)['"][^{]*$/.test(inlineCheckStr2)) {
                    return this.completeByFirstLetter(firstLetter, addSpace);
                }
                return [];
        }
    }
    completeByFirstLetter(firstLetter, addSpace = false) {
        if (firstLetter.toLowerCase() == firstLetter) {
            // Lowercase letter
            let completions = wordlistToComplItems(allWords.filter(w => w.toLowerCase().startsWith(firstLetter)));
            if (addSpace) {
                completions.forEach(item => item.insertText = item.label + ' ');
            }
            return new Promise((resolve, reject) => resolve(completions));
        }
        else {
            // Uppercase letter
            let completions = allWords.filter(w => w.toLowerCase().startsWith(firstLetter.toLowerCase()))
                .map(w => {
                let newLabel = w.charAt(0).toUpperCase() + w.slice(1);
                let newItem = new vscode.CompletionItem(newLabel, vscode.CompletionItemKind.Text);
                if (addSpace) {
                    newItem.insertText = newLabel + ' ';
                }
                return newItem;
            });
            return new Promise((resolve, reject) => resolve(completions));
        }
    }
}
//# sourceMappingURL=completion.js.map