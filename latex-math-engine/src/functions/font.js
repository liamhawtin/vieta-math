// @flow
// TODO(kevinb): implement \\sl and \\sc

import {binrelClass} from "./mclass";
import defineFunction, {normalizeArgument} from "../defineFunction";
import utils from "../utils";

import * as html from "../buildHTML";
import * as mml from "../buildMathML";
import mathMLTree from "../mathMLTree";

import { mappings } from "../fontMapping";

import type {ParseNode} from "../parseNode";

const htmlBuilder = (group: ParseNode<"font">, options) => {
    const font = group.font;
    const newOptions = options.withFont(font);
    return html.buildGroup(group.body, newOptions);
};

const mathmlBuilder = (group: ParseNode<"font">, options) => {
    const font = group.font;
    const newOptions = options.withFont(font);
    const inner = mml.buildGroup(group.body, newOptions);
    const node = new mathMLTree.MathNode("mpadded", [inner]);
    const variant = mml.getVariant(group, newOptions);
    node.classes.push("mathfont");
    if (variant) {
        node.classes.push(variant);
    }
    return node;
};

const fontAliases = {
    "\\Bbb": "\\mathbb",
    "\\bold": "\\mathbf",
    "\\frak": "\\mathfrak",
    "\\bm": "\\boldsymbol",
};

defineFunction({
    type: "font",
    names: [
        // styles, except \boldsymbol defined below
        "\\mathrm", "\\mathit", "\\mathbf", "\\mathnormal", "\\mathsfit",

        // families
        "\\mathbb", "\\mathcal", "\\mathfrak", "\\mathscr", "\\mathsf",
        "\\mathtt",

        // aliases, except \bm defined below
        "\\Bbb", "\\bold", "\\frak",

        "\\bm", "\\boldsymbol",
    ],
    props: {
        numArgs: 1,
        allowedInArgument: true,
    },
    handler: ({parser, funcName}, args) => {
        const body = args[0];
        let func = funcName;
        if (func in fontAliases) {
            func = fontAliases[func];
        }
        return {
            type: "font",
            mode: parser.mode,
            font: func.slice(1),
            body,
        };
    },
    htmlBuilder,
    mathmlBuilder,
});

// Old font changing functions
// TODO: Deprecate
/*
defineFunction({
    type: "font",
    names: ["\\rm", "\\sf", "\\tt", "\\bf", "\\it", "\\cal"],
    props: {
        numArgs: 0,
        allowedInText: true,
    },
    handler: ({parser, funcName, breakOnTokenText}, args) => {
        const {mode} = parser;
        const body = parser.parseExpression(true, breakOnTokenText);
        const style = `math${funcName.slice(1)}`;

        return {
            type: "font",
            mode: mode,
            font: style,
            body: {
                type: "ordgroup",
                mode: parser.mode,
                body,
            },
        };
    },
    htmlBuilder,
    mathmlBuilder,
});
*/
