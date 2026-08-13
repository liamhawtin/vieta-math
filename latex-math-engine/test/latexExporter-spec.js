import LatexExporter from "../src/latexExporter";

describe("LatexExporter", () => {
    const exportLatex = (input) => {
        const exporter = new LatexExporter(input);
        return exporter.export();
    };

    describe("mkern simplification", () => {
        it("converts mkern{3mu} to \\,", () => {
            expect(exportLatex("\\mkern{3mu}")).toBe("\\,");
        });

        it("converts mkern{7mu} to \\:\\,", () => {
            expect(exportLatex("\\mkern{7mu}")).toBe("\\,\\:");
        });

        it("leaves non-integer mkern{3.5mu} unchanged", () => {
            expect(exportLatex("\\mkern{3.5mu}")).toBe("\\mkern3.5mu");
        });

        it("leaves small mkern{2mu} unchanged", () => {
            expect(exportLatex("\\mkern{2mu}")).toBe("\\mkern2mu");
        });

        it("leaves negative mkern{-6mu} unchanged", () => {
            expect(exportLatex("\\mkern{-6mu}")).toBe("\\mkern-6mu");
        });

        it("leaves large mkern{45mu} unchanged", () => {
            expect(exportLatex("\\mkern{45mu}")).toBe("\\mkern45mu");
        });

        it("basic test inside script", () => {
            expect(exportLatex("x^{\\mkern{1mu}}")).toBe("x^{\\mkern1mu}");
        });

        it("basic test inside script 2", () => {
            expect(exportLatex("x^{\\mkern{1mu}x}")).toBe("x^{\\mkern1mu x}");
        });
    });

    describe("operatorname simplification", () => {
        it("converts operatorname{sin} to sin", () => {
            expect(exportLatex("\\operatorname@{sin}")).toBe("\\sin");
        });

        it("converts operatorname in superscript", () => {
            expect(exportLatex("x^{x^{\\operatornamewithlimits{lim}}}"))
            .toBe("x^{x^{\\lim}}");
        });

        it("converts operatorname{cos} to cos", () => {
            expect(exportLatex("\\operatorname@{cos}")).toBe("\\cos");
        });

        it("leaves unknown operatorname untouched but valid", () => {
            expect(exportLatex("\\operatorname@{mystery}")).toBe("\\operatorname{mystery}");
        });

        it("converts operatornamewithlimits{lim\\,sup} to limsup", () => {
            expect(exportLatex("\\operatornamewithlimits{lim \\,sup}")).toBe("\\limsup");
        });

        it("converts \\operatornamewithlimits{lim\\mkern{3mu}sup} to limsup", () => {
            expect(exportLatex("\\operatornamewithlimits{lim \\mkern{3mu} sup}")).toBe("\\limsup");
        });

        it("misc 1", () => {
            expect(exportLatex("\\boldsymbol{\\theta} x^{\\operatornamewithlimits{lim}}"))
            .toBe("\\boldsymbol{\\theta} x^{\\lim}");
        });

    });

    describe("internal command removal", () => {
        it("removes @ prefixed internal commands", () => {
            expect(exportLatex("\\@char{65}")).toBe("\\char65");
        });
    });

    describe("mathrel simplification", () => {
        it("converts mathrel{|} to \\mid", () => {
            expect(exportLatex("\\mathrel{|}")).toBe("\\mid");
        });

        it("leaves other mathrel arguments unchanged", () => {
            expect(exportLatex("\\mathrel{=}")).toBe("\\mathrel{=}");
        });
    });

    // and for sub "_"
    describe("superscript simplification", () => {
        it("unwraps single-character superscript", () => {
            expect(exportLatex("a^{x}")).toBe("a^x");
        });

        it("unwraps single-character superscript", () => {
            expect(exportLatex("a^{x^{y}}")).toBe("a^{x^y}");
        });

        it("converts ^{\\prime\\prime} into apostrophes", () => {
            expect(exportLatex("a^{\\prime\\prime}")).toBe("a''");
        });

        it("leaves multi-token superscript unchanged", () => {
            expect(exportLatex("a^{bc}")).toBe("a^{bc}");
        });

        it("leaves sandwiched prime superscript unchanged", () => {
            expect(exportLatex("a^{x\\prime y}")).toBe("a^{x\\prime y}");
        });
    });

    describe("left/right and middle normalization", () => {
        it("collapses a simple left-middle-right structure", () => {
            expect(exportLatex("\\left. \\middle| x \\right."))
                .toBe("\\left| x \\right.");
        });

        it("collapses multiple middles with mixed delimiters (|, \\langle, \\rangle)", () => {
            expect(exportLatex("\\left. \\middle| a \\middle\\langle b \\middle\\rangle \\right."))
                .toBe("\\left| a \\middle\\langle b \\right\\rangle");
        });

        it("does not alter already simplified expressions", () => {
            expect(exportLatex("\\left| x \\right|"))
                .toBe("\\left| x \\right|");
        });

        it("removes middles in fragments with single-char delimiters", () => {
            expect(exportLatex("a \\middle| b \\middle\\} c"))
                .toBe("a | b \\} c");
        });

        it("removes middles in fragments with multi-char delimiters", () => {
            expect(exportLatex("a \\middle\\langle b \\middle\\rangle c"))
                .toBe("a \\langle b \\rangle c");
        });

        it("two control seq based ones", () => {
            expect(exportLatex("\\left.\\middle\\{{\\frac{a}{b}}\\middle\\}\\right.-\\left.\\middle\\{{\\frac{a}{b}}\\middle\\}\\right."))
                .toBe("\\left\\{{\\frac{a}{b}}\\right\\}-\\left\\{{\\frac{a}{b}}\\right\\}");
        });

        it("reconstructs multiple \\lfloor groups correctly", () => {
            expect(
                exportLatex(
                    "c=\\left.\\middle\\lfloor{\\frac{year}{400}}\\middle\\rfloor\\right.-\\left.\\middle\\lfloor{\\frac{year}{100}}\\middle\\rfloor\\right."
                )
            ).toBe(
                "c=\\left\\lfloor{\\frac{year}{400}}\\right\\rfloor-\\left\\lfloor{\\frac{year}{100}}\\right\\rfloor"
            );
        });

    });

    describe("rule normalization (mu → em)", () => {
        it("converts simple rule dimensions from mu to em", () => {
            expect(exportLatex("\\rule{18mu}{36mu}"))
                .toBe("\\rule{1em}{2em}");
        });

        it("handles rule with shift argument", () => {
            expect(exportLatex("\\rule[9mu]{18mu}{18mu}"))
                .toBe("\\rule[0.5em]{1em}{1em}");
        });

        it("rounds to two decimals when needed", () => {
            expect(exportLatex("\\rule{7mu}{5mu}"))
                .toBe("\\rule{0.39em}{0.28em}");
        });
    });

    describe("environment denormalization", () => {

        it("denormalizes a simple cases environment", () => {
            const input = "\\left\\{\\mkern-10mu" +
                        "\\begin{array}{ll}" +
                        "{x}&{1}\\\\[0.25em]" +
                        "{y}&{2}" +
                        "\\end{array}" +
                        "\\right.";

            expect(exportLatex(input)).toBe("\\begin{cases}x & 1 \\\\ y & 2\\end{cases}");
        });

        it("denormalizes a cases environment with extra gap beyond baseline", () => {
            const input = "\\left\\{\\mkern-10mu" +
                        "\\begin{array}{ll}" +
                        "{x}&{1}\\\\[0.5em]" +
                        "{y}&{2}" +
                        "\\end{array}" +
                        "\\right.";

            expect(exportLatex(input)).toBe("\\begin{cases}x & 1 \\\\ y & 2\\end{cases}");
        });

        it("denormalizes a cases environment regardless of row gap", () => {
            const input = "\\left\\{\\mkern-10mu" +
                        "\\begin{array}{ll}" +
                        "{x}&{1}\\\\[0.1em]" +
                        "{y}&{2}" +
                        "\\end{array}" +
                        "\\right.";

            expect(exportLatex(input)).toBe("\\begin{cases}x & 1 \\\\ y & 2\\end{cases}");
        });

        it("denormalizes a pmatrix environment", () => {
            const input = "\\left(\\mkern-10mu" +
                        "\\begin{array}{cc}" +
                        "{a}&{b}\\\\[1em]" +
                        "{c}&{d}" +
                        "\\end{array}" +
                        "\\mkern-10mu\\right)";

            expect(exportLatex(input)).toBe("\\begin{pmatrix}a & b \\\\ c & d\\end{pmatrix}");
        });

        it("denormalizes a subarray{c} into a substack", () => {
            const input = "\\begin{subarray}{c}" +
                        "{i=1} \\\\ " +
                        "{i \\\\text{ odd}}" +
                        "\\end{subarray}";

            expect(exportLatex(input)).toBe("\\substack{i=1 \\\\ i \\\\text{ odd}}");
        });

        it("leaves a smallmatrix unchanged", () => {
            const input = "\\begin{smallmatrix}{1}&{0}\\\\{0}&{1}\\end{smallmatrix}";

            expect(exportLatex(input)).toBe("\\begin{smallmatrix}{1}&{0}\\\\{0}&{1}\\end{smallmatrix}");
        });

        it("handles nested environments (pmatrix inside cases)", () => {
            const input = "\\left\\{\\mkern-10mu" +
                        "\\begin{array}{l}" +
                        "{\\left(\\mkern-10mu\\begin{array}{c}{a}\\\\{b}\\end{array}\\mkern-10mu\\right)}" +
                        "\\\\[0.25em]" +
                        "{c}" +
                        "\\end{array}" +
                        "\\right.";

            expect(exportLatex(input)).toBe("\\begin{cases}\\begin{pmatrix}a \\\\ b\\end{pmatrix} \\\\ c\\end{cases}");
        });
    });

    describe("merge math fonts", () => {
        it("merges 2+ consecutive fonts", () => {
            expect(exportLatex("\\mathsf{A}\\mathsf{b}\\mathsf{c}"))
                .toEqual("\\mathsf{Abc}");
        });

        it("leaves different fonts separate", () => {
            expect(exportLatex("\\mathsf{A}\\mathbf{b}\\mathbf{C}"))
                .toEqual("\\mathsf{A}\\mathbf{bC}");
        });

        it("merges inside superscripts", () => {
            expect(exportLatex("x^{\\mathbf{A}\\mathbf{B}}"))
                .toEqual("x^{\\mathbf{AB}}");
        });

        it("merges inside superscripts", () => {
            expect(exportLatex("\\mathrm{\\mu}\\mathrm{A}"))
                .toEqual("\\mathrm{\\mu A}");
        });

    });

});
