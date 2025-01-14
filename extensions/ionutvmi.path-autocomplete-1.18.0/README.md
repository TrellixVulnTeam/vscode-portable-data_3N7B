# Path Autocomplete for Visual Studio Code

Provides path completion for visual studio code.

<img src="https://raw.githubusercontent.com/ionutvmi/path-autocomplete/master/demo/path-autocomplete.gif" alt="demo gif" />

## Features

- it supports relative paths (starting with ./)
- it supports absolute path to the workspace (starting with /)
- it supports absolute path to the file system (starts with: C:)
- it supports paths relative to the user folder (starts with ~)
- it supports parial paths (./tmp/fol will suggest ./tmp/folder1 if it exists)
- it supports items exclusions via the `path-autocomplete.excludedItems` option
- it supports npm packages (starting with a-z and not relative to disk)
- it supports automatic suggestion after selecting a folder
- it supports custom mappings via the `path-autocomplete.pathMappings` option
- it supports custom transformations to the inserted text via the `path-autocomplete.transformations`
- it supports windows paths with the `path-autocomplete.useBackslash`

## Installation

You can install it from the [marketplace](https://marketplace.visualstudio.com/items?itemName=ionutvmi.path-autocomplete).
`ext install path-autocomplete`

## Options

- `path-autocomplete.extensionOnImport` - boolean If true it will append the extension as well when inserting the file name on `import` or `require` statements.
- `path-autocomplete.includeExtension` - boolean If true it will append the extension as well when inserting the file name.
- `path-autocomplete.excludedItems`
  This option allows you to exclude certain files from the suggestions.

  ```
  "path-autocomplete.excludedItems": {
      "**/*.js": { "when": "**/*.ts" }, // ignore js files if i'm inside a ts file
      "**/*.map": { "when": "**" }, // always ignore *.map files
      "**/{.git,node_modules}": { "when": "**" }, // always ignore .git and node_modules folders
      "**": { "when": "**", "isDir": true }, // always ignore `folder` suggestions
      "**/*.ts": { "when": "**", "context": "import.*" }, // ignore .ts file suggestions in all files when the current line matches the regex from the `context`
  }
  ```

  [minimatch](https://www.npmjs.com/package/minimatch) is used to check if the files match the pattern.

- `path-autocomplete.pathMappings`
  Useful for defining aliases for absolute or relative paths.

  ```
  "path-autocomplete.pathMappings": {
      "/test": "${folder}/src/Actions/test", // alias for /test
      "/": "${folder}/src", // the absolute root folder is now /src,
      "$root": ${folder}/src // the relative root folder is now /src
      // or multiple folders for one mapping
      "$root": ["${folder}/p1/src", "${folder}/p2/src"] // the root is now relative to both p1/src and p2/src
  }
  ```

- `path-autocomplete.pathSeparators` - string Lists the separators used for extracting the inserted path when used outside strings.
  The default value is: ` \t({[`

- `path-autocomplete.transformations`
  List of custom transformation applied to the inserted text.
  Example: replace `_` with an empty string when selecting a SCSS partial file.

  ```
  "path-autocomplete.transformations": [{
      "type": "replace",
      "parameters": ["^_", ""],
      "when": {
          "fileName": "\\.scss$"
      }
  }],
  ```

  Supported transformation:

  - `replace` - Performs a string replace on the selected item text.
    Parameters:
    - `regex` - a regex pattern
    - `replaceString` - the replacement string

- `path-autocomplete.triggerOutsideStrings` boolean - if true it will trigger the autocomplete outside of quotes
- `path-autocomplete.enableFolderTrailingSlash` boolean - if true it will add a slash after the insertion of a folder path that will trigger the autocompletion.
- `path-autocomplete.disableUpOneFolder` boolean - disables the up one folder (..) element from the completion list.
- `path-autocomplete.useBackslash` boolean - if true it will use `\\` when iserting the paths.
- `path-autocomplete.ignoredFilesPattern` - string - Glob patterns for disabling the path completion in the specified file types. Example: "\*_/_.{css,scss}"
- `path-autocomplete.ignoredPrefixes` array - list of ignored prefixes to disable suggestions
  on certain preceeding words/characters.
  Example:
  ```js
      "path-autocomplete.ignoredPrefixes": [
          "//" // type double slash and no suggesstions will be displayed
      ]
  ```
-

## Configure VSCode to recognize path aliases

VSCode doesn't automatically recognize path aliases so you cannot <kbd>alt</kbd>+<kbd>click</kbd> to open files. To fix this you need to create `jsconfig.json` or `tsconfig.json` to the root of your project and define your alises. An example configuration:

```
{
  "compilerOptions": {
    "target": "esnext", // define to your liking
    "baseUrl": "./",
    "paths": {
      "test/*": ["src/actions/test"],
      "assets/*": ["src/assets"]
    }
  },
  "exclude": ["node_modules"] // Optional
}
```

## Tips

- if you want to use this in markdown or simple text files you need to enable `path-autocomplete.triggerOutsideStrings`

- `./` for relative paths

  > If `./` doesn't work properly, add this to `keybindings.json`: `{ "key": ".", "command": "" }`. Refer to https://github.com/ChristianKohler/PathIntellisense/issues/9

- When I use aliases I can't jump to imported file on Ctrl + Click
  > This is controlled by the compiler options in jsconfig.json. You can create the JSON file in your project root and add paths for your aliases.
  > jsconfig.json Reference
  > https://code.visualstudio.com/docs/languages/jsconfig#_using-webpack-aliases
- if you have issues with duplicate suggestions please use the `path-autocomplete.ignoredFilesPattern` option to disable the path autocomplete in certain file types
- if you need more fine grained control for handing duplicate items you can use the `path-autocomplete.excludedItems` option as follows:

```
// disable all suggestions in HTML files, when the current line contains the href or src attributes
"path-autocomplete.excludedItems": {
        "**": {
            "when": "**/*.html",
            "context": "(src|href)=.*"
        }
},

// for js and typescript you can disable the vscode suggestions using the following options
"javascript.suggest.paths": false,
"typescript.suggest.paths": false
```

## Release notes

The release notes are available in the [CHANGELOG.md](https://github.com/ionutvmi/path-autocomplete/blob/HEAD/CHANGELOG.md) file.

## Author

Mihai Ionut Vilcu

- [github/ionutvmi](https://github.com/ionutvmi)
- [twitter/mihaivlc93](http://twitter.com/mihaivlc93)

## Credits

This extension is based on [path-intellisense](https://marketplace.visualstudio.com/items?itemName=christian-kohler.path-intellisense)
