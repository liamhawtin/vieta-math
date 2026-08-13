import MacroExpander from './MacroExpander';
import Lexer from './Lexer';
import { Token } from './Token';
import Settings from './Settings';
import ParseError from './ParseError';
import Parser from './Parser';
import { noLimitOps, limitOps } from "./data/mappings.js";

function toPt({ number, unit }) {
    if (typeof number !== 'number' || typeof unit !== 'string') return null;

    const val = number;
    const u = unit.toLowerCase();

    const emInPt = 10;
    const exInPt = 0.43 * emInPt;

    const ptFactors = {
        pt: 1,
        pc: 12,
        bp: 72 / 72.27,
        in: 72.27,
        cm: 72.27 / 2.54,
        mm: 72.27 / 25.4,
        dd: 1238 / 1157,
        cc: 12 * (1238 / 1157),
        sp: 1 / 65536,
        em: emInPt,
        ex: exInPt,
        mu: emInPt / 18,
    };

    if (!(u in ptFactors)) return null;
    return val * ptFactors[u];
}

function toMu(length) {
    const pt = toPt(length);
    if (pt == null) return null;
    const muPerPt = 18 / 10; // 18mu per em, 10pt per em
    const result = pt * muPerPt;
    return Math.round(result * 10) / 10;
}

function toEm(length) {
    const pt = toPt(length);
    if (pt == null) return null;
    const result = pt / 10;
    return Math.round(result * 100) / 100;
}

const D = 0, Dc = 1, T = 2, Tc = 3, S = 4, Sc = 5, SS = 6, SSc = 7;
const sup = [S, Sc, S, Sc, SS, SSc, SS, SSc];
const sub = [Sc, Sc, Sc, Sc, SSc, SSc, SSc, SSc];
const styleTypes = { 0: "display", 1: "text", 2: "script", 3: "scriptscript" };

const MATHFONT = /\\(?:mathrm|mathit|mathbf|boldsymbol|mathsf|mathtt|mathbb|mathcal|mathfrak)\b/;

const POS_CHAR = 'ꙮ';

class LatexNormalizer {
    constructor(input) {
        this.rawInput = input;
        this.settings = new Settings({ maxExpand: 1000, keepWhiteSpace: true, displayMode: true });

        this._expandedString = null;
        this._collapsedExpression = null;
        this._finalOutput = null;
    }

    normalize() {
        let tex = this.rawInput;

        tex = this._sanitizedParseString(tex)
        if (typeof tex !== "string" || tex.length === 0) return "";

        tex = this._normalizeEnvironments(tex);
        tex = this._normalizeRowGapUnits(tex);
        tex = this._expandMacros(tex);
        tex = this._sanitizeTexString(tex);
        tex = this._removeControlPrimitives(tex);
        tex = this._normalizeLeftRightDelimitersSimple(tex);
        tex = this._removeEmptyLeftRightNodes(tex);
        tex = this._normalizeTextCommands(tex);
        tex = this._collapseMathChoices(tex);
        tex = this._normalizeRuleUnits(tex);
        const kernDetails = this._findKernDetails(tex);
        tex = this._normalizeKerns(tex, kernDetails);
        tex = this._dissolveDegeneratePhantoms(tex);
        tex = this._stripRedundantBraces(tex);
        const ordGroupTargets = this._findOrdGroups(tex);
        tex = this._insertCurlyBraces(tex, ordGroupTargets);
        tex = this._mergePrimes(tex);
        tex = this._ensureOpsHasLimits(tex);
        tex = this._stripRedudantFonts(tex);
        tex = this._splitMathFonts(tex);
        tex = this._cleanMathString(tex);

        // Optional debug snapshot
        this._expandedString = this._expandMacros(this.rawInput);
        this._collapsedExpression = tex;
        this._finalOutput = tex;

        return tex;
    }

    // Public optional debug getter
    get debug() {
        return {
            raw: this.rawInput,
            macroExpanded: this._expandedString,
            collapsedMathChoices: this._collapsedExpression,
            finalOutput: this._finalOutput
        };
    }

    _sanitizedParseString(str) {

        for (let i = 0; i < 100; i++) {
            try {
                new Parser(str, this.settings).parse();
                return str;
            } catch (e) {
                if (e.name !== "ParseError" || typeof e.position !== "number") return false;

                const removeLen = e.length || 1;
                const nextStr = str.slice(0, e.position) + str.slice(e.position + removeLen);

                // If string didn't change or became empty, we can't recover further
                if (nextStr === str || nextStr.length === 0) return false;

                str = nextStr;
            }
        }
        return false;
    }

    _sanitizeTexString(tex) {
        return tex.replace(/\\(left|right)\s+/g, '\\$1');
    }

    _normalizeEnvironments(input) {
        let result = input;

        // --------------------------
        // Helper: find balanced block
        // --------------------------
        function findBalancedEnv(src, env, fromIndex = 0) {
            const beginRe = new RegExp(`\\\\begin\\s*{\\s*${env}\\s*}`, "g");
            const endRe   = new RegExp(`\\\\end\\s*{\\s*${env}\\s*}`, "g");

            beginRe.lastIndex = fromIndex;
            const beginMatch = beginRe.exec(src);
            if (!beginMatch) return null;

            let depth = 1;
            let searchIdx = beginRe.lastIndex;

            while (depth > 0) {
                beginRe.lastIndex = searchIdx;
                endRe.lastIndex = searchIdx;
                const nextBegin = beginRe.exec(src);
                const nextEnd   = endRe.exec(src);

                if (!nextEnd) return null; // no matching end

                if (nextBegin && nextBegin.index < nextEnd.index) {
                    depth++;
                    searchIdx = nextBegin.index + nextBegin[0].length;
                } else {
                    depth--;
                    searchIdx = nextEnd.index + nextEnd[0].length;
                    if (depth === 0) {
                        return {
                            beginStart: beginMatch.index,
                            beginEnd: beginMatch.index + beginMatch[0].length,
                            endStart: nextEnd.index,
                            endEnd: nextEnd.index + nextEnd[0].length,
                        };
                    }
                }
            }
            return null;
        }

        // --------------------------
        // Helper: replace environment blocks
        // --------------------------
        function replaceEnvIteratively(env, replacer) {
            while (true) {
                const match = findBalancedEnv(result, env);
                if (!match) break;

                const fullBlock = result.slice(match.beginStart, match.endEnd);
                const inner     = result.slice(match.beginEnd,   match.endStart);

                const replacement = replacer(fullBlock, inner);
                if (!replacement) break;

                result = result.slice(0, match.beginStart) + replacement + result.slice(match.endEnd);
            }
        }

        // --------------------------
        // Normalize cases
        // --------------------------
        replaceEnvIteratively("cases", (fullBlock) => {
            const tree = this._parseToTree(fullBlock);
            const arrayNode = (
                Array.isArray(tree) &&
                tree[0]?.type === "leftright" &&
                Array.isArray(tree[0].body) &&
                tree[0].body.find((n) => n.type === "array")
            );
            if (!arrayNode) return null;

            const rows = arrayNode.body.filter(Array.isArray);
            const numCols = Math.max(...rows.map((r) => r.length));
            const alignment = "l".repeat(numCols);

            const rowStrings = rows.map((row, i) => {
                const cells = row.map((cell) => {
                    if (cell?.loc) return fullBlock.slice(cell.loc.start, cell.loc.end).trim();
                    return "";
                });

                let rowTex = cells.join(" & ");

                const gap = arrayNode.rowGaps?.[i];
                if (i < rows.length - 1) {
                    // --- not final row ---
                    if (gap && gap.unit === "em" && gap.number > 0) {
                        const total = gap.number + 0.25;
                        rowTex += ` \\\\[${total}${gap.unit}]`;
                    } else {
                        rowTex += " \\\\[0.25em]";
                    }
                } else {
                    // --- final row ---
                    if (gap && gap.unit === "em" && gap.number > 0) {
                        rowTex += ` \\\\[${gap.number}${gap.unit}]`;
                    }
                    // else → no spacing
                }

                return rowTex;
            });

            const joined = rowStrings.join("");

            //return `\\left. \\middle\\{\\mkern{-10mu}\\begin{array}{${alignment}}${joined}\\end{array} \\right.`;
            return `\\left. \\middle\\{\\begin{array}{${alignment}}${joined}\\end{array} \\right.`;
        });

        // --------------------------
        // Strip equation/equation*
        // --------------------------
        result = result.replace(/\\begin\s*{\s*equation\*?\s*}/gi, "");
        result = result.replace(/\\end\s*{\s*equation\*?\s*}/gi, "");

        // --------------------------
        // Normalize gather/gather*
        // --------------------------
        result = result.replace(/\\begin\s*{\s*gather\*?\s*}/gi, "\\begin{array}{}");
        result = result.replace(/\\end\s*{\s*gather\*?\s*}/gi, "\\end{array}");

        // --------------------------
        // split / align / aligned → array
        // --------------------------
        result = result.replace(/\\begin\s*{(split|align|aligned)\s*}/gi, "\\begin{array}{}");
        result = result.replace(/\\end\s*{(split|align|aligned)\s*}/gi, "\\end{array}");

        // --------------------------
        // Matrix-like environments
        // --------------------------
        /*
        const MATRIX_ENVIRONMENTS = {
            matrix:  { left: "", right: "", prefix: "", suffix: "" },
            pmatrix: { left: "\\left( \\mkern{-10mu}", right: "\\mkern{-10mu} \\right)", prefix: "", suffix: "" },
            bmatrix: { left: "\\left[ \\mkern{-10mu}", right: "\\mkern{-10mu} \\right]", prefix: "", suffix: "" },
            Bmatrix:{ left: "\\left\\{ \\mkern{-10mu}", right: "\\mkern{-10mu} \\right\\}", prefix: "", suffix: "" },
            vmatrix:{ left: "\\left| \\mkern{-10mu}", right: "\\mkern{-10mu} \\right|", prefix: "", suffix: "" },
            Vmatrix:{ left: "\\left\\| \\mkern{-10mu}", right: "\\mkern{-10mu} \\right\\|", prefix: "", suffix: "" },
        };
        */
        const MATRIX_ENVIRONMENTS = {
            matrix:  { left: "", right: "", prefix: "", suffix: "" },
            pmatrix: { left: "\\left(", right: "\\right)", prefix: "", suffix: "" },
            bmatrix: { left: "\\left[", right: "\\right]", prefix: "", suffix: "" },
            Bmatrix:{ left: "\\left\\{", right: "\\right\\}", prefix: "", suffix: "" },
            vmatrix:{ left: "\\left|", right: "\\right|", prefix: "", suffix: "" },
            Vmatrix:{ left: "\\left\\|", right: "\\right\\|", prefix: "", suffix: "" },
        };

        for (const [env, { left, right, prefix, suffix }] of Object.entries(MATRIX_ENVIRONMENTS)) {
            replaceEnvIteratively(env, (fullBlock, inner) => {
                const tree = this._parseToTree(fullBlock);
                let arrayNode = null;
                if (Array.isArray(tree)) {
                    if (tree[0]?.type === "leftright") {
                        arrayNode = tree[0].body.find((n) => n.type === "array");
                    }
                    if (!arrayNode) arrayNode = tree.find((n) => n.type === "array");
                }

                let numCols = 0;
                if (arrayNode?.body) {
                    const rows = arrayNode.body.filter(Array.isArray);
                    numCols = Math.max(...rows.map((r) => r.length));
                }
                const alignment = "c".repeat(Math.max(numCols, 1));
                return `${left}${prefix}\\begin{array}{${alignment}}${inner}\\end{array}${suffix}${right}`;
            });
        }

        return result.trim();
    }

    _normalizeRowGapUnits(tex) {
        const re = /\\\\\[\s*([^\]]+)\s*\]/g;
        const matches = [];
        let match;

        while ((match = re.exec(tex)) !== null) {
            const full = match[0];
            const inner = match[1];

            const numUnitMatch = inner.match(/^\s*([0-9]*\.?[0-9]+)\s*([a-zA-Z]+)\s*$/);
            if (!numUnitMatch) continue;

            const num = parseFloat(numUnitMatch[1]);
            const unit = numUnitMatch[2].toLowerCase();

            if (unit === "em") continue; // already good

            // Try conversion
            const emVal = toEm({ number: num, unit });
            if (emVal == null) continue; // unknown unit

            const replacement = `\\\\[${emVal}em]`;

            matches.push({ start: match.index, end: match.index + full.length, replacement });
        }

        // Replace right-to-left
        matches.sort((a, b) => b.start - a.start);
        let result = tex;
        for (const { start, end, replacement } of matches) {
            result = result.slice(0, start) + replacement + result.slice(end);
        }

        return result;
    }

    _expandMacros(input) {
        const expander = new MacroExpander(input, this.settings, "math");
        const expandedTokens = [];

        try {
            while (true) {
                const token = expander.expandNextToken();
                if (token.text === "EOF") break;
                expandedTokens.push(token);
            }
        } catch (error) {
            if (error instanceof ParseError) {
                console.error("Error expanding macros:", error.message);
                return "";
            }
            throw error;
        }

        return expandedTokens.map(token => token.text).join('');
    }

    _removeControlPrimitives(texString) {
        const primitives = ['\\\\nobreak', '\\\\relax'];
        const regex = new RegExp(`(?:${primitives.join('|')})\\b`, 'g');
        return texString.replace(regex, '');
    }

    _parseToTree(str) {
        return new Parser(str, this.settings).parse();
    }

    _ensureOpsHasLimits(tex) {
        const ast = this._parseToTree(tex);
        const edits = [];
        const visited = new WeakSet();

        const walk = (node, parent = null) => {
            if (!node || typeof node !== "object" || visited.has(node)) return;
            visited.add(node);

            if (node.type === "op") {
                // CASE 1: no supsub parent
                if (!parent || parent.type !== "supsub") {
                    edits.push({
                        start: node.loc.end,
                        end: node.loc.end,
                        text: "_{}^{}"
                    });
                }
                // CASE 2: supsub parent, check missing pieces
                else {
                    const baseEnd = node.loc.end;

                    if (!parent.sub && !parent.sup) {
                        edits.push({
                            start: baseEnd,
                            end: baseEnd,
                            text: "_{}^{}"
                        });
                    } else if (!parent.sub) {
                        edits.push({
                            start: baseEnd,
                            end: baseEnd,
                            text: "_{}"
                        });
                    } else if (!parent.sup) {
                        edits.push({
                            start: parent.sub.loc.end,
                            end: parent.sub.loc.end,
                            text: "^{}"
                        });
                    }
                }
            }

            for (const k in node) {
                const v = node[k];
                if (Array.isArray(v)) v.forEach(n => walk(n, node));
                else if (typeof v === "object") walk(v, node);
            }
        };

        walk(ast);

        // Apply right-to-left
        edits.sort((a, b) => b.start - a.start);
        for (const e of edits) {
            tex = tex.slice(0, e.start) + e.text + tex.slice(e.end);
        }

        return tex;
    }

    _collapseMathChoices(texString) {
        const initStyle = D;

        while (true) {

            if (!texString.includes('\\mathchoice')) break;

            const tree = this._parseToTree(texString);
            const match = findFirstMathchoice(tree);

            if (!match) break;

            const { node, path } = match;
            const style = path.reduce((acc, step) => step === 'SUP' ? sup[acc] : sub[acc], initStyle);
            const styleKey = Math.floor(style / 2);
            const selected = node[styleTypes[styleKey]];

            if (!Array.isArray(selected) || selected.length === 0) break;

            const selectionBounds = selected
                .map(n => n?.loc)
                .filter(loc => loc?.start != null && loc?.end != null);

            if (selectionBounds.length === 0) break;

            const repStart = Math.min(...selectionBounds.map(l => l.start));
            const repEnd = Math.max(...selectionBounds.map(l => l.end));
            const replacementText = texString.slice(repStart, repEnd);

            const choiceStart = node.loc.start;
            const choiceEnd = node.loc.end;

            texString = texString.slice(0, choiceStart) + replacementText + texString.slice(choiceEnd);
        }

        return texString;

        function findFirstMathchoice(node, path = [], visited = new WeakSet()) {
            if (!node || typeof node !== 'object' || visited.has(node)) return null;
            visited.add(node);

            if (node.type === 'mathchoice') return { node, path };

            if (node.type === 'supsub') {
                const fromSup = node.sup && findFirstMathchoice(node.sup, [...path, 'SUP'], visited);
                if (fromSup) return fromSup;

                const fromSub = node.sub && findFirstMathchoice(node.sub, [...path, 'SUB'], visited);
                if (fromSub) return fromSub;

                const fromBase = node.base && findFirstMathchoice(node.base, path, visited);
                if (fromBase) return fromBase;
            }

            for (const key in node) {
                const val = node[key];
                if (Array.isArray(val)) {
                    for (const child of val) {
                        const found = findFirstMathchoice(child, path, visited);
                        if (found) return found;
                    }
                } else {
                    const found = findFirstMathchoice(val, path, visited);
                    if (found) return found;
                }
            }

            return null;
        }
    }

    _findKernDetails(expandedString) {
        const data = this._parseToTree(expandedString);
        const groups = [];
        const visited = new WeakSet();

        const extractKern = (node) => {
            let raw = expandedString.slice(node.loc.start, node.loc.end);
            let end = node.loc.end;
            while (/\s/.test(expandedString[end - 1])) {
                end--;
                raw = raw.slice(0, -1);
            }

            const match = raw.match(/\\[a-zA-Z@*]+/);
            const command = match?.[0];
            if (!command) return null;

            let offset = command.length;
            while (/\s/.test(raw[offset])) offset++;
            const sizeStr = raw.slice(offset);
            const isWrappedInBraces = sizeStr.startsWith('{') && sizeStr.endsWith('}');

            return {
                fullLoc: { start: node.loc.start, end },
                cmdLoc: { start: node.loc.start, end: node.loc.start + command.length },
                sizeLoc: { start: node.loc.start + offset, end },
                command,
                value: sizeStr,
                isWrappedInBraces,
                node
            };
        };

        const recursive = (node) => {
            if (!node || typeof node !== 'object' || visited.has(node)) return;
            visited.add(node);

            if (Array.isArray(node)) {
                let group = null;
                let sawPosChar = false;

                for (const child of node) {
                    const isKern = child?.type === 'kern' && child.loc?.start != null && child.loc?.end != null;
                    const isGlue = child?.type === 'textord' && child.text === POS_CHAR;

                    if (isKern) {
                        const kern = extractKern(child);
                        if (!kern) continue;

                        if (!group) {
                            group = {
                                start: kern.fullLoc.start,
                                end: kern.fullLoc.end,
                                kerns: [kern],
                                hadPosChar: sawPosChar,
                            };
                            groups.push(group);
                        } else {
                            group.kerns.push(kern);
                            group.end = kern.fullLoc.end;
                            if (sawPosChar) group.hadPosChar = true;
                        }

                        // important: we do NOT reset sawPosChar here
                    } else if (isGlue) {
                        sawPosChar = true;
                    } else {
                        group = null;
                        sawPosChar = false;
                        recursive(child);
                    }
                }
            }
            else {
                for (const key in node) recursive(node[key]);
            }
        };

        recursive(data);
        return groups;
    }


    _normalizeKerns(str, kernGroups) {
        const sorted = [...kernGroups].sort((a, b) => b.start - a.start);

        for (const group of sorted) {
            const totalMu = group.kerns.reduce((sum, k) => {
                const mu = toMu(k.node.dimension);
                return Number.isFinite(mu) ? sum + mu : sum;
            }, 0);

            let replacement = "";
            // dont't let mkern value be negative
            if (totalMu > 0) {
                replacement = `\\mkern{${totalMu}mu}`;
                if (group.hadPosChar) {
                    replacement += POS_CHAR;
                }
            }

            str = str.slice(0, group.start) + replacement + str.slice(group.end);
        }

        return str;
    }

    _normalizeRuleUnits(texString) {
        if (!/\\rule\b/.test(texString)) return texString;

        const tree = this._parseToTree(texString);

        const edits = [];
        const visited = new WeakSet();

        const processNode = (node) => {
            if (!node || typeof node !== 'object' || visited.has(node)) return;
                visited.add(node);

                if (node.type === 'rule' && node.loc) {
                const { shift, width, height } = node;

                // Convert each dimension to mu using existing toMu function
                const shiftMu = shift ? toMu(shift) : 0;
                const widthMu = width ? toMu(width) : 0;
                const heightMu = height ? toMu(height) : 0;

                if (shiftMu !== null && widthMu !== null && heightMu !== null) {
                    let replacement;

                    // Transform to mkern if no shift and no height, only width
                    if (shiftMu === 0 && heightMu === 0 && widthMu !== 0) {
                        replacement = `\\mkern{${widthMu}mu}`;
                    } else {
                        // Generate new rule command with mu units
                        const shiftPart = shiftMu !== 0 ? `[${shiftMu}mu]` : '';
                        replacement = `\\rule${shiftPart}{${widthMu}mu}{${heightMu}mu}`;
                    }

                    edits.push({
                    start: node.loc.start,
                    end: node.loc.end,
                    replacement: replacement
                    });
                }
            }

            // Recursively process all properties
            for (const key in node) {
            const val = node[key];
            if (Array.isArray(val)) {
                val.forEach(processNode);
            } else if (typeof val === 'object') {
                processNode(val);
            }
            }
        };

        processNode(tree);

        // Apply edits in reverse order to avoid index shifting
        edits.sort((a, b) => b.start - a.start);

        let result = texString;
        for (const { start, end, replacement } of edits) {
            result = result.slice(0, start) + replacement + result.slice(end);
        }

        return result;
    }

    _dissolveDegeneratePhantoms(texString) {
        if (!/\\phantom\b/.test(texString) || !/(\\rule\b|\\mkern\b)/.test(texString)) {
            return texString;
        }

        const tree = this._parseToTree(texString);
        const edits = [];

        const isNonPositive = dim =>
            !dim || typeof dim.number !== 'number' || dim.number <= 0;

        const isOnlyPhantomTarget = (bodyArr) => {
            if (!Array.isArray(bodyArr) || bodyArr.length === 0) return false;
            const nonPosChar = bodyArr.filter(
                c => !(c?.type === 'textord' && c.text === POS_CHAR)
            );
            return nonPosChar.length === 1;
        };

        const getMainChild = (bodyArr) =>
            bodyArr.find(c => !(c?.type === 'textord' && c.text === POS_CHAR));

        const visit = (node) => {
            if (node?.type === 'phantom' && isOnlyPhantomTarget(node.body)) {
                const mainOrd = getMainChild(node.body);

                if (mainOrd?.type === 'ordgroup' && isOnlyPhantomTarget(mainOrd.body)) {
                    const c = getMainChild(mainOrd.body);

                    if (c?.loc && (
                        (c.type === 'rule' && (isNonPositive(c.width) || isNonPositive(c.height))) ||
                        (c.type === 'kern')
                    )) {
                        // Instead of cutting out POS_CHAR, keep the whole ordgroup contents
                        edits.push({
                            start: node.loc.start,
                            end: mainOrd.loc.start+1
                        });
                        edits.push({
                            start: mainOrd.loc.end-1,
                            end: node.loc.end
                        });
                    }
                }
            }
            for (const k in node) {
                const v = node[k];
                if (Array.isArray(v)) v.forEach(visit);
                else if (typeof v === 'object') visit(v);
            }
        };

        visit(tree);

        if (!edits.length) return texString;

        edits.sort((a, b) => b.start - a.start);
        for (const { start, end } of edits) {
            texString = texString.slice(0, start) + texString.slice(end);
        }
        return texString;
    }

    _findOrdGroups(expandedString) {
        const data = this._parseToTree(expandedString);
        const found = [];
        const visited = new WeakSet();
        const typeExceptions = new Set(['op', 'operatorname', 'horizBrace']);

        const EXCLUSION_RULES = [
            { parentType: 'supsub', childKey: 'base' }
        ];

        const isWrapped = (start, end) =>
            start !== end &&
            ['[', '{'].includes(expandedString[start]) &&
            [']', '}'].includes(expandedString[end - 1]);

        const tryAddRange = (start, end, node) => {
            if (start == null || end == null) return;
            if (start === end || !isWrapped(start, end)) {
                found.push({ start, end, node });
            }
        };

        const recursive = (node, parent = null, parentKey = null, parentIsTyped = false) => {
            if (!node || typeof node !== 'object' || visited.has(node)) return;
            visited.add(node);

            const hasType = typeof node.type === 'string';
            const isAllowed = hasType && !typeExceptions.has(node.type);

            const isExcluded = EXCLUSION_RULES.some(rule => {
                if (parent?.type === rule.parentType && parentKey === rule.childKey) {
                    // Bypass exclusion
                    if (node.shouldWrap) {
                        return false;
                    }
                    return true;
                }
                return false;
            });

            if (
                (isAllowed && parentIsTyped && !isExcluded && node.loc) ||
                (
                    node.loc &&
                    Number.isFinite(node.loc.start) &&
                    Number.isFinite(node.loc.end) &&
                    node.loc.start === node.loc.end
                )
            ) {
                tryAddRange(node.loc.start, node.loc.end, node);
            }

            // Special case: array cells
            if (node.type === 'array') {
                for (const row of node.body) {
                    for (const cell of row) {
                        if (cell?.type === 'ordgroup' && !visited.has(cell)) {
                            visited.add(cell);
                            const loc = cell.loc;
                            if (loc?.start != null && loc?.end != null) {
                                tryAddRange(loc.start, loc.end, cell);
                            } else if (Array.isArray(cell.body)) {
                                const locs = cell.body
                                    .map(n => n?.loc)
                                    .filter(loc => loc?.start != null && loc?.end != null);

                                if (locs.length > 0) {
                                    const start = Math.min(...locs.map(l => l.start));
                                    const end = Math.max(...locs.map(l => l.end));
                                    tryAddRange(start, end, cell);
                                }
                            }
                            for (const key in cell) {
                                const val = cell[key];
                                if (Array.isArray(val)) {
                                    val.forEach(child => recursive(child, cell, key, false));
                                } else if (typeof val === 'object') {
                                    recursive(val, cell, key, hasType);
                                }
                            }
                        }
                    }
                }
            }

            // Recurse into children
            for (const key in node) {
                const val = node[key];
                if (Array.isArray(val)) {
                    val.forEach(child => recursive(child, node, key, false));
                } else if (typeof val === 'object') {
                    recursive(val, node, key, hasType);
                }
            }
        };

        recursive(data);
        return found;
    }

    _insertCurlyBraces(str, targets) {
        const insertions = [];

        for (const { start, end } of targets) {
            if (start === end) {
                // Insert {} directly at that position
                insertions.push({ pos: start, type: 'both' });
            } else {
                insertions.push({ pos: start, type: 'start' });
                insertions.push({ pos: end, type: 'end' });
            }
        }

        // Sort so that we insert from the end, avoiding index shifts
        insertions.sort((a, b) => b.pos - a.pos || (
            a.type === 'start' ? -1 :
            a.type === 'end' ? 1 :
            0
        ));

        for (const { pos, type } of insertions) {
            if (type === 'start') {
                str = str.slice(0, pos) + '{' + str.slice(pos);
            } else if (type === 'end') {
                str = str.slice(0, pos) + '}' + str.slice(pos);
            } else if (type === 'both') {
                str = str.slice(0, pos) + '{}' + str.slice(pos);
            }
        }

        return str;
    }

    _stripRedundantBraces(texString) {
        const tree = this._parseToTree(texString);
        const indices = new Set();

        const walk = (node, parent, parentKey) => {
            if (!node || typeof node !== 'object') return;

            const isTopLevelOrdgroup = !parent;
            const isChildOfOrdgroup = parent?.type === 'ordgroup';
            const isSupsubBase = parent?.type === 'supsub' && parentKey === 'base';
            const isNonEmpty = Array.isArray(node.body) && node.body.length > 0;
            const isStylingOnlyOrdgroup =
                node.type === 'ordgroup' &&
                Array.isArray(node.body) &&
                node.body.length === 1 &&
                node.body[0]?.type === 'styling';

            const isSafeToRemove =
                !isStylingOnlyOrdgroup &&
                (isTopLevelOrdgroup || isChildOfOrdgroup || (isSupsubBase && isNonEmpty));

            if (
                node.type === 'ordgroup' &&
                node.loc &&
                texString.slice(node.loc.start, node.loc.end).startsWith('{') &&
                texString.slice(node.loc.start, node.loc.end).endsWith('}') &&
                isSafeToRemove &&
                node.disableStrip !== true &&
                node.body?.[0]?.wasInfix !== true
            ) {
                indices.add(node.loc.start);
                indices.add(node.loc.end - 1);
            }

            for (const key in node) {
                const val = node[key];
                if (Array.isArray(val)) val.forEach(child => walk(child, node, key));
                else if (typeof val === 'object') walk(val, node, key);
            }
        };

        if (Array.isArray(tree)) {
            tree.forEach(node => walk(node, null, null));
        } else {
            walk(tree, null, null);
        }

        const sorted = Array.from(indices).sort((a, b) => b - a);
        let result = texString;
        for (const i of sorted) {
            const before = result.slice(0, i);
            const after = result.slice(i + 1);
            const trimmedBefore = before.trimEnd();
            const match = trimmedBefore.match(/\\[A-Za-z]+$/);
            if (match) {
                result = before + " " + after;
                continue;
            }
            result = before + after;
        }

        return result;
    }

    _normalizeLeftRightDelimitersSimple(str) {
        return str.replace(
            /\\(left|right)\s*(\.\s*|\\[a-zA-Z]+|\\.|[()[\]{}|<>])/g,
            (full, type, delim) => {
            // Skip neutral delimiters
            if (delim.trim() === '.' || delim.trim() === '\\.') return full;
            return type === 'left'
                ? `\\left. \\middle${delim}`
                : `\\middle${delim} \\right.`;
            }
        );
    }

    _removeEmptyLeftRightNodes(texString) {
        if (!/\\left(?![a-zA-Z])/.test(texString)) return texString;

        const tree = this._parseToTree(texString);
        const edits = [];
        const visited = new WeakSet();

        const STYLE_RE = /^\\(?:textstyle|displaystyle|scriptstyle|scriptscriptstyle)\b/;

        const walk = (node) => {
            if (!node || typeof node !== 'object' || visited.has(node)) return;
            visited.add(node);

            if (node.type === 'leftright' && node.leftLoc && node.rightLoc) {
                const hasMiddle = (node.body || []).some(n => n.type === 'middle');
                if (!hasMiddle) {
                    const afterLeft = texString.slice(node.leftLoc.end).trimStart();
                    if (!STYLE_RE.test(afterLeft)) {
                        edits.push({ start: node.leftLoc.start, end: node.leftLoc.end });
                        edits.push({ start: node.rightLoc.start, end: node.rightLoc.end });
                    }
                }
            }

            for (const key in node) {
                const val = node[key];
                if (Array.isArray(val)) val.forEach(walk);
                else if (typeof val === 'object') walk(val);
            }
        };

        walk(tree);

        // Sort edits right-to-left to avoid index shifting
        edits.sort((a, b) => b.start - a.start);

        for (const { start, end, replacement = '' } of edits) {
            texString = texString.slice(0, start) + replacement + texString.slice(end);
        }

        return texString;
    }

    _mergePrimes(tex) {
        if (!/(\^\{?\\prime)+/.test(tex)) return tex;

        const tree = this._parseToTree(tex);
        const visited = new WeakSet();
        const replacements = [];

        const isPosChar = n => n?.type === 'textord' && n.text === POS_CHAR;
        const isPrimes = sup => {
            const body = sup?.type === 'ordgroup' ? sup.body : [sup];
            return body.every(n => n?.type === 'textord' && (n?.text === '\\prime' || n?.text === POS_CHAR));
        };
        const isEmptyBase = base =>
            !base || (base.type === 'ordgroup' && (base.body ?? []).every(isPosChar));
        const hasPosChar = node => {
            const check = n => isPosChar(n) || (n?.type === 'ordgroup' && (n.body ?? []).some(isPosChar));
            return check(node.base) || check(node.sup);
        };

        const processList = nodes => {
            for (let i = 0; i < nodes.length; i++) {
                const group = [];
                let j = i, foundPosChar = false;

                while (j < nodes.length) {
                    const curr = nodes[j], isFirst = j === i;
                    if (curr?.type !== 'supsub' || !isPrimes(curr.sup) || (!isFirst && curr.sub)) break;
                    if (!isFirst && !isEmptyBase(curr.base)) break;
                    if (hasPosChar(curr)) foundPosChar = true;
                    group.push(curr);
                    j++;
                }
                if (group.length < 2) continue;

                const total = group.reduce((n, node) => {
                    const body = node.sup.type === 'ordgroup' ? node.sup.body : [node.sup];
                    return n + body.filter(t => t.type === 'textord' && t.text === '\\prime').length;
                }, 0);

                const [first, ...rest] = group;
                rest.forEach(n => {
                    if (Number.isFinite(n?.loc?.start) && Number.isFinite(n?.loc?.end)) {
                        replacements.push({
                            start: n.loc.start - 1,
                            end: n.loc.end + 1,
                            text: ''
                        });
                    }
                });
                replacements.push({
                    start: first.sup.loc.start,
                    end: first.sup.loc.end,
                    text: '\\prime'.repeat(total) + (foundPosChar ? POS_CHAR : ''),
                });

                i = j - 1;
            }
        };

        const walk = node => {
            if (!node || typeof node !== 'object' || visited.has(node)) return;
            visited.add(node);

            if (Array.isArray(node)) {
                processList(node); // merge primes in this array
                node.forEach(walk); // recurse deeper
            } else {
                for (const key in node) {
                    const val = node[key];
                    if (Array.isArray(val)) {
                        processList(val);
                        val.forEach(walk);
                    } else if (typeof val === 'object') {
                        walk(val);
                    }
                }
            }
        };

        walk(tree);

        replacements.sort((a, b) => b.start - a.start)
            .forEach(({ start, end, text }) => { tex = tex.slice(0, start + 1) + text + tex.slice(end - 1); });

        return tex;
    }

    _stripRedudantFonts(tex) {
        const regex = /\\(?:mathrm|mathit)\s*\{([^}]*)\}/g;
        const replacements = [];

        for (let m; (m = regex.exec(tex)); ) {
            const [full, arg] = m;

            const isDigit = /^[0-9]$/.test(arg);
            const isLetter = /^[A-Za-z]$/.test(arg);
            const isCommand = /^\\[a-zA-Z]+$/.test(arg);

            if (!(isDigit || isLetter || isCommand)) continue;

            const fullStart = m.index, fullEnd = fullStart + full.length;
            const argStart = fullStart + full.indexOf("{") + 1;
            const argEnd = argStart + arg.length;

            const tree = this._parseToTree(arg);
            if (!tree || tree.length !== 1) continue;
            const node = tree[0];

            // Redundancy checks
            if (
            (/^[0-9]$/.test(arg) && /\\mathrm/.test(full)) ||                       // digits
            (/^[A-Za-z]$/.test(arg) && /\\mathit/.test(full)) ||                    // single letters
            (/^\\[a-zA-Z]+$/.test(arg) &&                                           // simple commands
                ((node?.type === "textord" && /\\mathrm/.test(full)) ||
                (node?.type === "mathord" && /\\mathit/.test(full))))
            ) {
            replacements.push({ fullStart, fullEnd, argStart, argEnd });
            }
        }

        // Apply replacements right to left (so indices don’t shift)
        replacements.sort((a, b) => b.fullStart - a.fullStart);
        for (const r of replacements) {
            tex = tex.slice(0, r.fullStart) + tex.slice(r.argStart, r.argEnd) + tex.slice(r.fullEnd);
        }

        return tex;
    }

    _normalizeTextCommands(texString) {
        const tree = this._parseToTree(texString);
        const transformations = [];
        const visited = new WeakSet();

        const processNode = (node) => {
            if (!node || typeof node !== 'object' || visited.has(node)) return;
            visited.add(node);

            // Process text nodes
            if (node.type === 'text' && node.loc) {
                const { start, end } = node.loc;
                const originalText = texString.slice(start, end);

                let newText = originalText;

                // Apply transformation rules
                if (node.mode === 'text') {
                    if (node.font === '\\text') {
                        // Dissolve \text in text mode - extract content preserving spaces
                        const match = originalText.match(/\\text\s*\{(.*)\}$/s);
                        newText = match ? match[1] : originalText;
                    }
                } else if (node.mode === 'math' && node.font !== '\\text') {
                    // Wrap non-\text fonts in math mode
                    newText = `\\text{${originalText}}`;
                }

                if (newText !== originalText) {
                    transformations.push({ start, end, newText });
                }
            }

            // Recursively process all properties
            for (const key in node) {
                const val = node[key];
                if (Array.isArray(val)) {
                    val.forEach(processNode);
                } else if (typeof val === 'object') {
                    processNode(val);
                }
            }
        };

        processNode(tree);

        // Apply transformations in reverse order to avoid index shifting
        transformations.sort((a, b) => b.start - a.start);

        let result = texString;
        for (const { start, end, newText } of transformations) {
            result = result.slice(0, start) + newText + result.slice(end);
        }

        return result;
    }

    _buildModeMask(ast, length) {
        const mask = new Uint8Array(length); // 0 = math, 1 = text
        const visited = new WeakSet();

        function fill1(s, e) { for (let i = s; i < e; i++) mask[i] = 1; }

        function walk(node) {
            if (!node || typeof node !== 'object' || visited.has(node)) return;
            visited.add(node);

            // Mark ONLY literal text glyphs in text mode
            if (
                typeof node.text === 'string' &&
                node.mode === 'text' &&
                node.loc && Number.isFinite(node.loc.start) && Number.isFinite(node.loc.end)
            ) {
                fill1(node.loc.start, node.loc.end);
            }

            // Recurse
            for (const k in node) {
                const v = node[k];
                if (Array.isArray(v)) v.forEach(walk);
                else if (typeof v === 'object') walk(v);
            }
        }

        walk(ast);
        return mask;
    }

    _stripFontsWithMacros(piece) {
        // Math-mode font macros only
        const tempMacros = {
            "\\mathrm": "#1",
            "\\mathit": "#1",
            "\\mathbf": "#1",
            "\\boldsymbol": "#1",
            "\\mathsf": "#1",
            "\\mathtt": "#1",
            "\\mathbb":  "#1",
            "\\mathfrak":"#1",
            "\\mathcal": "#1",
        };

        // Use your own settings
        const expander = new MacroExpander(
            piece,
            this.settings,
            "math",
            tempMacros
        );

        let out = "";

        while (true) {
            const tok = expander.expandNextToken();
            if (tok.text === "EOF") break;
            out += tok.text;
        }

        return out;
    }

    _flattenNestedMathFonts(tex) {

        if (!MATHFONT.test(tex)) return tex;

        while (true) {
            const ast = this._parseToTree(tex);
            let loc = null;

            // Find *first* nested font
            (function find(n) {
                if (!n || typeof n !== "object" || loc) return;

                if (n.type === "font" && n.mode === "math" && n.body?.loc) {
                    const { start, end } = n.body.loc;
                    const body = tex.slice(start, end);
                    if (MATHFONT.test(body)) {
                        loc = { start, end };
                        return;
                    }
                }

                for (const k in n) {
                    const v = n[k];
                    if (Array.isArray(v)) v.forEach(find);
                    else if (typeof v === "object") find(v);
                }
            })(ast);

            if (!loc) return tex;

            const inner = tex.slice(loc.start, loc.end);
            const flat  = this._stripFontsWithMacros(inner);
            tex = tex.slice(0, loc.start) + flat + tex.slice(loc.end);
        }
    }

    _splitTopLevelMathFonts(tex) {
        const ast = this._parseToTree(tex);
        const edits = [];

        (function find(node) {
            if (!node || typeof node !== "object") return;

            if (node.type === "font" && node.mode === "math" && node.body?.loc) {
                const cmd = "\\" + node.font;
                const og = node.body;

                // Validate all locs in the body
                const allBodyValid = og.body.every(n =>
                    Number.isFinite(n?.loc?.start) && Number.isFinite(n?.loc?.end)
                );

                // Build parts only if valid
                const parts = allBodyValid
                    ? og.body.map(n => {
                        const t = tex.slice(n.loc.start, n.loc.end);
                        return t.trim() === POS_CHAR
                            ? t
                            : `${cmd}{${this._stripFontsWithMacros(t)}}`;
                    })
                    : [];

                // Only push if body is valid and node.loc is valid
                if (
                    allBodyValid &&
                    Number.isFinite(node?.loc?.start) &&
                    Number.isFinite(node?.loc?.end)
                ) {
                    edits.push({
                        start: node.loc.start,
                        end: node.loc.end,
                        replacement: parts.join("")
                    });
                }
            }

            for (const k in node) {
                const v = node[k];
                if (Array.isArray(v)) v.forEach(find, this);
                else if (typeof v === "object") find.call(this, v);
            }
        }).call(this, ast);

        edits.sort((a, b) => b.start - a.start);
        for (const e of edits) {
            tex = tex.slice(0, e.start) + e.replacement + tex.slice(e.end);
        }
        return tex;
    }

    _splitMathFonts(tex) {
        // --- Early skip for entire operation ---
        if (!MATHFONT.test(tex)) return tex;
        tex = this._flattenNestedMathFonts(tex);
        tex = this._splitTopLevelMathFonts(tex);
        return tex;
    }

    _cleanMathString(str) {

        let mask;
        const ast = this._parseToTree(str);
        mask = this._buildModeMask(ast, str.length);

        // Core cleanup still applies globally
        str = str.replace(/\s{2,}/g, ' ');
        str = str.replace(/([}\]])\s+([\[{])/g, '$1$2');
        str = str.replace(/(\\[a-zA-Z]+)\s+(?=[{\[\\])/g, '$1');
        str = str.replace(/\s*_\s*/g, '_');
        str = str.replace(/\s*\^\s*/g, '^');

        if (!mask) {
            // No mask → fast global replacements
            return str
                .replace(/\s*\.\s*/g, '.')
                .replace(/\s*,\s*/g, ',')
                .trim();
        }

        const removals = [];
        const re = /(\s*)([.,])(\s*)/g;
        let m;

        // Find candidate whitespace regions
        while ((m = re.exec(str))) {
            const [full, pre, punct, post] = m;
            const startPre = m.index;
            const endPre = startPre + pre.length;
            const startPost = endPre + 1;
            const endPost = startPost + post.length;

            // Only remove spaces if NOT in text mode
            const shouldRemovePre  = pre.length  && !mask.slice(startPre, endPre).some(Boolean);
            const shouldRemovePost = post.length && !mask.slice(startPost, endPost).some(Boolean);

            if (shouldRemovePre)  removals.push([startPre, endPre]);
            if (shouldRemovePost) removals.push([startPost, endPost]);
        }

        // Apply removals right-to-left to avoid shifting
        removals.sort((a, b) => b[0] - a[0]);
        for (const [s, e] of removals) {
            str = str.slice(0, s) + str.slice(e);
        }

        return str.trim();
    }
}

export default LatexNormalizer;
