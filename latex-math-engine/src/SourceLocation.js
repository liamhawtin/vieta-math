// @flow
import type {LexerInterface} from "./Token";

/**
 * Lexing or parsing positional information for error reporting.
 * This object is immutable.
 */
export default class SourceLocation {
    // The + prefix indicates that these fields aren't writeable
    +lexer: LexerInterface; // Lexer holding the input string.
    +start: number;         // Start offset, zero-based inclusive.
    +end: number;           // End offset, zero-based exclusive.

    constructor(lexer: LexerInterface, start: number, end: number) {
        this.lexer = lexer;
        this.start = start;
        this.end = end;
    }

    /**
     * Merges two `SourceLocation`s from location providers, given they are
     * provided in order of appearance.
     * - Returns the first one's location if only the first is provided.
     * - Returns a merged range of the first and the last if both are provided
     *   and their lexers match.
     * - Otherwise, returns null.
     */
    static range(
        first?: {loc: ?SourceLocation},
        second?: {loc: ?SourceLocation},
    ): ?SourceLocation {
        if (!second) {
            return first && first.loc;
        } else if (!first || !first.loc || !second.loc ||
                   first.loc.lexer !== second.loc.lexer) {
            return null;
        } else {
            return new SourceLocation(
                first.loc.lexer,
                first.loc.start,
                second.loc.end
            );
        }
    }

    /**
     * Merges an array of `SourceLocation`s, returning the range from the first
     * to the last node.
     * Returns null if the array is empty or contains mismatched lexers.
     */
    static rangeFromArray(
        locations: Array<{loc: ?SourceLocation}>,
    ): ?SourceLocation {
        if (locations.length === 0) {
            return null;
        }
        let firstLoc = locations[0]?.loc;
        let lastLoc = locations[locations.length - 1]?.loc;

        if (!firstLoc || !lastLoc || firstLoc.lexer !== lastLoc.lexer) {
            return null;
        }
        return new SourceLocation(firstLoc.lexer, firstLoc.start, lastLoc.end);
    }

    /**
     * Debug string for inspection purposes.
     */
    toString(): string {
        return `[${this.start}, ${this.end})`;
    }
}
