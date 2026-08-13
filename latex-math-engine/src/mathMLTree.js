// @flow
/**
 * These objects store data about MathML nodes. This is the MathML equivalent
 * of the types in domTree.js. Since MathML handles its own rendering, and
 * since we're mainly using MathML to improve accessibility, we don't manage
 * any of the styling state that the plain DOM nodes do.
 *
 * The `toNode` and `toMarkup` functions work similarly to how they do in
 * domTree.js, creating namespaced DOM nodes and HTML text markup respectively.
 */

import utils from "./utils";
import {DocumentFragment} from "./tree";
import {createClass} from "./domTree";
import {makeEm} from "./units";

import type {VirtualNode} from "./tree";

/**
 * MathML node types used in KaTeX. For a complete list of MathML nodes, see
 * https://developer.mozilla.org/en-US/docs/Web/MathML/Element.
 */
export type MathNodeType =
    "math" | "annotation" | "semantics" |
    "mtext" | "mn" | "mo" | "mi" | "mspace" |
    "mover" | "munder" | "munderover" | "msup" | "msub" | "msubsup" |
    "mfrac" | "mroot" | "msqrt" |
    "mtable" | "mtr" | "mtd" | "mlabeledtr" |
    "mrow" | "menclose" |
    "mstyle" | "mpadded" | "mphantom" | "mglyph";

export interface MathDomNode extends VirtualNode {
    toText(): string;
}

export type documentFragment = DocumentFragment<MathDomNode>;
export function newDocumentFragment(
    children: $ReadOnlyArray<MathDomNode>
): documentFragment {
    return new DocumentFragment(children);
}

/**
 * This node represents a general purpose MathML node of any type. The
 * constructor requires the type of node to create (for example, `"mo"` or
 * `"mspace"`, corresponding to `<mo>` and `<mspace>` tags).
 */
export class MathNode implements MathDomNode {
    type: MathNodeType;
    attributes: {[string]: string};
    children: $ReadOnlyArray<MathDomNode>;
    classes: string[];
    styles: {[string]: string};

    constructor(
        type: MathNodeType,
        children?: $ReadOnlyArray<MathDomNode>,
        classes?: string[]
    ) {
        this.type = type;
        this.attributes = {};
        this.children = children || [];
        this.classes = classes || [];
        this.styles = {};
    }

    setAttribute(name: string, value: string) {
        this.attributes[name] = value;
    }

    getAttribute(name: string): string {
        return this.attributes[name];
    }

    clearAttributes(attrNames?: string[]) {
        if (Array.isArray(attrNames) && attrNames.length > 0) {
            for (const name of attrNames) {
                delete this.attributes[name];
            }
        } else {
            this.attributes = {};
        }

        // Recurse into children
        this.children.forEach(child => {
            if (typeof child.clearAttributes === "function") {
                child.clearAttributes(attrNames);
            }
        });
    }

    setStyle(name: string, value: string) {
        this.styles[name] = value;
    }

    toNode(): Node {
        const node = document.createElementNS(
            "http://www.w3.org/1998/Math/MathML", this.type);

        for (const attr in this.attributes) {
            if (Object.prototype.hasOwnProperty.call(this.attributes, attr)) {
                node.setAttribute(attr, this.attributes[attr]);
            }
        }

        const styleString = Object.entries(this.styles)
            .map(([key, val]) => `${key.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}:${val}`)
            .join("; ");
        if (styleString) {
            node.setAttribute("style", styleString);
        }

        if (this.classes.length > 0) {
            node.className = createClass(this.classes);
        }

        for (let i = 0; i < this.children.length; i++) {
            if (this.children[i] instanceof TextNode &&
                this.children[i + 1] instanceof TextNode) {
                let text = this.children[i].toText() + this.children[++i].toText();
                while (this.children[i + 1] instanceof TextNode) {
                    text += this.children[++i].toText();
                }
                node.appendChild(new TextNode(text).toNode());
            } else {
                node.appendChild(this.children[i].toNode());
            }
        }

        if (this.type === "mrow" && this.children.length === 0) {
            const mi = document.createElementNS(
                "http://www.w3.org/1998/Math/MathML", "mi"
            );
            mi.classList.add("affordance");
            mi.textContent = "□";
            node.appendChild(mi);
        }

        return node;
    }

    toMarkup(): string {
        let markup = `<${this.type}`;

        // Add attributes
        for (const attr in this.attributes) {
            markup += ` ${attr}="${utils.escape(this.attributes[attr])}"`;
        }

        // Add style
        const styleString = Object.entries(this.styles)
            .map(([key, val]) => `${key.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}:${val}`)
            .join("; ");
        if (styleString) {
            markup += ` style="${utils.escape(styleString)}"`;
        }

        // Add classes
        if (this.classes.length > 0) {
            markup += ` class="${utils.escape(createClass(this.classes))}"`;
        }

        markup += ">";
        for (let i = 0; i < this.children.length; i++) {
            markup += this.children[i].toMarkup();
        }
        if (this.type === "mrow" && this.children.length === 0) {
            markup += `<mi class="affordance">□</mi>`;
        }
        markup += `</${this.type}>`;

        return markup;
    }

    clone(): MathNode {
        const clonedChildren = this.children.map(child => child.clone());
        const cloned = new MathNode(this.type, clonedChildren, [...this.classes]);
        cloned.attributes = Object.assign({}, this.attributes);
        cloned.styles = Object.assign({}, this.styles);
        return cloned;
    }

    toText(): string {
        return this.children.map(child => child.toText()).join("");
    }
}

/**
 * This node represents a piece of text.
 */
export class TextNode implements MathDomNode {
    text: string;

    constructor(text: string) {
        this.text = text;
    }

    /**
     * Converts the text node into a DOM text node.
     */
    toNode(): Node {
        return document.createTextNode(this.text);
    }

    /**
     * Converts the text node into escaped HTML markup
     * (representing the text itself).
     */
    toMarkup(): string {
        return utils.escape(this.toText());
    }

    /**
     * Converts the text node into a string
     * (representing the text itself).
     */
    toText(): string {
        return this.text;
    }

    clone(): TextNode {
        return new TextNode(this.text);
    }

}

/**
 * This node represents a space, but may render as <mspace.../> or as text,
 * depending on the width.
 */
export class SpaceNode implements MathDomNode {
    width: number;
    character: ?string;
    attributes: {[string]: string};
    styles: {[string]: string};

    constructor(width: number) {
        this.width = width;
        this.character = null;
        this.attributes = {height: "1ex"};
        this.styles = {};
    }

    setAttribute(name: string, value: string) {
        this.attributes[name] = value;
    }

    getAttribute(name: string): string {
        return this.attributes[name];
    }

    clearAttributes(attrNames?: string[]) {
        if (Array.isArray(attrNames) && attrNames.length > 0) {
            for (const name of attrNames) {
                delete this.attributes[name];
            }
        } else {
            this.attributes = {};
        }
    }

    setStyle(name: string, value: string) {
        this.styles[name] = value;
    }

    toNode(): Node {
        if (this.character) {
            return document.createTextNode(this.character);
        } else {
            const node = document.createElementNS(
                "http://www.w3.org/1998/Math/MathML", "mspace"
            );

            if (this.width >= 0) {
                node.setAttribute("width", makeEm(this.width));
            } else {
                // negative width → margin-left + class
                this.styles["margin-left"] = makeEm(this.width);
                const existingClass = this.attributes["class"] || "";
                this.attributes["class"] = (existingClass + " neg-width").trim();
            }

            for (const attr in this.attributes) {
                node.setAttribute(attr, this.attributes[attr]);
            }

            const styleString = Object.entries(this.styles)
                .map(([key, val]) =>
                    `${key.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}:${val}`
                )
                .join("; ");
            if (styleString) {
                node.setAttribute("style", styleString);
            }

            return node;
        }
    }

    toMarkup(): string {
        let markup = `<mspace`;

        if (this.width >= 0) {
            markup += ` width="${makeEm(this.width)}"`;
        } else {
            // negative width → margin-left + class
            this.styles["margin-left"] = makeEm(this.width);
            const existingClass = this.attributes["class"] || "";
            this.attributes["class"] = (existingClass + " neg-width").trim();
        }

        for (const attr in this.attributes) {
            markup += ` ${attr}="${utils.escape(this.attributes[attr])}"`;
        }

        const styleString = Object.entries(this.styles)
            .map(([key, val]) =>
                `${key.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}:${val}`
            )
            .join("; ");
        if (styleString) {
            markup += ` style="${utils.escape(styleString)}"`;
        }

        markup += "/>";
        return markup;
    }

    toText(): string {
        return this.character || " ";
    }

    clone(): SpaceNode {
        const cloned = new SpaceNode(this.width);
        cloned.character = this.character;
        cloned.attributes = Object.assign({}, this.attributes);
        cloned.styles = Object.assign({}, this.styles);
        return cloned;
    }
}

export default {
    MathNode,
    TextNode,
    SpaceNode,
    newDocumentFragment,
};
