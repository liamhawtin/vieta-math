/* eslint max-len:0 */

import LatexNormalizer from "../src/expandLatexMacros";

function normalize(expression) {
    return new LatexNormalizer(expression).normalize();
}

function noWhite(str) {
    return str.replace(/\s+/g, '').trim();
}


describe("normalize function", function() {
    it("should return an empty string unchanged", function() {
        expect(normalize("")).toEqual("");
    });

    it("should wrap single-character arguments in braces", function() {
        expect(normalize("\\frac ab")).toEqual("\\frac{a}{b}");
        expect(normalize("\\frac a b")).toEqual("\\frac{a}{b}");
        expect(normalize("\\sqrt a")).toEqual("\\sqrt{a}");
    });


    it("should leave already wrapped arguments unchanged", function() {
        expect(normalize("\\frac{a}{b}")).toEqual("\\frac{a}{b}");
        expect(normalize("\\sqrt{x}")).toEqual("\\sqrt{x}");
    });


    it("should handle nested functions correctly", function() {
        expect(normalize("\\frac{\\sqrt a} b")).toEqual("\\frac{\\sqrt{a}}{b}");
        expect(normalize("\\sum^i_n i^2")).toEqual("\\sum^{i}_{n} i^{2}");
    });

    it("should wrap multiple missing arguments", function() {
        expect(normalize("\\binom ab")).toEqual("\\binom{a}{b}");
    });

    it("should handle functions with optional arguments correctly", function() {
        expect(normalize("\\sqrt[2] a b")).toEqual("\\sqrt[2]{a} b");
    });

    it("should correctly handle mixed spacing", function() {
        expect(normalize("x \\frac a b y")).toEqual("x \\frac{a}{b} y");
        expect(normalize("\\sqrt   x")).toEqual("\\sqrt{x}");
    });

    it("should leave normal text unchanged", function() {
        expect(normalize("x + y = 10")).toEqual("x + y = 10");
    });

    it("should normalize \\mskip to \\mkern", function() {
        expect(normalize("\\mskip10mu")).toEqual("\\mkern{10mu}");
        expect(normalize("\\mskip  5mu")).toEqual("\\mkern{5mu}");
    });

    it("should wrap unbraced \\mkern values in braces", function() {
        expect(normalize("\\mkern10mu")).toEqual("\\mkern{10mu}");
        expect(normalize("\\mkern  3mu")).toEqual("\\mkern{3mu}");
    });

    it("should leave already wrapped kern values untouched", function() {
        expect(normalize("\\mkern{6mu}")).toEqual("\\mkern{6mu}");
        expect(normalize("\\mskip{4mu}")).toEqual("\\mkern{4mu}");
    });

    it("should handle kerns and ordgroups together", function() {
        expect(normalize("x\\mskip3mu y")).toEqual("x\\mkern{3mu} y");
        expect(normalize("\\frac ab \\mskip 5mu z")).toEqual("\\frac{a}{b} \\mkern{5mu} z");
    });

    it("should remove control primitives like \\relax and \\nobreak", function() {
        expect(normalize("\\relax x + y")).toEqual("x + y");
        expect(normalize("x \\nobreak y")).toEqual("x y");
        expect(normalize("\\frac{a}{b} \\relax \\nobreak")).toEqual("\\frac{a}{b}");
        expect(normalize("x \\relax \\nobreak + y")).toEqual("x + y");
    });

    it("should not remove similar but different commands", function() {
        expect(normalize("\\nobreakspace")).toEqual("\\nobreakspace"); // shouldn't be removed
    });

    it("should collapse a top-level \\mathchoice to displaystyle", function() {
        expect(normalize("\\mathchoice{D}{T}{S}{SS}")).toEqual("D");
    });

    it("should collapse \\mathchoice inside superscript to scriptstyle", function() {
        expect(normalize("x^{\\mathchoice{D}{T}{S}{SS}}")).toEqual("x^{S}");
    });

    it("should collapse \\mathchoice inside nested sup^sup to scriptscriptstyle", function() {
        expect(normalize("x^{x^{\\mathchoice{D}{T}{S}{SS}}}")).toEqual("x^{x^{SS}}");
    });

    it("should collapse \\mathchoice inside sup_sub mix correctly", function() {
        expect(normalize("x^{a_{\\mathchoice{D}{T}{S}{SS}}}")).toEqual("x^{a_{SS}}");
        expect(normalize("x_{a^{\\mathchoice{D}{T}{S}{SS}}}")).toEqual("x_{a^{SS}}");
    });

    it("should merge adjacent \\mkern values", function() {
        expect(normalize("x \\mkern{10mu} \\mkern{5mu} y")).toEqual("x \\mkern{15mu} y");
    });

    it("should merge multiple adjacent \\mkern values", function() {
        expect(normalize("x \\mkern{3mu} \\mkern{4mu} \\mkern{5mu} y")).toEqual("x \\mkern{12mu} y");
    });

    /*
    it("should merge adjacent \\mkern values with spaces", function() {
        expect(normalize("x \\mkern{+6mu}    \\mkern{-4mu} y")).toEqual("x \\mkern{2mu} y");
    });
    */

    it("should unwrap single \\op inside an ordgroup", function() {
        expect(normalize("{\\sin}^{2}_{2}")).toEqual("\\operatorname@{sin}^{2}_{2}");
        expect(normalize("{\\sum}^{2}")).toEqual("\\sum_{}^{2}");
    });

    it("should normalize simple left-right delimiters with middle", function() {
        expect(normalize("\\left( x \\right)")).toEqual("\\left.\\middle( x \\middle) \\right.");
        expect(normalize("\\left[ x \\right]")).toEqual("\\left.\\middle[ x \\middle] \\right.");
        expect(normalize("\\left| x \\right|")).toEqual("\\left.\\middle| x \\middle| \\right.");
    });

    it("should normalize multi-command delimiters with middle", function() {
        expect(normalize("\\left\\langle x \\right\\rangle")).toEqual("\\left.\\middle\\langle x \\middle\\rangle\\right.");
        expect(normalize("\\left\\{ x \\right\\}")).toEqual("\\left.\\middle\\{ x \\middle\\} \\right.");
    });

    it("should handle mixed nesting correctly", function() {
        expect(normalize("\\left( \\frac{a}{b} \\right)")).toEqual("\\left.\\middle( \\frac{a}{b} \\middle) \\right.");
        expect(normalize("\\left\\langle \\sqrt{x} \\right\\rangle")).toEqual("\\left.\\middle\\langle\\sqrt{x} \\middle\\rangle\\right.");
    });

    it("should normalize with irregular spacing after \\left and \\right", function() {
        expect(normalize("\\left     ( x \\right      )")).toEqual("\\left.\\middle( x \\middle) \\right.");
        expect(normalize("\\left      \\langle x \\right        \\rangle")).toEqual("\\left.\\middle\\langle x \\middle\\rangle\\right.");
        expect(normalize("\\left   \\{ x \\right     \\}")).toEqual("\\left.\\middle\\{ x \\middle\\} \\right.");
    });

    it("should not break expressions using arrow commands near delimiters", function() {
        expect(normalize("\\left( a \\rightarrow b \\right)")).toEqual("\\left.\\middle( a \\rightarrow b \\middle) \\right.");
        expect(normalize("\\left[ f(x) \\rightarrow y \\right]")).toEqual("\\left.\\middle[ f(x) \\rightarrow y \\middle] \\right.");
    });

    it("should strip equation and equation* environments", function() {
        expect(normalize("\\begin{equation} x + y = z \\end{equation}")).toEqual("x + y = z");
        expect(normalize("\\begin{equation*} a = b + c \\end{equation*}")).toEqual("a = b + c");
    });

    it("should convert gather and gather* to array with no alignment", function() {
        expect(noWhite(normalize("\\begin{gather} a \\\\ b \\end{gather}")))
            .toEqual(noWhite("\\begin{array}{}{a}\\\\{b}\\end{array}"));
        expect(noWhite(normalize("\\begin{gather*} {f(x) = x} \\\\ {g(x) = x+1} \\end{gather*}")))
            .toEqual(noWhite("\\begin{array}{}{f(x) = x}\\\\{g(x) = x+1}\\end{array}"));
    });

    /*
    it("should normalize cases environment with dynamic column alignment", function() {
        expect(noWhite(normalize("\\begin{cases} a & b \\\\ c & d & e \\\\ f & g \\end{cases}")))
            .toEqual(noWhite("\\left.\\middle\\{\\mkern{-10mu}\\begin{array}{lll}{a}&{b}\\\\[0.25em]{c}&{d}&{e}\\\\[0.25em]{f}&{g}\\end{array} \\right."));
    });


    it("should normalize nested cases environment", function() {
        expect(noWhite(normalize(`
            \\begin{cases}
                x & \\begin{cases}
                        a & b \\\\
                        c & d
                    \\end{cases} \\\\
                y & z
            \\end{cases}
        `))).toEqual(noWhite(`
            \\left.\\middle\\{\\mkern{-10mu}\\begin{array}{ll}
                {x} & {\\left.\\middle\\{\\mkern{-10mu}\\begin{array}{ll}
                        {a} & {b}\\\\[0.25em]
                        {c} & {d}
                    \\end{array} \\right.} \\\\[0.25em]
                {y} & {z}
            \\end{array} \\right.
        `));
    });
    */

    it("should normalize plain matrix to array", function() {
        expect(noWhite(normalize("\\begin{matrix} 1 & 2 \\\\ 3 & 4 \\end{matrix}")))
            .toEqual("\\begin{array}{cc}{1}&{2}\\\\{3}&{4}\\end{array}");
    });

    /*
    it("should normalize pmatrix to array with parentheses", function() {
        expect(noWhite(normalize("\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}")))
            .toEqual(noWhite("\\left.\\middle(\\mkern{-10mu}\\begin{array}{cc}{a}&{b}\\\\{c}&{d}\\end{array}\\mkern{-10mu}\\middle)\\right."));
    });
    */

    it("should fill only empty cells in a partially filled array", function() {
        expect(noWhite(normalize("\\begin{array}{} & {a} \\\\ & \\end{array}")))
            .toEqual("\\begin{array}{}{}&{a}\\\\{}&{}\\end{array}");
    });

    it("should dissolve \\text commands in text mode", function() {
        expect(normalize("\\text{abc}")).toEqual("\\text{abc}");
        expect(normalize("\\text{\\text{abc}}")).toEqual("\\text{abc}");
    });

    it("should wrap non-\\text font commands in math mode with \\text", function() {
        expect(normalize("\\textbf{bold}")).toEqual("\\text{\\textbf{bold}}");
        expect(normalize("\\textit{italic}")).toEqual("\\text{\\textit{italic}}");
        expect(normalize("\\texttt{mono}")).toEqual("\\text{\\texttt{mono}}");
    });

    it("should handle nested text commands correctly", function() {
        expect(normalize("\\text{g\\textbf{hi}}")).toEqual("\\text{g\\textbf{hi}}");
    });

    it("should handle multiple text font commands", function() {
        expect(normalize("\\textbf{bold} \\textit{italic}")).toEqual("\\text{\\textbf{bold}} \\text{\\textit{italic}}");
        expect(normalize("\\textsf{sans} \\texttt{mono}")).toEqual("\\text{\\textsf{sans}} \\text{\\texttt{mono}}");
    });

    it("should dissolve redundant outer braces", () => {
        expect(normalize("{x}")).toEqual("x");
        expect(normalize("{{x}}")).toEqual("x");
        expect(normalize("\\frac{{a}{b}{c}}{x}")).toEqual("\\frac{abc}{x}");
        expect(normalize("\\sqrt{{a + b}}")).toEqual("\\sqrt{a + b}");
        expect(normalize("{a + b}^{2}")).toEqual("a + b^{2}");
        expect(normalize("{}^{2}")).toEqual("{}^{2}");
        expect(normalize("\\pi{a}")).toEqual("\\pi a");
        // But not if it was an infix
        expect(normalize("a {b \\over c} d")).toEqual("a {{b} \\over{c}} d");
    });

    it("should normalize rule units to mu", function() {
        expect(normalize("\\rule[2pt]{8pt}{4pt}")).toEqual("\\rule[3.6mu]{14.4mu}{7.2mu}");
    });

    it("should convert width-only rules to mkern", function() {
        expect(normalize("\\rule{10pt}{0pt}")).toEqual("\\mkern{18mu}");
        expect(normalize("\\rule{1em}{0em}")).toEqual("\\mkern{18mu}");
    });

    it("should handle rules in complex expressions", function() {
        expect(normalize("\\frac{a}{b} \\rule{5pt}{0pt} \\sqrt{x}"))
            .toEqual("\\frac{a}{b} \\mkern{9mu} \\sqrt{x}");
    });

    it("merges trailing empty-base ^\\prime into previous supsub", () => {
        expect(normalize("f^{\\prime\\prime}{}^{\\prime}"))
            .toEqual("f^{\\prime\\prime\\prime}");

        expect(normalize("f^{\\prime\\prime}^{\\prime}"))
            .toEqual("f^{\\prime\\prime\\prime}");

        expect(normalize("f^{\\prime}{}^{\\prime\\prime\\prime}"))
            .toEqual("f^{\\prime\\prime\\prime\\prime}");

        expect(normalize("f^{\\prime\\prime}\'"))
            .toEqual("f^{\\prime\\prime\\prime}");

        expect(normalize("f^{\\prime\\prime}x{}^{\\prime}"))
            .toEqual("f^{\\prime\\prime}x{}^{\\prime}");

        expect(normalize("f^{\\prime\\prime}x^{\\prime}"))
            .toEqual("f^{\\prime\\prime}x^{\\prime}");

        expect(normalize("\\frac{f^{\\prime}{}^{\\prime}}{2}"))
            .toEqual("\\frac{f^{\\prime\\prime}}{2}");

        expect(normalize("f''(x)"))
            .toEqual("f^{\\prime\\prime}(x)");

        expect(normalize("f''(x) + f''(x)"))
            .toEqual("f^{\\prime\\prime}(x) + f^{\\prime\\prime}(x)");
    });

    it("should dissolve a phantom wrapping a width=0 rule", function() {
        expect(normalize("\\phantom{\\rule{0mu}{9mu}}"))
            .toEqual("\\rule{0mu}{9mu}");
    });


    it("should dissolve a phantom wrapping a height=0 rule", function() {
        expect(normalize("\\phantom{\\rule{9mu}{0pt}}"))
            .toEqual("\\mkern{9mu}");
    });

    it("should not dissolve a phantom if rule has both width and height > 0", function() {
        // 5pt -> 9mu for both width and height
        expect(normalize("\\phantom{\\rule{9mu}{9mu}}"))
            .toEqual("\\phantom{\\rule{9mu}{9mu}}");
    });

    /*
    it("should correctly normalize nested braces inside arrays", function() {
        const input = "\\left.\\middle\\{ \\mkern{-10mu}\\begin{array}{cc}{} & {\\left\\{ \\mkern{-10mu}\\begin{array}{cc} a & b \\\\ c & d \\end{array}\\mkern{-10mu} \\right\\}}\\\\ {}& {}\\end{array}\\mkern{-10mu} \\middle\\} \\right.";
        const expected = "\\left.\\middle\\{ \\mkern{-10mu}\\begin{array}{cc}{} & {\\left.\\middle\\{ \\mkern{-10mu}\\begin{array}{cc}{a} & {b} \\\\ {c} & {d} \\end{array}\\mkern{-10mu} \\middle\\} \\right.}\\\\ {}& {}\\end{array}\\mkern{-10mu} \\middle\\} \\right.";
        expect(normalize(input)).toEqual(expected);
    });
    */

    it("should correctly handle multi-letter delimiters like \\\\right\\\\Vert", function() {
        const input = "\\left( x \\right\\Vert";
        const expected = "\\left.\\middle( x \\middle\\Vert\\right.";
        expect(normalize(input)).toEqual(expected);
    });

    it("convert pt row gap to em", function() {
        const input = "\\begin{array}{cc}{} & {}\\\\[12pt]{} & {}\\end{array}";
        const expected = "\\begin{array}{cc}{} & {}\\\\[1.2em]{} & {}\\end{array}";
        expect(normalize(input)).toEqual(expected);
    });

    /*
    it("normalize Bmatrix row gaps in em", function() {
        const input =
            "\\begin{Bmatrix} a & b \\\\[1em] c & d \\\\[2em] e & f \\end{Bmatrix}";
        const expected =
            "\\left.\\middle\\{ \\mkern{-10mu}\\begin{array}{cc}{a} & {b} \\\\[1em]{c} & {d} \\\\[2em]{e} & {f} \\end{array}\\mkern{-10mu} \\middle\\} \\right.";
        expect(normalize(input)).toEqual(expected);
    });

    it("normalize cases row gaps in em with baseline", function() {
        const input =
            "\\begin{cases} x & 1 \\\\[0.5em] y & 2 \\\\ z & 3 \\\\[1em] \\end{cases}";
        const expected =
            "\\left.\\middle\\{\\mkern{-10mu}\\begin{array}{ll}" +
            "{x} & {1} \\\\[0.75em]" +
            "{y} & {2} \\\\[0.25em]" +
            "{z} & {3} \\\\[1em]" +
            "\\end{array} \\right.";
        expect(normalize(input)).toEqual(expected);
    });
    */

    it("strips \\mathrm around a digit", () => {
        expect(normalize("\\mathrm{2}")).toEqual("2");
    });

    it("strips \\mathit around a single Latin letter", () => {
        expect(normalize("\\mathit{x}")).toEqual("x");
        expect(normalize("\\mathit{A}")).toEqual("A");
    });

    it("strips \\mathrm around upright symbols (e.g. \\pi, \\Pi)", () => {
        expect(normalize("\\mathit{\\pi}")).toEqual("\\pi");
        expect(normalize("\\mathrm{\\Pi}")).toEqual("\\Pi");
    });

    it("don't collapse whitespace after period in text mode", () => {
        expect(normalize("a\\text{b. c}")).toEqual("a\\text{b. c}");
    });

    it("some operator stuff", () => {
        expect(normalize("\\sin x")).toEqual("\\operatorname@{sin} x");
        expect(normalize("\\operatorname{sin}")).toEqual("\\operatorname@{sin}");
        expect(normalize("\\operatorname@{sin}")).toEqual("\\operatorname@{sin}");
        expect(normalize("\\operatornamewithlimits{lim}")).toEqual("\\operatornamewithlimits{lim}");
        expect(normalize("\\operatornamewithlimits{sup}")).toEqual("\\operatornamewithlimits{sup}");
        expect(normalize("\\sup")).toEqual("\\operatornamewithlimits{sup}");
    });

    it("Should not autocomplete inside control sequences (e.g. \\ominus)", () => {
        expect(normalize("\\ominus")).toEqual("\\ominus");
        expect(normalize("a\\ominus b")).toEqual("a\\ominus b");
    });

    it("Should not autocomplete inside text", () => {
        expect(normalize("\\text{lim}")).toEqual("\\text{lim}");
    });

    it("split math fonts", () => {
        expect(normalize("a\\mathbin{b}\\mathtt{c}\\mathtt{def}\\text{g}"))
        .toEqual("a\\mathbin{b}\\mathtt{c}\\mathtt{d}\\mathtt{e}\\mathtt{f}\\text{g}");

        expect(normalize("\\mathtt{\\mathtt{t}}"))
        .toEqual("\\mathtt{t}");

        expect(normalize("\\mathsf{A\\mathbf{bc}D}"))
        .toEqual("\\mathsf{A}\\mathsf{b}\\mathsf{c}\\mathsf{D}");

        expect(normalize("\\mathtt{\\mathbf{\\mathsf{x}}}"))
        .toEqual("\\mathtt{x}");

        expect(normalize("x^{\\mathtt{abc}}"))
        .toEqual("x^{\\mathtt{a}\\mathtt{b}\\mathtt{c}}");
    });

    it("ensures \\sum always has both subscript and superscript", () => {
        // bare sum
        expect(normalize("\\sum")).toEqual("\\sum_{}^{}");

        // only superscript
        //expect(normalize("\\sum^n")).toEqual("\\sum_{}^{n}");

        // only subscript
        //expect(normalize("\\sum_n")).toEqual("\\sum_{n}^{}");

        // reversed order
        //expect(normalize("\\sum_n^m")).toEqual("\\sum_{n}^{m}");
        //expect(normalize("\\sum^m_n")).toEqual("\\sum^{m}_{n}");
    });

});
