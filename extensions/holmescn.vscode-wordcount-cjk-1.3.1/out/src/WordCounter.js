"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * The main class to provide counter functionality.
 */
class WordCounter {
    constructor(configuration) {
        /** 中文字数 */
        this._nChineseChars = 0;
        /** 非 ASCII 字符娄 */
        this._nASCIIChars = 0;
        /** 英文单词数 */
        this._nEnglishWords = 0;
        /** 非空白字符娄 */
        this._nWhitespaceChars = 0;
        /** 总字符数 */
        this._nTotalChars = 0;
        this._regexWordChar = new RegExp(configuration.get("regexWordChar"));
        this._regexASCIIChar = new RegExp(configuration.get("regexASCIIChar"));
        this._regexWhitespaceChar = new RegExp(configuration.get("regexWhitespaceChar"));
        this._regexFormatReplace = /\$\{([^}]+)\}/g;
        this._replaceFuncs = {};
    }
    count(text) {
        this._resetCounters();
        let inWord = false;
        for (let index = 0; index < text.length; ++index) {
            // Get a char
            const ch = text.charAt(index);
            this._countChineseChar(ch);
            this._countASCIIChar(ch);
            inWord = this._countEnglishWord(ch, inWord);
            this._countWhitespaceChar(ch);
        }
        this._countEnglishWord(' ', inWord);
        this._nTotalChars = text.length;
    }
    format(fmt) {
        const _this = this;
        const cjk = this._nChineseChars;
        const ascii = this._nASCIIChars;
        const whitespace = this._nWhitespaceChars;
        const en_words = this._nEnglishWords;
        const total = this._nTotalChars;
        return fmt.replace(this._regexFormatReplace, (matches, expr) => {
            if (!_this._replaceFuncs[matches]) {
                _this._replaceFuncs[matches] = _this._compileExpiession(expr);
            }
            const f = _this._replaceFuncs[matches];
            return f(cjk, ascii, whitespace, en_words, total);
        });
    }
    _compileExpiession(expr) {
        const f = new Function('cjk', 'ascii', 'whitespace', 'en_words', 'total', `return ${expr};`);
        try {
            f(0, 0, 0, 0, 0);
        }
        catch (e) {
            return new Function('cjk', 'ascii', 'whitespace', 'en_words', 'total', `return '无效表达式: ${expr}';`);
        }
        return f;
    }
    /**
     * Justify if a char is ASCII character.
     *
     * 0000-007F: C0 Controls and Basic Latin (ASCII)
     * 0080-00FF: C1 Controls and Latin-1 Supplement (Extended ASCII)
     *
     * Reference:
     * http://houfeng0923.iteye.com/blog/1035321 (Chinese)
     * https://en.wikipedia.org/wiki/Basic_Latin_(Unicode_block)
     * https://en.wikipedia.org/wiki/Latin-1_Supplement_(Unicode_block)
     *
     * @todo Current ASCII contains ASCII and Extended ASCII.
     * This sould be configurable in the future.
     *
     * @param ch char to be tested.
     */
    _countASCIIChar(ch) {
        if (this._regexASCIIChar.test(ch)) {
            this._nASCIIChars += 1;
        }
    }
    /**
     * Justify if a char is Chinese character.
     *
     * 4E00-9FFF: CJK Unified Ideographs
     * F900-FAFF: CJK Compatibility Ideographs
     *
     * Reference:
     * http://houfeng0923.iteye.com/blog/1035321 (Chinese)
     * https://en.wikipedia.org/wiki/CJK_Unified_Ideographs
     * https://en.wikipedia.org/wiki/CJK_Compatibility_Ideographs
     *
     * @todo Refine to contains only Chinese Chars.
     *
     * @param ch Char to be tested.
     */
    _countChineseChar(ch) {
        // Count chinese Chars
        const regexChineseChar = /[\u4E00-\u9FA5\uF900-\uFA2D]/;
        if (regexChineseChar.test(ch)) {
            this._nChineseChars += 1;
        }
    }
    /**
     * Test if a char is a word character.
     *
     * The regular expression \w rule is used.
     * In Javascript it matches any alphanumeric character including the underscore.
     * Equivalent to [A-Za-z0-9_].
     *
     * @todo the word means should be configurable.
     *
     * @param ch Char to be tested
     */
    _countEnglishWord(ch, inWord) {
        if (this._regexWordChar.test(ch)) {
            return true;
        }
        else {
            if (inWord) {
                this._nEnglishWords += 1;
            }
            return false;
        }
    }
    /**
     * Test if a char is a white space.
     *
     * The regular expression \s rule is used.
     * In Javascript it matches a single white space character, including space,
     * tab, form feed, line feed.
     * Equivalent to [ \f\n\r\t\v\u00a0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]
     *
     * @param ch Char to be tested.
     */
    _countWhitespaceChar(ch) {
        if (this._regexWhitespaceChar.test(ch)) {
            this._nWhitespaceChars += 1;
        }
    }
    _resetCounters() {
        this._nChineseChars = 0;
        this._nASCIIChars = 0;
        this._nEnglishWords = 0;
        this._nWhitespaceChars = 0;
        this._nTotalChars = 0;
    }
}
exports.WordCounter = WordCounter;
//# sourceMappingURL=WordCounter.js.map