# Change Log

## 0.13.4 (August 2, 2021)

- Fix [#42](https://github.com/telesoho/vscode-markdown-paste-image/issues/42): files being saved to incorrect location

## 0.13.3 (July 2, 2021)

- Feature: Embed base64 image supported.
- Add MarkdownPaste.encodePath configuration.

## 0.12.3 (Sep 19, 2019)

- Fix some grammar mistakes.

## 0.12.2 (Sep 1, 2019)

- Fix [#25](https://github.com/telesoho/vscode-markdown-paste-image/issues/25): encode url in markdown

## 0.12.0 (Feb 8, 2019)

- Feature: Paste local file path that under workspace folder, will add relative path link into markdown.

## 0.11.1 (Dec 21, 2018)

- Fixed: Paste text doesn't work on some Linux. 

## 0.11.0 (Dec 3, 2018)

- Change setting name from `pasteImage` to `MarkdownPaste`
- Feature: Download url file 

## 0.10.1 (Nov 12, 2018)

-  Feature: emoji supported

## 0.10.0 (Nov 5, 2018)

- Feature [#20](https://github.com/telesoho/vscode-markdown-paste-image/issues/20): Paste image in HTML format. 

## 0.9.5 (Oct 25, 2018)

- Fixed: Cannot get all content in clipboard.
- Optimize convert html table (colspan supported) to markdown.

## 0.9.2 (Oct 13, 2018)

- Support more predefined variables

## 0.9.1 (September 12, 2018)

- Remove devDependencies clipboardy for Window and Linux
- Optimize convert html to markdown.

## 0.9.0 (September 8, 2018)

- Feature: Convert rich text to markdown
- Fix [#18](https://github.com/telesoho/vscode-markdown-paste-image/issues/18): Paste path add `./` and File name verification support for Chinese

## 0.8.0 (August 12, 2018)

- Feature: Insert latex math symbol into current editor.

## 0.7.5 (April 23, 2018)

- Fixed [#13](https://github.com/telesoho/vscode-markdown-paste-image/issues/13): downgrade clipboardy to v1.1.4.

## 0.7.4 (April 20, 2018)

- Update all dependencies.
- Add requirment setion to README

## 0.7.3 (November 10, 2017)

- Fix [#10](https://github.com/telesoho/vscode-markdown-paste-image/issues/10): Chinese encoding problem.

## 0.7.1 (October 14, 2017)

- Feature: Convert HTML to Markdown for pasing HTML content.
- Feature: Add a snippets for adding ruby tag.

## 0.6.2 (October 04, 2017)

- Feature: Parse and replace content for pasting text.

## 0.5.0 (September 15, 2017)

- Feature [#8](https://github.com/telesoho/vscode-markdown-paste-image/issues/8) : Autoselect filename for easier renaming.(thank @huhk-sysu)

## 0.4.9 (August 28, 2017)

- Fix [#7](https://github.com/telesoho/vscode-markdown-paste-image/issues/7) :Fix encoding problem in non-english language in Windows os.

## 0.4.7 (May 21, 2017)

- Fix [#5](https://github.com/telesoho/vscode-markdown-paste-image/issues/5) : Enable upper case as file name.
- Add pasteImage.silence configure option.

## 0.4.3 (May 21, 2017)

- Fix [#4](https://github.com/telesoho/vscode-markdown-paste-image/issues/4) : Cannot create first level sub folder of root folder on windows.

## 0.4.1 (May 20, 2017)

- Fix [#2](https://github.com/telesoho/vscode-markdown-paste-image/issues/2) : Use forward slashes "/" in the image url

## 0.4.0 (May 19, 2017)

- Feature: Support rename image after paste.

## 0.3.0 (December 31, 2016)

- Feature: Support config the path(absolute or relative) to save image.

## 0.2.0 (November 13, 2016)

- Feature: Add linux support by xclip
- Feature: Support use the selected text as the image name

## 0.1.0 (November 12, 2016)

- Feature: Add windows support by powershell

## 0.0.1

- Finish first publish. Only support macos.