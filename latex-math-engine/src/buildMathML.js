// @flow
/**
 * This file converts a parse tree into a corresponding MathML tree. The main
 * entry point is the `buildMathML` function, which takes a parse tree from the
 * parser.
 */

import buildCommon from "./buildCommon";
import {getCharacterMetrics} from "./fontMetrics";
import mathMLTree from "./mathMLTree";
import ParseError from "./ParseError";
import symbols, {ligatures} from "./symbols";
import utils from "./utils";
import {_mathmlGroupBuilders as groupBuilders} from "./defineFunction";
import {MathNode, TextNode, SpaceNode} from "./mathMLTree";

import { styleChar } from "./fontMapping";

import type Options from "./Options";
import type {AnyParseNode, SymbolParseNode} from "./parseNode";
import type {DomSpan} from "./domTree";
import type {MathDomNode} from "./mathMLTree";
import type {FontVariant, Mode} from "./types";

/**
 * Takes a symbol and converts it into a MathML text node after performing
 * optional replacement from symbols.js.
 */
export const makeText = function(
    text: string,
    mode: Mode,
    options?: Options,
): TextNode {
    if (symbols[mode][text] && symbols[mode][text].replace &&
        text.charCodeAt(0) !== 0xD835 &&
        !(ligatures.hasOwnProperty(text) && options &&
          ((options.fontFamily && options.fontFamily.slice(4, 6) === "tt") ||
           (options.font && options.font.slice(4, 6) === "tt")))) {
        text = symbols[mode][text].replace;
        if (options?.font) {
            text = styleChar(text, options.font);
        }
    }

    return new mathMLTree.TextNode(text);
};

export const makeRow = function(body: $ReadOnlyArray<MathDomNode>): MathDomNode {
    // Always create an mrow to ensure consistent structure
    return new mathMLTree.MathNode("mrow", body);
};

/**
 * Returns the math variant as a string or null if none is required.
 */
export const getVariant = function(
    group: SymbolParseNode,
    options: Options,
): ?FontVariant {
    // Handle \text... font specifiers as best we can.
    // MathML has a limited list of allowable mathvariant specifiers; see
    // https://www.w3.org/TR/MathML3/chapter3.html#presm.commatt
    if (options.fontFamily === "texttt") {
        return "monospace";
    } else if (options.fontFamily === "textsf") {
        if (options.fontShape === "textit" &&
            options.fontWeight === "textbf") {
            return "sans-serif-bold-italic";
        } else if (options.fontShape === "textit") {
            return "sans-serif-italic";
        } else if (options.fontWeight === "textbf") {
            return "bold-sans-serif";
        } else {
            return "sans-serif";
        }
    } else if (options.fontShape === "textit" &&
               options.fontWeight === "textbf") {
        return "bold-italic";
    } else if (options.fontShape === "textit") {
        return "italic";
    } else if (options.fontWeight === "textbf") {
        return "bold";
    }

    const font = options.font;
    if (!font || font === "mathnormal") {
        return null;
    }

    const mode = group.mode;
    if (font === "mathrm") {
        return "normal";
    } else if (font === "mathit") {
        return "italic";
    } else if (font === "boldsymbol") {
        // TODO: We probably just broke this
        return group.type === "textord" ? "bold" : "bold-italic";
    } else if (font === "mathbf") {
        return "bold";
    } else if (font === "mathbb") {
        return "double-struck";
    } else if (font === "mathsfit") {
        return "sans-serif-italic";
    } else if (font === "mathfrak") {
        return "fraktur";
    } else if (font === "mathscr" || font === "mathcal") {
        // MathML makes no distinction between script and calligraphic
        return "script";
    } else if (font === "mathsf") {
        return "sans-serif";
    } else if (font === "mathtt") {
        return "monospace";
    }

    let text = group.text;
    if (utils.contains(["\\imath", "\\jmath"], text)) {
        return null;
    }

    if (symbols[mode][text] && symbols[mode][text].replace) {
        text = symbols[mode][text].replace;
    }

    const fontName = buildCommon.fontMap[font].fontName;
    if (getCharacterMetrics(text, fontName, mode)) {
        return buildCommon.fontMap[font].variant;
    }

    return null;
};

/**
 * Check for <mi>.</mi> which is how a dot renders in MathML,
 * or <mo separator="true" lspace="0em" rspace="0em">,</mo>
 * which is how a braced comma {,} renders in MathML
 */
function isNumberPunctuation(group: ?MathNode): boolean {
    if (!group) {
        return false;
    }
    if (group.type === 'mi' && group.children.length === 1) {
        const child = group.children[0];
        return child instanceof TextNode && child.text === '.';
    } else if (group.type === 'mo' && group.children.length === 1 &&
        group.getAttribute('separator') === 'true' &&
        group.getAttribute('lspace') === '0em' &&
        group.getAttribute('rspace') === '0em'
    ) {
        const child = group.children[0];
        return child instanceof TextNode && child.text === ',';
    } else {
        return false;
    }
}

/**
 * Takes a list of nodes, builds them, and returns a list of the generated
 * MathML nodes.  Also combine consecutive <mtext> outputs into a single
 * <mtext> tag.
 */
export const buildExpression = function(
    expression: AnyParseNode[],
    options: Options,
    isOrdgroup?: boolean,
): MathNode[] {
    // Flag to disable merging of adjacent nodes
    const DISABLE_MERGE = true;
    if (expression.length === 1) {
        const result = buildGroup(expression[0], options);
        const groupNodes = Array.isArray(result) ? result : [result];

        for (const group of groupNodes) {
            if (isOrdgroup && group instanceof MathNode && group.type === "mo") {
                // When TeX writers want to suppress spacing on an operator,
                // they often put the operator by itself inside braces.
                group.setAttribute("lspace", "0em");
                group.setAttribute("rspace", "0em");
            }
        }
        return groupNodes;
    }

    const groups = [];
    let lastGroup;
    for (let i = 0; i < expression.length; i++) {
        const result = buildGroup(expression[i], options);

        // Handle potential arrays from specific builders
        const groupNodes = Array.isArray(result) ? result : [result];

        for (const group of groupNodes) {
            if (isOrdgroup && group instanceof MathNode && group.type === "mo") {
                if (i === 0) {
                    group.setAttribute("lspace", "0em");
                }
                if (i === expression.length - 1) {
                    group.setAttribute("rspace", "0em");
                }
            }

            if (group instanceof MathNode && lastGroup instanceof MathNode) {
                if (!DISABLE_MERGE) {
                    // Concatenate adjacent <mtext>s
                    if (group.type === 'mtext' && lastGroup.type === 'mtext'
                        && group.getAttribute('mathvariant') ===
                           lastGroup.getAttribute('mathvariant')) {
                        lastGroup.children.push(...group.children);
                        continue;
                    // Concatenate adjacent <mn>s
                    } else if (group.type === 'mn' && lastGroup.type === 'mn') {
                        lastGroup.children.push(...group.children);
                        continue;
                    // Concatenate <mn>...</mn> followed by <mi>.</mi>
                    } else if (isNumberPunctuation(group) && lastGroup.type === 'mn') {
                        lastGroup.children.push(...group.children);
                        continue;
                    // Concatenate <mi>.</mi> followed by <mn>...</mn>
                    } else if (group.type === 'mn' && isNumberPunctuation(lastGroup)) {
                        group.children = [...lastGroup.children, ...group.children];
                        groups.pop();
                    }
                }
                // Put preceding <mn>...</mn> or <mi>.</mi> inside base of
                // <msup><mn>...base...</mn>...exponent...</msup> (or <msub>)
                if (!DISABLE_MERGE && (group.type === 'msup' || group.type === 'msub') &&
                    group.children.length >= 1 &&
                    (lastGroup.type === 'mn' || isNumberPunctuation(lastGroup))
                ) {
                    const base = group.children[0];
                    if (base instanceof MathNode && base.type === 'mn') {
                        base.children = [...lastGroup.children, ...base.children];
                        groups.pop();
                    }
                // \not
                } else if (['mi', 'mo'].includes(lastGroup.type) && lastGroup.children.length === 1) {
                    const lastChild = lastGroup.children[0];
                    if (lastChild instanceof TextNode && lastChild.text === '\u0338' &&
                        (group.type === 'mo' || group.type === 'mi' ||
                            group.type === 'mn')) {
                        const child = group.children[0];
                        if (child instanceof TextNode && child.text.length > 0) {
                            group.setAttribute('data-range-start', lastGroup.getAttribute('data-range-start'));
                            // Overlay with combining character long solidus
                            child.text = child.text.slice(0, 1) + "\u0338" +
                                child.text.slice(1);
                            groups.pop();
                        }
                    }
                }
            }
            groups.push(group);
            lastGroup = group;
        }
    }
    return groups;
};

/**
 * Equivalent to buildExpression, but wraps the elements in an <mrow>
 * if there's more than one.  Returns a single node instead of an array.
 */
export const buildExpressionRow = function(
    expression: AnyParseNode[],
    options: Options,
    isOrdgroup?: boolean,
): MathDomNode {
    return makeRow(buildExpression(expression, options, isOrdgroup));
};

/**
 * Takes a group from the parser and calls the appropriate groupBuilders function
 * on it to produce a MathML node or array of nodes.
 */
export const buildGroup = function(
    group: ?AnyParseNode,
    options: Options,
): MathNode | MathNode[] {
    if (!group) {
        return new mathMLTree.MathNode("mrow");
    }

    if (groupBuilders[group.type]) {
        // Call the groupBuilders function
        // $FlowFixMe
        const result: MathDomNode | MathDomNode[] = groupBuilders[group.type](group, options);

        // Helper function to add metadata to a single node
        const addMetadata = (node) => {
            if ((node instanceof MathNode || node instanceof SpaceNode) && group.loc) {
                // Only set range attributes if they don't already exist
                // This preserves range data that was set by child builders
                if (!node.getAttribute('data-range-start')) {
                    node.setAttribute('data-range-start', group.loc.start.toString());
                }
                if (!node.getAttribute('data-range-end')) {
                    node.setAttribute('data-range-end', group.loc.end.toString());
                }
                if (group.type === "op" || group.type === "operatorname") {
                    node.setAttribute('data-function', 'true');
                }
                if (group.limits) {
                    node.setAttribute('limits', 'true');
                }
            }
        };

        // Handle array results
        if (Array.isArray(result)) {
            result.forEach(addMetadata);
            // $FlowFixMe
            return result;
        }

        // Handle single node result
        addMetadata(result);

        // $FlowFixMe
        return result;
    } else {
        throw new ParseError(
            "Got group of unknown type: '" + group.type + "'");
    }
};

/**
 * Takes a full parse tree and settings and builds a MathML representation of
 * it. In particular, we put the elements from building the parse tree into a
 * <semantics> tag so we can also include that TeX source as an annotation.
 *
 * Note that we actually return a domTree element with a `<math>` inside it so
 * we can do appropriate styling.
 */
export default function buildMathML(
    tree: AnyParseNode[],
    texExpression: string,
    options: Options,
    isDisplayMode: boolean,
    forMathmlOnly: boolean,
): DomSpan {
    const expression = buildExpression(tree, options);

    // TODO: Make a pass thru the MathML similar to buildHTML.traverseNonSpaceNodes
    // and add spacing nodes. This is necessary only adjacent to math operators
    // like \sin or \lim or to subsup elements that contain math operators.
    // MathML takes care of the other spacing issues.

    // Wrap up the expression in an mrow so it is presented in the semantics
    // tag correctly, unless it's a single <mrow> or <mtable>.
    let wrapper;
    const classes = expression[0]?.classes || [];

    const childPreventsUnwrap =
        ["layout-style", "infix"].some(cls =>
            expression[0]?.children?.[0]?.classes?.includes(cls)
        );

    const disallowed = ["delimited-group", "delimited-frac", "delimiter-wrapper"];

    const isDelimited =
        disallowed.some(cls => classes.includes(cls)) ||
        childPreventsUnwrap;

    if (
        expression.length === 1 &&
        expression[0] instanceof MathNode &&
        utils.contains(["mrow"], expression[0].type) &&
        !isDelimited
    ) {
        wrapper = expression[0];
    } else {
        wrapper = new mathMLTree.MathNode("mrow", expression);
        wrapper.setAttribute("data-range-start", "0");
        wrapper.setAttribute("data-range-end", texExpression.length.toString());
    }

    // Build a TeX annotation of the source
    //const annotation = new mathMLTree.MathNode("annotation", [new mathMLTree.TextNode(texExpression)]);
    //annotation.setAttribute("encoding", "application/x-tex");
    //const semantics = new mathMLTree.MathNode("semantics", [wrapper, annotation]);
    const semantics = new mathMLTree.MathNode("semantics", [wrapper]);

    const math = new mathMLTree.MathNode("math", [semantics]);
    math.setAttribute("xmlns", "http://www.w3.org/1998/Math/MathML");
    if (isDisplayMode) {
        math.setAttribute("displaystyle", "true");
    }

    // You can't style <math> nodes, so we wrap the node in a span.
    // NOTE: The span class is not typed to have <math> nodes as children, and
    // we don't want to make the children type more generic since the children
    // of span are expected to have more fields in `buildHtml` contexts.
    const wrapperClass = forMathmlOnly ? "lme" : "lme-mathml";
    // $FlowFixMe
    return buildCommon.makeSpan([wrapperClass], [math]);
}
