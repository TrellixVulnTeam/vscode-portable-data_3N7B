'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const clipboard = require("clipboardy");
const child_process_1 = require("child_process");
const moment = require("moment");
const vscode = require("vscode");
const toMarkdown_1 = require("./toMarkdown");
const utils_1 = require("./utils");
const fs_1 = require("fs");
var ClipboardType;
(function (ClipboardType) {
    ClipboardType[ClipboardType["Unkown"] = -1] = "Unkown";
    ClipboardType[ClipboardType["Html"] = 0] = "Html";
    ClipboardType[ClipboardType["Text"] = 1] = "Text";
    ClipboardType[ClipboardType["Image"] = 2] = "Image";
})(ClipboardType || (ClipboardType = {}));
/**
 * Run command and get stdout
 * @param shell
 * @param options
 */
function runCommand(shell, options) {
    return new Promise((resolve, reject) => {
        let stdout = "";
        let stderr = "";
        let process = child_process_1.spawn(shell, options);
        process.stdout.on("data", contents => {
            stdout += contents;
        });
        process.stderr.on("data", contents => {
            stderr += contents;
        });
        process.on("error", reject).on("close", function (code) {
            if (code === 0) {
                resolve(stdout);
            }
            else {
                reject(new Error(stderr));
            }
        });
    });
}
class Paster {
    /**
     * Paste text
     */
    static pasteText() {
        var ret = this.getClipboardContentType((ctx_type) => {
            console.log("Clipboard Type:", ctx_type);
            switch (ctx_type) {
                case ClipboardType.Html:
                    this.pasteTextHtml((html) => {
                        console.log(html);
                        var markdown = toMarkdown_1.toMarkdown(html);
                        Paster.writeToEditor(markdown);
                    });
                    break;
                case ClipboardType.Text:
                    this.pasteTextPlain((text) => {
                        if (text) {
                            let newContent = Paster.parse(text);
                            Paster.writeToEditor(newContent);
                        }
                    });
                    break;
                case ClipboardType.Image:
                    Paster.pasteImage();
                    break;
            }
        });
        // If cannot get content type then try to read clipboard once
        if (false == ret) {
            var content = clipboard.readSync();
            if (content) {
                let newContent = Paster.parse(content);
                Paster.writeToEditor(newContent);
            }
            else {
                Paster.pasteImage();
            }
        }
    }
    /**
     * Download url content in clipboard
     */
    static pasteDownload() {
        var ret = this.getClipboardContentType((ctx_type) => {
            console.log("Clipboard Type:", ctx_type);
            switch (ctx_type) {
                case ClipboardType.Html:
                case ClipboardType.Text:
                    this.pasteTextPlain((text) => {
                        if (text) {
                            if (/^(http[s]:)+\/\/(.*)/i.test(text)) {
                                Paster.pasteImageURL(text);
                            }
                        }
                    });
                    break;
            }
        });
    }
    /**
     * Ruby tag
     */
    static Ruby() {
        let editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        let rubyTag = new vscode.SnippetString("<ruby>${TM_SELECTED_TEXT}<rp>(</rp><rt>${1:pronunciation}</rt><rp>)</rp></ruby>");
        editor.insertSnippet(rubyTag);
    }
    static isHTML(content) {
        return /<[a-z][\s\S]*>/i.test(content);
    }
    static writeToEditor(content) {
        let startLine = vscode.window.activeTextEditor.selection.start.line;
        var selection = vscode.window.activeTextEditor.selection;
        let position = new vscode.Position(startLine, selection.start.character);
        return vscode.window.activeTextEditor.edit((editBuilder) => {
            editBuilder.insert(position, content);
        });
    }
    static replacePredefinedVars(str) {
        let replaceMap = {
            "${workspaceRoot}": vscode.workspace.rootPath,
        };
        let editor = vscode.window.activeTextEditor;
        let fileUri = editor && editor.document.uri;
        let filePath = fileUri && fileUri.fsPath;
        if (filePath) {
            replaceMap["${fileExtname}"] = path.extname(filePath);
            replaceMap["${fileBasenameNoExtension}"] = path.basename(filePath, replaceMap["${fileExtname}"]);
            replaceMap["${fileBasename}"] = path.basename(filePath);
            replaceMap["${fileDirname}"] = path.dirname(filePath);
        }
        for (var search in replaceMap) {
            str = str.replace(search, replaceMap[search]);
        }
        // User may be input a path with backward slashes (\), so need to replace all '\' to '/'.
        return str.replace(/\\/g, '/');
    }
    static saveImage(inputVal) {
        if (!inputVal)
            return;
        let editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        let fileUri = editor.document.uri;
        if (!fileUri)
            return;
        let filePath = fileUri.fsPath;
        inputVal = this.replacePredefinedVars(inputVal);
        if (inputVal && (inputVal.length !== inputVal.trim().length)) {
            vscode.window.showErrorMessage('The specified path is invalid: "' + inputVal + '"');
            return;
        }
        let width;
        let height;
        let enableImgTag = vscode.workspace.getConfiguration('MarkdownPaste').enableImgTag;
        if (enableImgTag) {
            // parse `<filepath>[,width,height]`. for example. /abc/abc.png,200,100
            let ar = inputVal.split(',');
            inputVal = ar[0];
            width = ar[1];
            height = ar[2];
        }
        let imgPath = inputVal.replace(/\\/g, "/");
        if (!utils_1.prepareDirForFile(imgPath)) {
            vscode.window.showErrorMessage('Make folder failed:' + imgPath);
            return;
        }
        // save image and insert to current edit file
        this.saveClipboardImageToFileAndGetPath(imgPath, imagePath => {
            if (!imagePath)
                return;
            if (imagePath === 'no image') {
                vscode.window.showInformationMessage('There is not an image in the clipboard.');
                return;
            }
            imagePath = this.renderFilePath(editor.document.languageId, filePath, imagePath, width, height);
            editor.edit(edit => {
                let current = editor.selection;
                if (current.isEmpty) {
                    edit.insert(current.start, imagePath);
                }
                else {
                    edit.replace(current, imagePath);
                }
            });
        });
    }
    static parse(content) {
        let rules = vscode.workspace.getConfiguration('MarkdownPaste').rules;
        for (var i = 0; i < rules.length; i++) {
            let rule = rules[i];
            var re = new RegExp(rule.regex, rule.options);
            var reps = rule.replace;
            if (re.test(content)) {
                var newstr = content.replace(re, reps);
                return newstr;
            }
        }
        try {
            // if copied content is exist file path that under folder of workspace root path
            // then add a relative link into markdown.
            if (fs_1.existsSync(content)) {
                let editor = vscode.window.activeTextEditor;
                let fileUri = editor.document.uri;
                let current_file_path = fileUri.fsPath;
                let workspace_dir = vscode.workspace.rootPath;
                if (content.startsWith(workspace_dir)) {
                    let relative_path = encodeURI(path.relative(path.dirname(current_file_path), content).replace(/\\/g, '/'));
                    return `![](${relative_path})`;
                }
            }
        }
        catch (error) {
            // do nothing
            // console.log(error);
        }
        if (Paster.isHTML(content)) {
            return toMarkdown_1.toMarkdown(content);
        }
        return content;
    }
    static pasteTextPlain(callback) {
        var script = {
            'win32': "win32_get_clipboard_text_plain.ps1",
            'linux': "linux_get_clipboard_text_plain.sh"
        };
        var ret = this.runScript(script, [], (data) => {
            callback(data);
        });
        return ret;
    }
    static pasteTextHtml(callback) {
        var script = {
            'win32': "win32_get_clipboard_text_html.ps1",
            'linux': "linux_get_clipboard_text_html.sh"
        };
        var ret = this.runScript(script, [], (data) => {
            callback(data);
        });
        return ret;
    }
    /**
     *
     * @param image_url url of image
     */
    static pasteImageURL(image_url) {
        // get current edit file path
        let editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        let fileUri = editor.document.uri;
        if (!fileUri)
            return;
        if (fileUri.scheme === 'untitled') {
            vscode.window.showInformationMessage('Before pasting an image, you need to save the current edited file first.');
            return;
        }
        // get selection as image file name, need check
        var selection = editor.selection;
        var selectText = editor.document.getText(selection);
        if (selectText && !/^[^\\/:\*\?""<>|]{1,120}$/.test(selectText)) {
            vscode.window.showInformationMessage('Your selection is not a valid file name!');
            return;
        }
        // get image destination path
        let folderPathFromConfig = vscode.workspace.getConfiguration('MarkdownPaste').path;
        folderPathFromConfig = this.replacePredefinedVars(folderPathFromConfig);
        if (folderPathFromConfig && (folderPathFromConfig.length !== folderPathFromConfig.trim().length)) {
            vscode.window.showErrorMessage('The specified path is invalid: "' + folderPathFromConfig + '"');
            return;
        }
        let filename = image_url.split('/').pop().split('?')[0];
        let imagePath = this.getImagePath(fileUri.fsPath, selectText, folderPathFromConfig, path.extname(filename));
        let silence = vscode.workspace.getConfiguration('MarkdownPaste').silence;
        if (silence) {
            Paster.downloadFile(image_url, imagePath);
        }
        else {
            let ext = path.extname(imagePath);
            let options = {
                prompt: "You can change the filename. The existing file will be overwritten!",
                value: imagePath,
                placeHolder: "(e.g:../test/myimage.png)",
                valueSelection: [imagePath.length - path.basename(imagePath).length, imagePath.length - ext.length],
            };
            vscode.window.showInputBox(options).then(inputVal => {
                Paster.downloadFile(image_url, inputVal);
            });
        }
    }
    static downloadFile(image_url, inputVal) {
        if (!inputVal)
            return;
        let editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        let fileUri = editor.document.uri;
        if (!fileUri)
            return;
        let filePath = fileUri.fsPath;
        inputVal = this.replacePredefinedVars(inputVal);
        if (inputVal && (inputVal.length !== inputVal.trim().length)) {
            vscode.window.showErrorMessage('The specified path is invalid: "' + inputVal + '"');
            return;
        }
        let width;
        let height;
        let enableImgTag = vscode.workspace.getConfiguration('MarkdownPaste').enableImgTag;
        if (enableImgTag) {
            // parse `<filepath>[,width,height]`. for example. /abc/abc.png,200,100
            let ar = inputVal.split(',');
            inputVal = ar[0];
            width = ar[1];
            height = ar[2];
        }
        let imgPath = inputVal.replace(/\\/g, "/");
        if (!utils_1.prepareDirForFile(imgPath)) {
            vscode.window.showErrorMessage('Make folder failed:' + imgPath);
            return;
        }
        // save image and insert to current edit file
        utils_1.fetchAndSaveFile(image_url, imgPath)
            .then((imagePath) => {
            if (!imagePath)
                return;
            if (imagePath === 'no image') {
                vscode.window.showInformationMessage('There is not an image in the clipboard.');
                return;
            }
            imagePath = this.renderFilePath(editor.document.languageId, filePath, imagePath, width, height);
            editor.edit(edit => {
                let current = editor.selection;
                if (current.isEmpty) {
                    edit.insert(current.start, imagePath);
                }
                else {
                    edit.replace(current, imagePath);
                }
            });
        }).catch(err => {
            vscode.window.showErrorMessage('Download failed:' + err);
        });
    }
    static pasteImage() {
        // get current edit file path
        let editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        let fileUri = editor.document.uri;
        if (!fileUri)
            return;
        if (fileUri.scheme === 'untitled') {
            vscode.window.showInformationMessage('Before pasting an image, you need to save the current edited file first.');
            return;
        }
        // get selection as image file name, need check
        var selection = editor.selection;
        var selectText = editor.document.getText(selection);
        if (selectText && !/^[^\\/:\*\?""<>|]{1,120}$/.test(selectText)) {
            vscode.window.showInformationMessage('Your selection is not a valid file name!');
            return;
        }
        // get image destination path
        let folderPathFromConfig = vscode.workspace.getConfiguration('MarkdownPaste').path;
        folderPathFromConfig = this.replacePredefinedVars(folderPathFromConfig);
        if (folderPathFromConfig && (folderPathFromConfig.length !== folderPathFromConfig.trim().length)) {
            vscode.window.showErrorMessage('The specified path is invalid: "' + folderPathFromConfig + '"');
            return;
        }
        let imagePath = this.getImagePath(fileUri.fsPath, selectText, folderPathFromConfig);
        let fileNameLength = selectText ? selectText.length : 19; // yyyy-mm-dd-hh-mm-ss
        let silence = vscode.workspace.getConfiguration('MarkdownPaste').silence;
        if (silence) {
            Paster.saveImage(imagePath);
        }
        else {
            let options = {
                prompt: "You can change the filename. The existing file will be overwritten!.",
                value: imagePath,
                placeHolder: "(e.g:../test/myimage.png)",
                valueSelection: [imagePath.length - 4 - fileNameLength, imagePath.length - 4],
            };
            vscode.window.showInputBox(options).then(inputVal => {
                Paster.saveImage(inputVal);
            });
        }
    }
    static getImagePath(filePath, selectText, folderPathFromConfig, extension = '.png') {
        // image file name
        let imageFileName = "";
        if (!selectText) {
            imageFileName = moment().format("Y-MM-DD-HH-mm-ss") + extension;
        }
        else {
            imageFileName = selectText + extension;
        }
        // image output path
        let folderPath = path.dirname(filePath);
        let imagePath = "";
        // generate image path
        if (path.isAbsolute(folderPathFromConfig)) {
            // important: replace must be done at the end, path.join() will build a path with backward slashes (\)
            imagePath = path.join(folderPathFromConfig, imageFileName).replace(/\\/g, '/');
        }
        else {
            // important: replace must be done at the end, path.join() will build a path with backward slashes (\)
            imagePath = path.join(folderPath, folderPathFromConfig, imageFileName).replace(/\\/g, '/');
        }
        return imagePath;
    }
    static getClipboardType(type_array) {
        let content_type = ClipboardType.Unkown;
        if (!type_array) {
            return content_type;
        }
        let platform = process.platform;
        console.log('platform', platform);
        if (platform == "linux") {
            for (var i = 0; i < type_array.length; i++) {
                var type = type_array[i];
                if (type == "image/png") {
                    content_type = ClipboardType.Image;
                    break;
                }
                else if (type == "text/html") {
                    content_type = ClipboardType.Html;
                    break;
                }
                else {
                    content_type = ClipboardType.Text;
                }
            }
        }
        else if (platform == "win32") {
            for (var i = 0; i < type_array.length; i++) {
                var type = type_array[i];
                if (type == "PNG" || type == "Bitmap") {
                    content_type = ClipboardType.Image;
                    break;
                }
                else if (type == "UnicodeText" || type == "Text" || type == "HTML Format") {
                    content_type = ClipboardType.Text;
                    break;
                }
            }
        }
        return content_type;
    }
    static getClipboardContentType(cb) {
        var script = {
            'linux': "linux_get_clipboard_content_type.sh",
            'win32': "win32_get_clipboard_content_type.ps1"
        };
        let ret = this.runScript(script, [], (data) => {
            console.log("getClipboardContentType", data);
            if (data == "no xclip") {
                vscode.window.showInformationMessage('You need to install xclip command first.');
                return;
            }
            let type_array = data.split(/\r\n|\n|\r/);
            cb(this.getClipboardType(type_array));
        });
        return ret;
    }
    /**
     *
     * @param script
     * @param parameters
     * @param callback
     */
    static runScript(script, parameters = [], callback = (data) => { }) {
        let platform = process.platform;
        if (typeof script[platform] === "undefined") {
            console.log(`Cannot found script for ${platform}`);
            return false;
        }
        const scriptPath = path.join(__dirname, '../res/' + script[platform]);
        let shell = "";
        let command = [];
        if (platform === 'win32') {
            // Windows
            command = [
                '-noprofile',
                '-noninteractive',
                '-nologo',
                '-sta',
                '-executionpolicy', 'unrestricted',
                '-windowstyle', 'hidden',
                '-file', scriptPath
            ].concat(parameters);
            shell = 'powershell';
        }
        else if (platform === 'darwin') {
            // Mac
            shell = 'osascript';
            command = [scriptPath].concat(parameters);
        }
        else {
            // Linux
            shell = 'sh';
            command = [scriptPath].concat(parameters);
        }
        const runer = runCommand(shell, command);
        runer.then(stdout => {
            if (callback) {
                callback(stdout.toString().trim());
            }
            // return stdout                 // return the command value
        }, err => {
            console.log(err);
            // throw err                     // throw again the error
        });
        return true;
    }
    /**
     * use applescript to save image from clipboard and get file path
     */
    static saveClipboardImageToFileAndGetPath(imagePath, cb) {
        if (!imagePath)
            return;
        const script = {
            'win32': "win32_save_clipboard_png.ps1",
            "darwin": "mac.applescript",
            "linux": "linux_save_clipboard_png.sh"
        };
        let ret = this.runScript(script, [imagePath], (data) => {
            cb(data);
        });
        return ret;
    }
    /**
     * render the image file path dependen on file type
     * e.g. in markdown image file path will render to ![](path)
     */
    static renderFilePath(languageId, docPath, imageFilePath, width, height) {
        // relative will be add backslash characters so need to replace '\' to '/' here.
        imageFilePath = encodeURI(path.relative(path.dirname(docPath), imageFilePath).replace(/\\/g, '/'));
        if (languageId === 'markdown') {
            if (typeof width !== "undefined") {
                height = height || '';
                return `<img src='${imageFilePath}' width='${width}' height='${height}'/>`;
            }
            return `![](${imageFilePath})`;
        }
        else {
            return imageFilePath;
        }
    }
}
exports.Paster = Paster;
//# sourceMappingURL=paster.js.map