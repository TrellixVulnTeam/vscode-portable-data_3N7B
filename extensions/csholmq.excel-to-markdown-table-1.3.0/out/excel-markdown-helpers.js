"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replaceIntraCellNewline = exports.splitIntoRowsAndColumns = exports.columnWidth = exports.columnAlignmentFromChar = exports.columnAlignment = exports.getColumnWidthsAndAlignments = exports.calculateAlignmentMarkdownSyntaxMetadata = exports.addAlignmentSyntax = exports.addMarkdownSyntax = void 0;
const table_alignment_syntax_1 = require("./table-alignment-syntax");
const ALIGNED_LEFT = "l";
const ALIGNED_RIGHT = "r";
const ALIGNED_CENTER = "c";
const EXCEL_COLUMN_DELIMITER = "\t";
const MARKDOWN_NEWLINE = "<br/>";
const UNESCAPED_DOUBLE_QUOTE = '"';
// UNI_NEXT_LINE = '\u0085'
// UNI_LINE_SEPARATOR = '\u2028'
// UNI_PARAGRAPH_SEPARATOR = `\u2029`
const EXCEL_ROW_DELIMITER_REGEX = /[\n\u0085\u2028\u2029]|\r\n?/g;
const COLUMN_ALIGNMENT_REGEX = /^(\^[lcr])/i;
const EXCEL_NEWLINE_ESCAPED_CELL_REGEX = /"([^\t]*(?<=[^\r])\n[^\t]*)"/g;
const EXCEL_NEWLINE_REGEX = /\n/g;
const EXCEL_DOUBLE_QUOTE_ESCAPED_REGEX = /""/g;
/**
 * Apply markdown syntax to create padded cells for each row of data in the table
 * @param rows Rows of text data
 * @param columnWidths Width of each column in the destination table
 */
function addMarkdownSyntax(rows, columnWidths) {
    return rows.map(function (row, rowIndex) {
        // | Name         | Title | Email Address  |
        // |--------------|-------|----------------|
        // | Jane Atler   | CEO   | jane@acme.com  |
        // | John Doherty | CTO   | john@acme.com  |
        // | Sally Smith  | CFO   | sally@acme.com |
        return "| " + row.map(function (column, index) {
            // Create a padded string from the cell content
            return column + Array(columnWidths[index] - column.length + 1).join(" ");
        }).join(" | ") + " |";
    });
}
exports.addMarkdownSyntax = addMarkdownSyntax;
/**
 * Adds Alignment colons and inserts Header hyphens
 * @param markdownRows Each row in the markdown output table
 * @param columnWidths Padded widths for each column
 * @param colAlignments Alignments for each cell's text (l = left, c = center, r = right)
 */
function addAlignmentSyntax(markdownRows, columnWidths, colAlignments) {
    // Deepcopy: https://stackoverflow.com/questions/35504310/deep-copy-an-array-in-angular-2-typescript#35504348
    let result = Object.assign([], markdownRows);
    // Insert the markdown alignment syntax as second row in the output table
    result.splice(1, 0, "|" + columnWidths.map(function (width, index) {
        let { prefix, postfix, adjust } = calculateAlignmentMarkdownSyntaxMetadata(colAlignments[index]);
        return prefix + Array(columnWidths[index] + 3 - adjust).join("-") + postfix;
    }).join("|") + "|");
    return result;
}
exports.addAlignmentSyntax = addAlignmentSyntax;
/**
 * Derives the Markdown Alignment syntax metadata on how to align the cell text
 * @param alignment The cell text alignment (l = left, c = center, r = right)
 */
function calculateAlignmentMarkdownSyntaxMetadata(alignment) {
    switch (alignment) {
        case ALIGNED_LEFT: return table_alignment_syntax_1.ALIGNED_LEFT_SYNTAX;
        case ALIGNED_CENTER: return table_alignment_syntax_1.ALIGNED_CENTER_SYNTAX;
        case ALIGNED_RIGHT: return table_alignment_syntax_1.ALIGNED_RIGHT_SYNTAX;
        default: return table_alignment_syntax_1.ALIGNED_LEFT_SYNTAX;
    }
}
exports.calculateAlignmentMarkdownSyntaxMetadata = calculateAlignmentMarkdownSyntaxMetadata;
/**
 * Derives alignments from excel table data and calculates
 * column padding for each column
 * @param rows Table of data from Excel
 */
function getColumnWidthsAndAlignments(rows) {
    let colAlignments = [];
    return {
        columnWidths: rows[0].map(function (column, columnIndex) {
            // Derive column alignment from excel column header text
            let alignment = columnAlignment(column);
            colAlignments.push(alignment);
            // Replace header text with unaligned header text
            column = column.replace(COLUMN_ALIGNMENT_REGEX, "");
            rows[0][columnIndex] = column;
            // Return max width for this column at columnIndex to
            // support all rows in the table
            return columnWidth(rows, columnIndex);
        }),
        colAlignments: colAlignments
    };
}
exports.getColumnWidthsAndAlignments = getColumnWidthsAndAlignments;
/**
 * Maps the original header alignment to an internal alignment
 * @param columnHeaderText The original Excel column header text
 */
function columnAlignment(columnHeaderText) {
    var m = columnHeaderText.match(COLUMN_ALIGNMENT_REGEX);
    if (m) {
        var alignChar = m[1][1].toLowerCase();
        return columnAlignmentFromChar(alignChar);
    }
    // Default to left alignment
    return ALIGNED_LEFT;
}
exports.columnAlignment = columnAlignment;
/**
 * Maps the original column alignment to an internal alignment
 * @param alignChar Alignment character (l = left, c = center, r = right)
 */
function columnAlignmentFromChar(alignChar) {
    switch (alignChar) {
        case ALIGNED_LEFT: return ALIGNED_LEFT;
        case ALIGNED_CENTER: return ALIGNED_CENTER;
        case ALIGNED_RIGHT: return ALIGNED_RIGHT;
        default: return ALIGNED_LEFT;
    }
}
exports.columnAlignmentFromChar = columnAlignmentFromChar;
/**
 * Calculates the max content length across all rows of the table
 * for the given column index
 * @param rows All rows of the original Excel table
 * @param columnIndex The column index to calculate the length for
 */
function columnWidth(rows, columnIndex) {
    return Math.max.apply(null, rows.map(function (row) {
        return (row[columnIndex] && row[columnIndex].length) || 0;
    }));
}
exports.columnWidth = columnWidth;
/**
 * Takes the raw clipboard content and creates a table-like structure from the data
 * @param data The raw content from the clipboard
 */
function splitIntoRowsAndColumns(data) {
    // Split rows on newline
    var rows = data.split(EXCEL_ROW_DELIMITER_REGEX).map(function (row) {
        // Split columns on tab
        return row.split(EXCEL_COLUMN_DELIMITER);
    });
    return rows;
}
exports.splitIntoRowsAndColumns = splitIntoRowsAndColumns;
/**
 * Replace an intra-cell-newlines
 * @param data The raw content from the Excel via the clipboard
 * @see https://github.com/csholmq/vscode-excel-to-markdown-table/issues/3
 */
function replaceIntraCellNewline(data) {
    let cellReplacer = _ => _.slice(1, -1)
        .replace(EXCEL_DOUBLE_QUOTE_ESCAPED_REGEX, UNESCAPED_DOUBLE_QUOTE)
        .replace(EXCEL_NEWLINE_REGEX, MARKDOWN_NEWLINE);
    return data.replace(EXCEL_NEWLINE_ESCAPED_CELL_REGEX, cellReplacer);
}
exports.replaceIntraCellNewline = replaceIntraCellNewline;
//# sourceMappingURL=excel-markdown-helpers.js.map