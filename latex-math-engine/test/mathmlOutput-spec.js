/* eslint max-len: 0 */
import buildTree from "../src/buildTree";
import parseTree from "../src/parseTree";

const options = {
    displayMode: true,
    throwOnError: false,
    strict: false,
    output: "mathml",
    trust: true,
};

const render = (expression) =>
    buildTree(parseTree(expression, options), expression, options).toMarkup();

describe("VietaMath MathML output", () => {
    it("uses the editable LME wrapper", () => {
        const output = render("x+1");
        expect(output).toContain('<span class="lme">');
        expect(output).toContain('<math xmlns="http://www.w3.org/1998/Math/MathML"');
        expect(output).toContain('data-range-start="0" data-range-end="3"');
    });

    it("uses editable font wrappers", () => {
        const output = render("\\boldsymbol{A}");
        expect(output).toContain('class="mathfont bold-italic"');
        expect(output).toContain('data-range-start="12" data-range-end="13">A</mi>');
    });

    it("preserves text font semantics", () => {
        const output = render("\\textsf{A}");
        expect(output).toContain('class="textsf text"');
        expect(output).toContain('<mtext data-range-start="8" data-range-end="9">A</mtext>');
    });

    it("marks zero-width phantom content", () => {
        const output = render("\\vphantom{A}");
        expect(output).toContain('class="no-width"');
        expect(output).toContain("<mphantom>");
    });

    it("renders accents as non-stretchy operators", () => {
        const output = render("\\hat{x}");
        expect(output).toContain('<mover accent="true"');
        expect(output).toContain('<mo stretchy="false">^</mo>');
    });
});
