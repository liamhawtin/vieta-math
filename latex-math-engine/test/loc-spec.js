/* eslint max-len:0 */

import buildTree from "../src/buildTree";
import parseTree from "../src/parseTree";
import { DOMParser } from "@xmldom/xmldom";

const options = {
    displayMode: true,
    throwOnError: false,
    errorColor: '#dc3545',
    strict: false,
    output: 'mathml',
    trust: true,
};

function expressionToMathML(expression) {
    const tree = parseTree(expression, options);
    const markup = buildTree(tree, expression, options).toMarkup();
    return markup;
}

function getAllElements(node) {
    const elements = [];
    const stack = [node];

    while (stack.length > 0) {
        const current = stack.pop();
        if (current.nodeType === 1) { // ELEMENT_NODE
            elements.push(current);
            stack.push(...Array.from(current.childNodes));
        }
    }

    return elements;
}

function getNodesWithRangeAttrs(mathML, tagName = "*") {
    const parser = new DOMParser();
    const doc = parser.parseFromString(mathML, "application/xml");

    const elements = Array.from(doc.getElementsByTagName(tagName));

    return elements.filter((el) =>
        el.hasAttribute("data-range-start") && el.hasAttribute("data-range-end")
    );
}

describe("MathML source location data-range mapping", () => {

    it("maps subexpressions in \\frac{{x}^{a+b}}{c} correctly", () => {
        const expr = "\\frac{{x}^{a+b}}{c}";
        const mathML = expressionToMathML(expr);
        const nodes = getNodesWithRangeAttrs(mathML);

        const expectedConfigs = [
            { tag: "mfrac", start: 0, end: 19 },
            { tag: "mrow", start: 5, end: 16 },
            // The base and script are separate editable siblings. The script
            // range starts at the caret boundary before the exponent.
            { tag: "msup", start: 9, end: 15 },
            { tag: "mrow", start: 6, end: 9 },
            { tag: "mi", start: 7, end: 8, text: "x" },
            { tag: "mrow", start: 10, end: 15 },
            { tag: "mi", start: 11, end: 12, text: "a" },
            { tag: "mo", start: 12, end: 13, text: "+" },
            { tag: "mi", start: 13, end: 14, text: "b" },
            { tag: "mrow", start: 16, end: 19 },
            { tag: "mi", start: 17, end: 18, text: "c" },
        ];

        for (const { tag, start, end, text } of expectedConfigs) {
            const match = nodes.find(node =>
                node.localName === tag &&
                parseInt(node.getAttribute("data-range-start"), 10) === start &&
                parseInt(node.getAttribute("data-range-end"), 10) === end &&
                (text === undefined || node.textContent === text)
            );

            expect(match).toBeDefined();
        }

    });

});
