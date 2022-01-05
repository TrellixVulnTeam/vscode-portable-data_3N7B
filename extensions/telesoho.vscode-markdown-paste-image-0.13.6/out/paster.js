'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.Paster = void 0;
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
class PasteImageContext {
}
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
    /**
     * Replace all predefined variable.
     * @param str path
     * @returns
     */
    static replacePredefinedVars(str) {
        let replaceMap = {
            "${workspaceRoot}": vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0] || '',
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
    /**
     * Generate different Markdown content based on the value entered.
     * for example:
     * ./assets/test.png        => ![](./assets/test.png)
     * ./assets/test.png?200,10 => <img src="./assets/test.png" width="200" height="10"/>
     * ./assets/                => ![](![](data:image/png;base64,...)
     * ./assets/?200,10         => <img src="data:image/png;base64,..." width="200" height="10"/>
     *
     * @param inputVal
     * @returns
     */
    static parsePasteImageContext(inputVal) {
        if (!inputVal)
            return;
        inputVal = this.replacePredefinedVars(inputVal);
        //leading and trailling white space are invalidate 
        if (inputVal && (inputVal.length !== inputVal.trim().length)) {
            vscode.window.showErrorMessage('The specified path is invalid: "' + inputVal + '"');
            return;
        }
        // ! Maybe it is a bug in vscode.Uri.parse():
        // > vscode.Uri.parse("f:/test/images").fsPath 
        // '/test/images'
        // > vscode.Uri.parse("file:///f:/test/images").fsPath 
        // 'f:/test/image'                
        // 
        // So we have to add file:/// scheme. while input value contain a driver character 
        if (inputVal.substr(1, 1) === ':') {
            inputVal = 'file:///' + inputVal;
        }
        let pasteImgContext = new PasteImageContext;
        let inputUri = vscode.Uri.parse(inputVal);
        if (inputUri.fsPath.slice(inputUri.fsPath.length - 1) == '/') {
            // While filename is empty(ex: /abc/?200,20),  paste clipboard to a temporay file, then convert it to base64 image to markdown. 
            pasteImgContext.targetFile = utils_1.newTemporaryFilename();
            pasteImgContext.convertToBase64 = true;
            pasteImgContext.removeTargetFileAfterConvert = true;
        }
        else {
            pasteImgContext.targetFile = inputUri;
            pasteImgContext.convertToBase64 = false;
            pasteImgContext.removeTargetFileAfterConvert = false;
        }
        let enableImgTagConfig = vscode.workspace.getConfiguration('MarkdownPaste').enableImgTag;
        if (enableImgTagConfig && inputUri.query) {
            // parse `<filepath>[?width,height]`. for example. /abc/abc.png?200,100
            let ar = inputUri.query.split(',');
            if (ar) {
                pasteImgContext.imgTag = {
                    width: ar[0],
                    height: ar[1]
                };
            }
        }
        return pasteImgContext;
    }
    static saveImage(targetPath) {
        let pasteImgContext = this.parsePasteImageContext(targetPath);
        if (!pasteImgContext || !pasteImgContext.targetFile)
            return;
        let imgPath = pasteImgContext.targetFile.fsPath;
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
            this.renderMarkdownLink(pasteImgContext);
        });
    }
    static renderMdFilePath(pasteImgContext) {
        let editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        let fileUri = editor.document.uri;
        if (!fileUri)
            return;
        let languageId = editor.document.languageId;
        let docPath = fileUri.fsPath;
        // relative will be add backslash characters so need to replace '\' to '/' here.
        let imageFilePath = this.encodePath(path.relative(path.dirname(docPath), pasteImgContext.targetFile.fsPath));
        if (languageId === 'markdown') {
            let imgTag = pasteImgContext.imgTag;
            if (imgTag) {
                return `<img src='${imageFilePath}' width='${imgTag.width}' height='${imgTag.height}'/>`;
            }
            return `![](${imageFilePath})`;
        }
        else {
            return imageFilePath;
        }
    }
    static renderMdImageBase64(pasteImgContext) {
        if (!pasteImgContext.targetFile.fsPath || !fs_1.existsSync(pasteImgContext.targetFile.fsPath)) {
            return;
        }
        let renderText = utils_1.base64Encode(pasteImgContext.targetFile.fsPath);
        let imgTag = pasteImgContext.imgTag;
        if (imgTag) {
            renderText = `<img src='data:image/png;base64,${renderText}' width='${imgTag.width}' height='${imgTag.height}'/>`;
        }
        else {
            renderText = `![](data:image/png;base64,${renderText})`;
        }
        const rmOptions = {
            recursive: true,
            force: true
        };
        if (pasteImgContext.removeTargetFileAfterConvert) {
            fs_1.rmSync(pasteImgContext.targetFile.fsPath, rmOptions);
        }
        return renderText;
    }
    static renderMarkdownLink(pasteImgContext) {
        let editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        let renderText;
        if (pasteImgContext.convertToBase64) {
            renderText = this.renderMdImageBase64(pasteImgContext);
        }
        else {
            renderText = this.renderMdFilePath(pasteImgContext);
        }
        if (renderText) {
            editor.edit(edit => {
                let current = editor.selection;
                if (current.isEmpty) {
                    edit.insert(current.start, renderText);
                }
                else {
                    edit.replace(current, renderText);
                }
            });
        }
    }
    /**
     * Encode path string.
     * encodeURI        : encode all characters to URL encode format
     * encodeSpaceOnly  : encode all space character to %20
     * none             : do nothing
     * @param filePath
     * @returns
     */
    static encodePath(filePath) {
        filePath = filePath.replace(/\\/g, '/');
        var encodePathConfig = vscode.workspace.getConfiguration('MarkdownPaste')['encodePath'];
        if (encodePathConfig == "encodeURI") {
            filePath = encodeURI(filePath);
        }
        else if (encodePathConfig == "encodeSpaceOnly") {
            filePath = filePath.replace(/ /g, "%20");
        }
        return filePath;
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
                let workspace_root_dir = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
                if (content.startsWith(workspace_root_dir.uri.path)) {
                    let relative_path = this.encodePath(path.relative(path.dirname(current_file_path), content));
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
     * Download image to local and render markdown link for it.
     * @param image_url
     */
    static pasteImageURL(image_url) {
        let filename = image_url.split('/').pop().split('?')[0];
        let ext = path.extname(filename);
        let imagePath = this.genTargetImagePath(ext);
        if (!imagePath)
            return;
        let silence = vscode.workspace.getConfiguration('MarkdownPaste').silence;
        if (silence) {
            Paster.downloadFile(image_url, imagePath);
        }
        else {
            let options = {
                prompt: "You can change the filename. The existing file will be overwritten!",
                value: imagePath,
                placeHolder: "(e.g:../test/myimg.png?100,60)",
                valueSelection: [imagePath.length - path.basename(imagePath).length, imagePath.length - ext.length],
            };
            vscode.window.showInputBox(options).then(inputVal => {
                Paster.downloadFile(image_url, inputVal);
            });
        }
    }
    static downloadFile(image_url, target) {
        let pasteImgContext = this.parsePasteImageContext(target);
        if (!pasteImgContext || !pasteImgContext.targetFile)
            return;
        let imgPath = pasteImgContext.targetFile.fsPath;
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
            this.renderMarkdownLink(pasteImgContext);
        }).catch(err => {
            vscode.window.showErrorMessage('Download failed:' + err);
        });
    }
    /**
     * Paste clipboard of image to file and render Markdown link for it.
     * @returns
     */
    static pasteImage() {
        let ext = '.png';
        let imagePath = this.genTargetImagePath(ext);
        if (!imagePath)
            return;
        let silence = vscode.workspace.getConfiguration('MarkdownPaste').silence;
        if (silence) {
            Paster.saveImage(imagePath);
        }
        else {
            let options = {
                prompt: "You can change the filename. The existing file will be overwritten!.",
                value: imagePath,
                placeHolder: "(e.g:../test/myimage.png?100,60)",
                valueSelection: [imagePath.length - path.basename(imagePath).length, imagePath.length - ext.length],
            };
            vscode.window.showInputBox(options).then(inputVal => {
                Paster.saveImage(inputVal);
            });
        }
    }
    /**
     * Generate an path for target image.
     * @param extension extension of target image file.
     * @returns
     */
    static genTargetImagePath(extension = '.png') {
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
        let filePath = fileUri.fsPath;
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
     * Run shell script.
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
}
exports.Paster = Paster;
//# sourceMappingURL=paster.js.map