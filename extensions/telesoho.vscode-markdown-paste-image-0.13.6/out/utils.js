"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newTemporaryFilename = exports.base64Encode = exports.fetchAndSaveFile = exports.prepareDirForFile = void 0;
const url = require("url");
const http = require("http");
const https = require("https");
const path = require("path");
const shelljs_1 = require("shelljs");
const fs = require("fs");
const moment = require("moment");
const vscode_1 = require("vscode");
const os = require("os");
/**
 * prepare directory for specified file.
 * @param filePath
 */
function prepareDirForFile(filePath) {
    let dirName = path.dirname(filePath);
    try {
        shelljs_1.mkdir("-p", dirName);
    }
    catch (error) {
        console.log(error);
        return false;
    }
    return true;
}
exports.prepareDirForFile = prepareDirForFile;
/**
 * Fetch file to specified local folder
 * @param fileURL
 * @param dest
 */
function fetchAndSaveFile(fileURL, filepath) {
    let dest = path.dirname(filepath);
    let basename = path.basename(filepath);
    return new Promise((resolve, reject) => {
        const timeout = 10000;
        const urlParsed = url.parse(fileURL);
        const uri = urlParsed.pathname.split("/");
        let req;
        let filename = basename || uri[uri.length - 1].match(/(\w*\.?-?)+/)[0];
        if (urlParsed.protocol === null) {
            fileURL = "http://" + fileURL;
        }
        req = urlParsed.protocol === "https:" ? https : http;
        let request = req
            .get(fileURL, response => {
            // Make sure extension is present (mostly for images)
            if (filename.indexOf(".") < 0) {
                const contentType = response.headers["content-type"];
                filename += `.${contentType.split("/")[1]}`;
            }
            const targetPath = `${dest}/${filename}`;
            response.on("end", function () {
                resolve(targetPath);
            });
            if (response.statusCode === 200) {
                if (prepareDirForFile(targetPath)) {
                    var file = fs.createWriteStream(targetPath);
                    response.pipe(file);
                }
                else {
                    reject("Make folder failed:" + dest);
                }
            }
            else {
                reject(`Downloading ${fileURL} failed`);
            }
        }).setTimeout(timeout, () => {
            request.abort();
            reject(`Request Timeout(${timeout} ms):Download ${fileURL} failed!`);
        })
            .on("error", e => {
            reject(`Downloading ${fileURL} failed! Please make sure URL is valid.`);
        });
    });
}
exports.fetchAndSaveFile = fetchAndSaveFile;
/**
 * Temporary file class
 */
function newTemporaryFilename(prefix = 'markdown_paste') {
    let tempDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    return vscode_1.Uri.parse(path.join(tempDir, moment().format("Y-MM-DD-HH-mm-ss")));
}
exports.newTemporaryFilename = newTemporaryFilename;
/**
 * Encode local file data to base64 encoded string
 * @param file
 * @returns base64 code string
 */
function base64Encode(file) {
    var bitmap = fs.readFileSync(file);
    return Buffer.from(bitmap).toString('base64');
}
exports.base64Encode = base64Encode;
//# sourceMappingURL=utils.js.map