// @flow
import {defineFunctionBuilders} from "../defineFunction";
import buildCommon from "../buildCommon";
import mathMLTree from "../mathMLTree";
import { delimiters } from "./delimsizing";

import * as mml from "../buildMathML";

// Operator ParseNodes created in Parser.js from symbol Groups in src/symbols.js.

defineFunctionBuilders({
    type: "atom",
    htmlBuilder(group, options) {
        return buildCommon.mathsym(
            group.text, group.mode, options, ["m" + group.family]);
    },
    mathmlBuilder(group, options) {
        const node = new mathMLTree.MathNode(
            "mo", [mml.makeText(group.text, group.mode)]);
        if (group.family === "punct") {
            node.setAttribute("separator", "true");
        } else if (group.family === "open" || group.family === "close") {
            // Delims built here should not stretch vertically.
            // See delimsizing.js for stretchy delims.
            node.setAttribute("stretchy", "false");
            node.setAttribute("form", group.family === "close" ? "postfix" : "prefix");
            if (delimiters.includes(group.text)) {
                node.setAttribute("fence", "false");
            }
        } else {
            // Should really break this out into a new function
            if (group.text === "\\shortmid" || group.text === "\\shortparallel") {
                node.setAttribute("stretchy", "false");
                node.setStyle("transform", "scaleY(0.4) translateY(0.2em)");
            }
        }
        return node;
    },
});
