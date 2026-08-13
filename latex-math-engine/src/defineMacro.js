// @flow

import {Token} from "./Token";
import type Namespace from "./Namespace";
import type {Mode} from "./types";

/**
 * Provides context to macros defined by functions. Implemented by
 * MacroExpander.
 */
export interface MacroContextInterface {
    mode: Mode;

    /**
     * Object mapping macros to their expansions.
     */
    macros: Namespace<MacroDefinition>;

    /**
     * Returns the topmost token on the stack, without expanding it.
     * Similar in behavior to TeX's `\futurelet`.
     */
    future(): Token;

    /**
     * Remove and return the next unexpanded token.
     */
    popToken(): Token;

    /**
     * Consume all following space tokens, without expansion.
     */
    consumeSpaces(): void;

    /**
     * Expand the next token only once if possible.
     */
    expandOnce(expandableOnly?: boolean): number | boolean;

    /**
     * Expand the next token only once (if possible), and return the resulting
     * top token on the stack (without removing anything from the stack).
     * Similar in behavior to TeX's `\expandafter\futurelet`.
     */
    expandAfterFuture(): Token;

    /**
     * Recursively expand first token, then return first non-expandable token.
     */
    expandNextToken(): Token;

    /**
     * Fully expand the given macro name and return the resulting list of
     * tokens, or return `undefined` if no such macro is defined.
     */
    expandMacro(name: string): Token[] | void;

    /**
     * Fully expand the given macro name and return the result as a string,
     * or return `undefined` if no such macro is defined.
     */
    expandMacroAsText(name: string): string | void;

    /**
     * Fully expand the given token stream and return the resulting list of
     * tokens.  Note that the input tokens are in reverse order, but the
     * output tokens are in forward order.
     */
    expandTokens(tokens: Token[]): Token[];

    /**
     * Consume an argument from the token stream, and return the resulting array
     * of tokens and start/end token.
     */
    consumeArg(delims?: ?string[]): MacroArg;

    /**
     * Consume the specified number of arguments from the token stream,
     * and return the resulting array of arguments.
     */
    consumeArgs(numArgs: number): Token[][];

    /**
     * Determine whether a command is currently "defined" (has some
     * functionality), meaning that it's a macro (in the current group),
     * a function, a symbol, or one of the special commands listed in
     * `implicitCommands`.
     */
    isDefined(name: string): boolean;

    /**
     * Determine whether a command is expandable.
     */
    isExpandable(name: string): boolean;
}

export type MacroArg = {
    tokens: Token[],
    start: Token,
    end: Token
};

/** Macro tokens (in reverse order). */
export type MacroExpansion = {
    tokens: Token[],
    numArgs: number,
    delimiters?: string[][],
    unexpandable?: boolean, // used in \let
};

export type MacroDefinition = string | MacroExpansion |
    (MacroContextInterface => (string | MacroExpansion));
export type MacroMap = {[string]: MacroDefinition};

/**
 * All registered global/built-in macros.
 * `macros.js` exports this same dictionary again and makes it public.
 * `Parser.js` requires this dictionary via `macros.js`.
 */
export const _macros: MacroMap = {};

/*
// This function might one day accept an additional argument and do more things.
export default function defineMacro(name: string, body: MacroDefinition) {
    _macros[name] = body;
}
*/

// What about doing something like this instead
export default function defineMacro(name: string, body) {
    // "\\html@mathml{\\textcircled{c}}{\\char`©}"
    const futureSetting = "mathml";
    const noRelax = true; // This is always true for now

    // Handle the body based on its type
    if (!Array.isArray(body)) {
        _macros[name] = body;
    } else if (body.length > 1) {
        if (futureSetting === "mathml") {
            _macros[name] = body[1];
        } else if (futureSetting === "html") {
            _macros[name] = body[0];
        } else {
            _macros[name] = `\\html@mathml{${body[0]}}{${body[1]}}`;
        }
    }

    // If noRelax is true, we need to modify certain macros
    if (noRelax) {
        // Replace \noexpand with a version that doesn't set treatAsRelax
        if (name === "\\noexpand") {
            _macros[name] = function(context) {
                const t = context.popToken();
                if (context.isExpandable(t.text)) {
                    t.noexpand = true;
                    // Don't set treatAsRelax in noRelax mode
                }
                return {tokens: [t], numArgs: 0};
            };
        }

        // Handle the dots system markers
        if (name === "\\DOTSI" || name === "\\DOTSB" || name === "\\DOTSX") {
            // Define these as empty strings instead of \relax
            _macros[name] = "";
        }

        // Replace \relax with space in spacing commands
        if (name.match(/\\(tmspace|,|:|;|!|thinspace|medspace|thickspace|negthinspace|negmedspace|negthickspace|enspace|enskip|quad|qquad|hspace|@hspace|@hspacer|newline)/)) {
            if (typeof body === "string" && body.includes("\\relax")) {
                // Add a space before and after the replacement to ensure proper spacing between commands
                _macros[name] = body.replace("\\relax", "");
            }
        }
    }
}
