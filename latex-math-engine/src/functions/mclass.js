// @flow
import defineFunction, {ordargument} from "../defineFunction";
import buildCommon from "../buildCommon";
import mathMLTree from "../mathMLTree";
import utils from "../utils";
import type {AnyParseNode} from "../parseNode";

import * as html from "../buildHTML";
import * as mml from "../buildMathML";

import type {ParseNode} from "../parseNode";

const makeSpan = buildCommon.makeSpan;

function htmlBuilder(group: ParseNode<"mclass">, options) {
    const elements = html.buildExpression(group.body, options, true);
    return makeSpan([group.mclass], elements, options);
}

function mathmlBuilder(group: ParseNode<"mclass">, options) {
    const inner = mml.buildExpression(group.body, options);

    // Zero out spacing on <mo> nodes to avoid default MathML gaps
    for (const child of inner) {
        if (child.type === "mo") {
            child.attributes.lspace = "0em";
            child.attributes.rspace = "0em";
        }
    }

    // If it's a character box, directly modify the first node
    if ((group.isCharacterBox && inner.length > 0) || inner.length === 1) {

        const node = inner[0];

        if (group.loc) {
            node.setAttribute('data-range-start', group.loc.start.toString());
            node.setAttribute('data-range-end', group.loc.end.toString());
        }
        applySpacing(node, group.mclass);

        return inner;

    } else {

        for (const child of inner) {
            if (typeof child.clearAttributes === "function") {
                child.clearAttributes(["data-range-start", "data-range-end"]);
            }
        }

        const fullNode = new mathMLTree.MathNode("mstyle", inner);

        if (group.loc) {
            fullNode.setAttribute('data-range-start', group.loc.start.toString());
            fullNode.setAttribute('data-range-end', group.loc.end.toString());
        }

        applySpacing(fullNode, group.mclass);

        return fullNode;

    }

}

function applySpacing(node, mclass) {
    switch (mclass) {
        case "mrel":   node.setAttribute("data-type", "rel"); break;
        case "mbin":   node.setAttribute("data-type", "bin"); break;
        case "mpunct": node.setAttribute("data-type", "punct"); break;
        case "mopen":  node.setAttribute("data-type", "open"); break;
        case "mclose": node.setAttribute("data-type", "close"); break;
        case "minner": node.setAttribute("data-type", "inner"); break;
    }
}

// Math class commands except \mathop
defineFunction({
    type: "mclass",
    names: [
        "\\mathord", "\\mathbin", "\\mathrel", "\\mathopen",
        "\\mathclose", "\\mathpunct", "\\mathinner",
    ],
    props: {
        numArgs: 1,
        primitive: true,
    },
    handler({parser, funcName}, args) {
        const body = args[0];
        return {
            type: "mclass",
            mode: parser.mode,
            mclass: "m" + funcName.slice(5), // TODO(kevinb): don't prefix with 'm'
            body: ordargument(body),
            isCharacterBox: utils.isCharacterBox(body),
        };
    },
    htmlBuilder,
    mathmlBuilder,
});

export const binrelClass = (arg: AnyParseNode): string => {
    // \binrel@ spacing varies with (bin|rel|ord) of the atom in the argument.
    // (by rendering separately and with {}s before and after, and measuring
    // the change in spacing).  We'll do roughly the same by detecting the
    // atom type directly.
    const atom = (arg.type === "ordgroup" && arg.body.length ? arg.body[0] : arg);
    if (atom.type === "atom" && (atom.family === "bin" || atom.family === "rel")) {
        return "m" + atom.family;
    } else {
        return "mord";
    }
};

// \@binrel{x}{y} renders like y but as mbin/mrel/mord if x is mbin/mrel/mord.
// This is equivalent to \binrel@{x}\binrel@@{y} in AMSTeX.
defineFunction({
    type: "mclass",
    names: ["\\@binrel"],
    props: {
        numArgs: 2,
    },
    handler({parser}, args) {
        return {
            type: "mclass",
            mode: parser.mode,
            mclass: binrelClass(args[0]),
            body: ordargument(args[1]),
            isCharacterBox: utils.isCharacterBox(args[1]),
        };
    },
});

// Build a relation or stacked op by placing one symbol on top of another
defineFunction({
    type: "mclass",
    names: ["\\stackrel", "\\overset", "\\underset"],
    props: {
        numArgs: 2,
    },
    handler({parser, funcName}, args) {
        const baseArg = args[1];
        const shiftedArg = args[0];

        let mclass;
        if (funcName !== "\\stackrel") {
            // LaTeX applies \binrel spacing to \overset and \underset.
            mclass = binrelClass(baseArg);
        } else {
            mclass = "mrel";  // for \stackrel
        }

        const baseOp = {
            type: "ordgroup",
            mode: baseArg.mode,
            limits: true,
            alwaysHandleSupSub: true,
            parentIsSupSub: false,
            symbol: false,
            suppressBaseShift: funcName !== "\\stackrel",
            body: ordargument(baseArg),
            loc: baseArg?.loc,
            disableStrip: true,
        };

        const supsub = {
            type: "supsub",
            mode: shiftedArg.mode,
            base: baseOp,
            sup: funcName === "\\underset" ? null : shiftedArg,
            sub: funcName === "\\underset" ? shiftedArg : null,
            placementMode: "limit"
        };

        return {
            type: "mclass",
            mode: parser.mode,
            mclass,
            body: [supsub],
            isCharacterBox: utils.isCharacterBox(supsub),
        };
    },
    htmlBuilder,
    mathmlBuilder,
});
