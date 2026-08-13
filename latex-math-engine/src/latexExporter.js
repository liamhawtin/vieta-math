import MacroExpander from './MacroExpander';
import Settings from './Settings';
import ParseError from './ParseError';
import Parser from './Parser';
import macros from './exportMacros'; // Import to register export macros

class LatexExporter {
    constructor(input) {
        this.rawInput = input;
        this.settings = new Settings({
            maxExpand: 1000,
            keepWhiteSpace: true,
            displayMode: true ,
            throwOnError: false,
            strict: "ignore"
        });
    }

    export() {
        let tex = this.rawInput;


        try {
            tex = this._expandExportMacros(tex);
            tex = this._processLeftRight(tex);
            tex = this._ruleUnitsToEm(tex);
            tex = this._mergeConsecutiveMathFonts(tex);
            tex = this._normalizeArrays(tex);
            tex = this._clean(tex);
        } catch (error) {
            if (error instanceof ParseError) {
                console.error("Error expanding export macros:", error.message);
                return undefined;
            }
            throw error;
        }

        return tex;
    }

    _expandExportMacros(input) {
        const expander = new MacroExpander(input, this.settings, "math", macros);
        const expandedTokens = [];

        try {
            while (true) {
                const token = expander.expandNextToken();
                if (token.text === "EOF") break;
                expandedTokens.push(token);
            }
        } catch (error) {
            if (error instanceof ParseError) {
                console.error("Error expanding export macros:", error.message);
                return input;
            }
            throw error;
        }

        return expandedTokens.map(token => token.text).join('');
    }

    _processLeftRight(str) {
        const hasLeft = /\\left\b/.test(str);
        let result = str;

        // Robust delimiter pattern
        const DELIM = '(?:\\\\[a-zA-Z]+|\\\\[^a-zA-Z\\s]|[^a-zA-Z\\s\\\\])';

        if (hasLeft) {
            // Full structure present
            const leftRegex  = new RegExp(`\\\\left\\s*\\.\\s*\\\\middle\\s*(${DELIM})`, "g");
            const rightRegex = new RegExp(`\\\\middle\\s*(${DELIM})\\s*\\\\right\\s*\\.`, "g");

            result = result.replace(leftRegex,  (m, delim) => `\\left${delim}`);
            result = result.replace(rightRegex, (m, delim) => `\\right${delim}`);

        } else {
            // Fragment case — remove \middle but keep delimiter
            const middleRegex = new RegExp(`\\\\middle\\s*(${DELIM})`, "g");
            result = result.replace(middleRegex, (m, delim) => `${delim}`);
        }

        return result;
    }

    _parseToTree(str) {
        return new Parser(str, this.settings, {}).parse();
    }

    _ruleUnitsToEm(texString) {
        if (!/\\rule\b/.test(texString)) return texString;

        const tree = this._parseToTree(texString);

        const edits = [];
        const visited = new WeakSet();

        const muToEm = (mu) => {
            if (mu == null) return null;
            const em = mu / 18;
            // Round to 2 decimals max, but don’t force trailing zeros
            return parseFloat(em.toFixed(2));
        };

        const processNode = (node) => {
            if (!node || typeof node !== 'object' || visited.has(node)) return;
            visited.add(node);

            if (node.type === 'rule' && node.loc) {
                const { shift, width, height } = node;

                // node.shift / node.width / node.height are already in MU
                const shiftEm = shift ? muToEm(shift.number) : null;
                const widthEm = width ? muToEm(width.number) : null;
                const heightEm = height ? muToEm(height.number) : null;

                if (widthEm !== null && heightEm !== null) {
                    const shiftPart = shiftEm !== null && shiftEm !== 0 ? `[${shiftEm}em]` : '';
                    const replacement = `\\rule${shiftPart}{${widthEm}em}{${heightEm}em}`;

                    edits.push({
                        start: node.loc.start,
                        end: node.loc.end,
                        replacement
                    });
                }
            }

            // Recursively process child nodes
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

        edits.sort((a, b) => b.start - a.start);

        let result = texString;
        for (const { start, end, replacement } of edits) {
            result = result.slice(0, start) + replacement + result.slice(end);
        }

        return result;
    }

    _mergeConsecutiveMathFonts(tex) {
        // Quick skip: no math-font macros at all
        if (!/\\(mathrm|mathit|mathbf|boldsymbol|mathsf|mathtt|mathbb|mathfrak|mathcal)\b/.test(tex))
            return tex;

        const ast = this._parseToTree(tex);
        const edits = [];
        const visited = new WeakSet();

        const isFontNode = (n) =>
            n &&
            n.type === "font" &&
            n.mode === "math" &&
            typeof n.font === "string" &&
            n.body?.type === "ordgroup" &&
            n.loc &&
            n.body.loc;

        const extractBody = (f) =>
            tex.substring(f.body.loc.start + 1, f.body.loc.end - 1);

        const getRun = (arr, i) => {
            const first = arr[i];
            if (!isFontNode(first)) return null;

            const type = first.font;
            let j = i + 1;

            while (j < arr.length && isFontNode(arr[j]) && arr[j].font === type) {
                j++;
            }
            return arr.slice(i, j);
        };

        const walk = (node) => {
            if (!node || typeof node !== "object" || visited.has(node)) return;
            visited.add(node);

            if (Array.isArray(node)) {
                for (let i = 0; i < node.length; ) {
                    const run = getRun(node, i);
                    if (run && run.length > 1) {
                        const needsSpace = (a, b) =>
                            /\\[A-Za-z]+$/.test(a) && !/^[}\] ]/.test(b);
                        const bodies = run.map(extractBody);
                        let mergedBody = bodies[0];
                        for (let i = 1; i < bodies.length; i++) {
                            const b = bodies[i];
                            mergedBody += (needsSpace(mergedBody, b) ? " " : "") + b;
                        }
                        const merged = `\\${run[0].font}{${mergedBody}}`;
                        edits.push({
                            start: run[0].loc.start,
                            end: run[run.length - 1].loc.end,
                            replacement: merged
                        });
                        i += run.length; // Skip run
                    } else {
                        i++;
                    }
                }
            }

            for (const k in node) {
                const child = node[k];
                if (child && typeof child === "object") walk(child);
            }
        };

        walk(ast);

        if (!edits.length) return tex;

        // Apply edits deepest → shallowest
        edits.sort((a, b) => b.start - a.start);

        let out = tex;
        for (const { start, end, replacement } of edits) {
            out = out.slice(0, start) + replacement + out.slice(end);
        }

        return out;
    }

    _normalizeArrays(tex) {
        if (!/\\begin\{/.test(tex)) return tex;

        // Minimal AST walker
        const walk = (node, fn) => {
            if (!node || typeof node !== "object") return;
            fn(node);
            const children = Array.isArray(node) ? node : Object.values(node);
            children.forEach(c => { if (c && typeof c === "object") walk(c, fn); });
        };

        // Build inline env string from an array AST node
        const buildEnv = (envType, array) => {
            let colSpec = "";
            if (envType === "array") {
                const maxCols = Math.max(...array.body.map(r => r.length));
                const aligns = array.cols?.map(c => c.align) || [];
                colSpec = "{" + Array.from({ length: maxCols }, (_, i) => aligns[i] || "c").join("") + "}";
            } else if (envType === "subarray") {
                colSpec = "{c}";
            }
            const rows = array.body.map((row, i) => {
                const cells = row.map(cell => tex.slice(cell.loc.start + 1, cell.loc.end - 1).trim());
                return cells.join(" & ") + (i < array.body.length - 1 ? " \\\\" : "");
            });
            return `\\begin{${envType}}${colSpec}${rows.join(" ")}\\end{${envType}}`;
        };

        const delimsToEnv = (l, r) => {
            if (l === "(" && r === ")") return "pmatrix";
            if (l === "[" && r === "]") return "bmatrix";
            if (l === "\\{" && r === "\\}") return "Bmatrix";
            if (l === "\\Vert" && r === "\\Vert") return "Vmatrix";
            if (l === "|" && r === "|") return "vmatrix";
            if (l === "\\{" && r === ".") return "cases";
            return null;
        };

        // Pass 1: leftright wrappers → named AMS environments
        while (true) {
            const ast = this._parseToTree(tex);
            let found = null;
            walk(ast, node => {
                if (found || node?.type !== "leftright") return;
                // Only convert if the source text is literally \left..., not a macro-expanded env
                if (!tex.slice(node.loc?.start ?? 0, (node.loc?.start ?? 0) + 5).startsWith("\\left")) return;
                const meaningful = (node.body || []).filter(n => n?.type !== "kern");
                if (meaningful.length !== 1 || meaningful[0]?.type !== "array") return;
                const envType = delimsToEnv(node.left, node.right);
                if (envType) found = { node, envType, arrayNode: meaningful[0] };
            });
            if (!found) break;
            const { node, envType, arrayNode } = found;
            tex = tex.slice(0, node.loc.start) + buildEnv(envType, arrayNode) + tex.slice(node.loc.end);
        }

        // Pass 2: subarray{c} → \substack
        while (true) {
            const ast = this._parseToTree(tex);
            let found = null;
            walk(ast, node => {
                if (found || node?.type !== "array" || !node.loc) return;
                if (!tex.slice(node.loc.start, node.loc.end).startsWith("\\begin{subarray}")) return;
                const align = node.colalign?.join?.("") || node.colalign || "";
                if (align === "c" || align.length === 0) found = node;
            });
            if (!found) break;
            const rows = found.body.map(row =>
                row.map(cell => tex.slice(cell.loc.start + 1, cell.loc.end - 1).trim()).join(" & ")
            );
            tex = tex.slice(0, found.loc.start) + `\\substack{${rows.join(" \\\\ ")}}` + tex.slice(found.loc.end);
        }

        return tex;
    }

    _clean(str) {
    return str
        // normalize the \\ blocks
        .replace(/\n\s*\\\\\s*\n/g, " \\\\\n")
        // remove empty lines (only whitespace or nothing between \n)
        .replace(/^\s*$(?:\r?\n)?/gm, "");
    }

}

export default LatexExporter;
