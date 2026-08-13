const symbol_categories = {
  "tabs": [
    {
      "id": "basic_math",
      "name": "Basic Math",
      "label": "Basic",
      "symbol": "a+b=c",
      "categories": [
        {
          "name": "Common Operators",
          "symbols": [
            { "latex": "+", "keywords": ["plus", "addition", "add"] },
            { "latex": "-", "keywords": ["minus", "subtraction", "subtract"] },
            { "latex": "\\cdot", "keywords": ["center dot", "times", "multiply", "dot product"] },
            { "latex": "\\times", "keywords": ["times", "multiplication", "cross"] },
            { "latex": "/", "keywords": ["forward slash", "divided", "division", "fraction", "solidus", "slash"] },
            { "latex": "=", "keywords": ["equals", "equality", "is equal to"] },
            { "latex": "<", "keywords": ["less than", "inequality", "comparison"] },
            { "latex": ">", "keywords": ["greater than", "inequality", "comparison"] },
            { "latex": "\\prec", "keywords": ["precedes", "ordering", "comparison"] },
            { "latex": "\\succ", "keywords": ["succeeds", "ordering", "comparison"] },
            { "latex": "\\gtrless", "keywords": ["greater than or less than", "inequality", "comparison"] },
            { "latex": "\\pm", "keywords": ["plus minus", "plus or minus", "uncertainty"] },
            { "latex": "\\propto", "keywords": ["proportional to", "proportion", "relation"] },
            { "latex": "\\circ", "keywords": ["composition", "opening", "open", "hadamard product"] },
            { "latex": "\\bullet", "keywords": ["dot product", "closing", "close"] },
            { "latex": "\\mid", "keywords": ["mid", "such that", "conditional", "delimiter"] },
          ]
        },
        {
          "name": "Common Structures",
          "symbols": [
            {
              "latex": "\\frac{Ꞩ1}{Ꞩ2}",
              "keywords": ["fraction", "divided", "division", "rational"],
              "priority": 1,
              "id": "frac"
            },
            {
              "latex": "\\sqrt{Ꞩ1}",
              "keywords": ["square root", "sqrt", "radical"],
              "weight": 1.2
            },
            {
              "latex": "\\sqrt[Ꞩ2]{Ꞩ1}",
              "default_args": ["x", "n"],
              "keywords": ["root", "radical"]
            },
            {
              "latex": "\\binom{Ꞩ1}{Ꞩ2}",
              "keywords": ["binomial", "combination", "choose"]
            }
          ]
        },
        {
          "name": "Linear Algebra",
          "symbols": [
            {
              "latex": "\\dagger",
              "keywords": ["dagger", "adjoint", "hermitian", "conjugate transpose", "linear algebra"]
            },
            {
              "latex": "\\vec{Ꞩ1}",
              "keywords": ["vector", "linear algebra", "arrow"]
            },
            {
              "latex": "\\det",
              "keywords": ["determinant", "matrix", "linear algebra"]
            },
            {
              "latex": "\\dim",
              "keywords": ["dimension", "vector space", "linear algebra"]
            },
            {
              "latex": "\\ker",
              "keywords": ["kernel", "null space", "linear algebra"]
            },
            {
              "latex": "\\intercal",
              "keywords": ["transpose", "matrix transpose", "linear algebra"]
            }
          ]
        },
        {
          "name": "Misc",
          "symbols": [
            {
              "latex": "\\cdots",
              "keywords": ["centered dots", "ellipsis", "continuation"]
            },
            {
              "latex": "\\ldots", "keywords": ["ellipsis", "continuation"]
            },
            {
              "latex": "\\vdots",
              "keywords": ["vertical dots", "ellipsis", "continuation"]
            },
            {
              "latex": "\\ddots",
              "keywords": ["diagonal dots", "ellipsis", "continuation"]
            },
            { "latex": "\\oplus", "keywords": ["direct sum", "exclusive or", "xor", "dilation", "dilate", "expand", "union-like"] },
            { "latex": "\\ominus", "keywords": ["erosion", "erode", "shrink", "difference", "subtract", "remove"] },
            { "latex": "\\oslash", "keywords": ["circle slash", "operator", "binary"] },
            { "latex": "\\ast", "keywords": ["asterisk", "operator", "product", "multiplication", "convolution", "binary operation", "special product", "group operation"] },
            { "latex": "\\amalg", "keywords": ["amalgamation", "operator", "coproduct"] },
            { "latex": "\\Lsh", "keywords": ["L shift", "operator", "binary"] },
            { "latex": "\\bigcirc", "keywords": ["big circle", "operator", "binary"] },
            { "latex": "\\circledast", "keywords": ["circled asterisk", "operator", "binary"] },
            { "latex": "\\circledcirc", "keywords": ["circled circle", "operator", "binary"] },
            { "latex": "\\circleddash", "keywords": ["circled dash", "operator", "binary"] },
            { "latex": "\\boxdot", "keywords": ["box dot", "operator", "binary"] },
            { "latex": "\\lhd", "keywords": ["left triangle", "operator", "binary"] },
            { "latex": "\\rhd", "keywords": ["right triangle", "operator", "binary"] },
            { "latex": "\\boxminus", "keywords": ["box minus", "operator", "binary"] },
            { "latex": "\\boxplus", "keywords": ["box plus", "operator", "binary"] },
            { "latex": "\\diamond", "keywords": ["diamond", "operator", "binary"] },
            { "latex": "\\Diamond", "keywords": ["Diamond", "modal operator", "possibility"] },
            { "latex": "\\divideontimes", "keywords": ["divide on times", "division", "operator"] },
            { "latex": "\\dotplus", "keywords": ["dot plus", "addition", "operator"] },
            { "latex": "\\star", "keywords": ["star", "operator", "binary"] },
            { "latex": "\\unlhd", "keywords": ["unlhd", "left normal factor", "operator", "binary"] },
            { "latex": "\\unrhd", "keywords": ["unrhd", "right normal factor", "operator", "binary"] },
            { "latex": "\\uplus", "keywords": ["uplus", "disjoint union", "operator", "binary"] },
            { "latex": "\\veebar", "keywords": ["veebar", "exclusive or", "operator", "binary"] },
            { "latex": "^{\\circ}", "keywords": ["degree"] }
          ]
        }
      ]
    },
    {
      "id": "calculus_functions",
      "name": "Calculus & Functions",
      "label": "Functions",
      "symbol": "f(x)",
      "categories": [
        {
          "name": "Common Functions",
          "symbols": [
            {
              "latex": "\\int",
              "keywords": ["integral", "calculus", "antiderivative"]
            },
            {
              "latex": "\\sum",
              "keywords": ["summation", "series", "sum", "sigma"]
            },
            {
              "latex": "\\prod",
              "keywords": ["product", "multiplication", "calculus"]
            },
            {
              "latex": "\\sin",
              "keywords": ["sine", "trig", "function"]
            },
            {
              "latex": "\\cos",
              "keywords": ["cosine", "trig", "function"]
            },
            {
              "latex": "\\tan",
              "keywords": ["tangent", "trig", "function"]
            },
            {
              "latex": "\\log",
              "keywords": ["logarithm", "log", "function"]
            },
            {
              "latex": "\\Im",
              "keywords": ["imaginary part", "complex analysis", "function"]
            },
            {
              "latex": "\\Re",
              "keywords": ["real part", "complex analysis", "function"]
            },
            {
              "latex": "\\max",
              "keywords": ["maximum", "optimization", "function"]
            },
            {
              "latex": "\\min",
              "keywords": ["minimum", "optimization", "function"]
            },
            {
              "latex": "\\exp",
              "keywords": ["exponential", "e", "function"]
            },
            {
              "latex": "\\lim",
              "keywords": ["limit", "approach", "calculus"]
            },
            {
              "latex": "\\hom",
              "keywords": ["homomorphism", "algebra", "function"]
            },
            {
              "latex": "\\inf",
              "keywords": ["infimum", "greatest lower bound", "function"]
            },
            {
              "latex": "\\sup",
              "keywords": ["supremum", "least upper bound", "function"]
            },
          ]
        },
        {
          "name": "Calculus Notation",
          "symbols": [
            {
              "latex": "\\frac{d}{dx}",
              "keywords": ["derivative", "calculus", "rate of change"]
            },
            {
              "latex": "\\partial",
              "keywords": ["partial", "partial derivative", "calculus"]
            },
            {
              "latex": "\\nabla",
              "keywords": ["nabla", "gradient", "del"]
            },
            {
              "latex": "\\dot{Ꞩ1}",
              "keywords": ["dot", "derivative"]
            },
            {
              "latex": "\\ddot{Ꞩ1}",
              "keywords": ["double dot", "second derivative"]
            },
            {
              "latex": "\\prime",
              "keywords": ["prime", "derivative"]
            }
          ]
        },
        {
          "name": "Other Functions",
          "symbols": [
            {
              "latex": "\\cot",
              "keywords": ["cotangent", "trig", "function"]
            },
            {
              "latex": "\\csc",
              "keywords": ["cosecant", "trig", "function"]
            },
            {
              "latex": "\\sec",
              "keywords": ["secant", "trig", "function"]
            },
            {
              "latex": "\\bmod",
              "keywords": ["modulo", "remainder", "function"]
            },
            {
              "latex": "\\Pr",
              "keywords": ["probability", "statistics", "function"]
            },
            {
              "latex": "\\gcd",
              "keywords": ["greatest common divisor", "gcd", "function"]
            },
            {
              "latex": "\\coth",
              "keywords": ["hyperbolic cotangent", "hyperbolic", "function"]
            },
            {
              "latex": "\\arg",
              "keywords": ["arg", "argument", "complex", "function"]
            },
            {
              "latex": "\\arg\\max",
              "keywords": ["argmax", "argument maximum", "optimization", "function"]
            },
            {
              "latex": "\\arg\\min",
              "keywords": ["argmin", "argument minimum", "optimization", "function"]
            },
            {
              "latex": "\\injlim",
              "keywords": ["inductive limit", "category theory", "function"]
            },
          ]
        }
      ]
    },
    {
      "id": "letters_alphabets",
      "name": "Letters & Alphabets",
      "label": "Letters",
      "symbol": "\\alpha\\beta",
      "categories": [
        {
          "name": "Greek Letters",
          "symbols": [
            { "latex": "\\alpha", "keywords": ["alpha", "greek", "letter", "coefficient", "angle", "learning rate", "fine structure constant", "significance", "angular acceleration", "thermal expansion"] },
            { "latex": "\\beta", "keywords": ["beta", "greek", "letter", "coefficient", "regression", "statistics", "distribution", "control", "inverse temperature", "beta decay"] },
            { "latex": "\\gamma", "keywords": ["gamma", "greek", "letter", "constant", "gamma function", "Lorentz", "photon", "probability distribution", "euler-mascheroni", "relativistic factor"] },
            { "latex": "\\delta", "keywords": ["delta", "greek", "letter", "change", "Dirac impulse", "Kronecker", "variation", "infinitesimal", "difference", "delta function"] },
            { "latex": "\\epsilon", "keywords": ["epsilon", "greek", "letter", "small", "proof", "tolerance", "strain", "permittivity", "error", "emissivity"] },
            { "latex": "\\eta", "keywords": ["eta", "greek", "letter", "efficiency", "viscosity", "invariant", "learning rate", "conformal time"] },
            { "latex": "\\theta", "keywords": ["theta", "greek", "letter", "angle", "parameter", "statistics", "machine learning", "spherical", "step function", "phase"] },
            { "latex": "\\iota", "keywords": ["iota", "greek", "letter", "inclusion", "embedding", "identity"] },
            { "latex": "\\kappa", "keywords": ["kappa", "greek", "letter", "curvature", "conductivity", "condition number"] },
            { "latex": "\\lambda", "keywords": ["lambda", "greek", "letter", "eigenvalue", "wavelength", "Poisson", "multiplier", "lambda calculus", "decay constant", "regularization"] },
            { "latex": "\\mu", "keywords": ["mu", "greek", "letter", "micro", "mean", "friction", "measure", "permeability", "mobility", "chemical potential"] },
            { "latex": "\\nu", "keywords": ["nu", "greek", "letter", "frequency", "degrees of freedom", "neutrino", "kinematic viscosity", "stoichiometric"] },
            { "latex": "\\pi", "keywords": ["pi", "greek", "letter", "ratio", "constant", "product", "probability"] },
            { "latex": "\\rho", "keywords": ["rho", "greek", "letter", "density", "correlation", "spectral radius", "charge density", "resistivity"] },
            { "latex": "\\sigma", "keywords": ["sigma", "greek", "letter", "sum", "standard deviation", "stress", "conductivity", "sigma algebra", "surface tension", "cross-section"] },
            { "latex": "\\tau", "keywords": ["tau", "greek", "letter", "time constant", "torsion", "shear", "circle", "relaxation time", "lifetime"] },
            { "latex": "\\phi", "keywords": ["phi", "greek", "letter", "golden ratio", "angle", "potential", "spherical", "magnetic flux", "work function"] },
            { "latex": "\\xi", "keywords": ["xi", "greek", "letter", "random variable", "damping", "xi function", "correlation length"] },
            { "latex": "\\zeta", "keywords": ["zeta", "greek", "letter", "zeta function", "damping", "damping ratio"] },
            { "latex": "\\psi", "keywords": ["psi", "greek", "letter", "wavefunction", "digamma", "stream function"] },
            { "latex": "\\omega", "keywords": ["omega", "greek", "letter", "last", "frequency", "solid angle", "probability", "angular velocity", "angular frequency"] },
            { "latex": "\\Gamma", "keywords": ["Gamma", "uppercase", "greek", "gamma function", "Christoffel", "relativity"] },
            { "latex": "\\Delta", "keywords": ["Delta", "uppercase", "greek", "change", "Laplacian", "determinant", "discriminant"] },
            { "latex": "\\Theta", "keywords": ["Theta", "uppercase", "greek", "complexity", "asymptotic", "angle"] },
            { "latex": "\\Lambda", "keywords": ["Lambda", "uppercase", "greek", "eigenvalue", "spectrum", "cosmological constant", "triangle"] },
            { "latex": "\\Pi", "keywords": ["Pi", "uppercase", "greek", "product", "topology", "fundamental group", "rect", "rectangle", "pulse"] },
            { "latex": "\\Sigma", "keywords": ["Sigma", "uppercase", "greek", "sum", "covariance", "surface integral"] },
            { "latex": "\\Phi", "keywords": ["Phi", "uppercase", "greek", "flux", "potential", "golden ratio", "spherical"] },
            { "latex": "\\Psi", "keywords": ["Psi", "uppercase", "greek", "wavefunction", "polygamma", "stream"] },
            { "latex": "\\Omega", "keywords": ["Omega", "uppercase", "greek", "ohm", "sample space", "asymptotic", "solid angle", "domain", "angular velocity"] },
            { "latex": "\\chi", "keywords": ["chi", "greek", "letter", "chi squared", "distribution", "characteristic function", "Euler characteristic", "indicator", "susceptibility"] },
            { "latex": "\\digamma", "keywords": ["digamma", "greek", "letter", "digamma function"] },
            { "latex": "\\hbar", "keywords": ["h bar", "reduced Planck constant", "quantum", "physics", "spin"] },
            { "latex": "\\imath", "keywords": ["dotless i", "complex number", "letter", "imaginary"] },
            { "latex": "\\jmath", "keywords": ["dotless j", "complex number", "letter", "imaginary", "electrical engineering"] },
            { "latex": "\\Upsilon", "keywords": ["Upsilon", "uppercase", "greek", "meson", "particle physics", "branching ratio"] },
            { "latex": "\\upsilon", "keywords": ["upsilon", "greek", "letter", "velocity", "meson"] },
            { "latex": "\\Xi", "keywords": ["Xi", "uppercase", "greek", "xi function", "random variable", "cascade", "baryon"] }
          ]
        },
        {
          "name": "Math Alphabets",
          "symbols": [
            {
              "latex": "\\mathbb{R}",
              "keywords": ["real numbers", "euclidean space"]
            },
            {
              "latex": "\\mathbb{Z}",
              "keywords": ["integer lattice", "modular arithmetic", "residue class ring", "ring of integers", "discrete group", "indexing set"]
            },
            {
              "latex": "\\mathbb{N}",
              "keywords": ["sequence index", "counting numbers", "natural index set", "summation index", "discrete domain"]
            },
            {
              "latex": "\\mathbb{Q}",
              "keywords": ["rational field", "fraction field", "rational approximation", "number field"]
            },
            {
              "latex": "\\mathbb{C}",
              "keywords": ["complex plane", "complex field", "holomorphic", "complex eigenvalues", "complex hilbert space", "analytic continuation"]
            },
            {
              "latex": "\\mathcal{F}",
              "keywords": ["fourier transform", "sigma algebra", "filtration", "function family", "function space", "field strength tensor"]
            },
            {
              "latex": "\\mathbb{k}",
              "keywords": ["base field", "coefficient field", "scalar field", "algebraic closure", "ground field", "field of definition"]
            },
            {
              "latex": "\\ell",
              "keywords": ["sequence space", "p norm space", "banach space", "normed vector space", "discrete function space"]
            },
            {
              "latex": "\\Finv",
              "keywords": ["F inverse", "function", "special symbol"]
            },
          ]
        },
        {
          "name": "Other",
          "symbols": [
            { "latex": "\\mho", "keywords": ["mho", "inverted omega", "conductance", "physics"] },
            { "latex": "\\aleph", "keywords": ["aleph", "hebrew", "cardinal", "infinity"] },
            { "latex": "\\beth", "keywords": ["beth", "hebrew", "cardinal", "infinity"] },
            { "latex": "\\daleth", "keywords": ["daleth", "hebrew", "cardinal", "infinity"] },
            { "latex": "\\gimel", "keywords": ["gimel", "hebrew", "cardinal", "infinity"] },
            { "latex": "\\infty", "keywords": ["infinity", "unlimited", "endless"] },
            { "latex": "\\wp", "keywords": ["weierstrass p", "power set", "special symbol"] },
            { "latex": "\\wr", "keywords": ["wreath product", "group theory", "operator"] }
          ]
        }
      ]
    },
    {
      "id": "logic_sets",
      "name": "Logic & Set Theory",
      "label": "Logic & Set",
      "symbol": "x\\in A",
      "categories": [
        {
          "name": "Set Operations",
          "symbols": [
            { "latex": "\\in", "keywords": ["element of", "belongs to", "set"] },
            { "latex": "\\ni", "keywords": ["element contains", "reverse element of", "set", "owns"] },
            { "latex": "\\subset", "keywords": ["subset", "proper subset", "contained in"] },
            { "latex": "\\supset", "keywords": ["superset", "proper superset", "contains"] },
            { "latex": "\\cup", "keywords": ["union", "sets", "combine"] },
            { "latex": "\\cap", "keywords": ["intersection", "sets", "common elements"] },
            { "latex": "\\emptyset", "keywords": ["empty set", "null set", "set"] },
            { "latex": "\\setminus", "keywords": ["set minus", "difference", "relative complement"] },
            { "latex": "\\complement", "keywords": ["complement", "set complement", "set theory"] },
            { "latex": "\\bowtie", "keywords": ["bowtie", "join", "relational algebra"] }
          ]
        },
        {
          "name": "Logic & Relations",
          "symbols": [
            { "latex": "\\forall", "keywords": ["for all", "quantifier", "logic"] },
            { "latex": "\\exists", "keywords": ["there exists", "quantifier", "logic"] },
            { "latex": "\\neg", "keywords": ["negation", "not", "logic"] },
            { "latex": "\\wedge", "keywords": ["logical and", "conjunction", "logic"] },
            { "latex": "\\vee", "keywords": ["logical or", "disjunction", "logic"] },
            { "latex": "\\vdash", "keywords": ["turnstile", "proves", "logic"] },
            { "latex": "\\dashv", "keywords": ["dashv", "turnstile", "relation"] },
            { "latex": "\\therefore", "keywords": ["therefore", "conclusion", "logic"] },
            { "latex": "\\because", "keywords": ["because", "reason", "logic"] },
            { "latex": "\\square", "keywords": ["box", "modal logic", "necessity"] },
            { "latex": "\\top", "keywords": ["top", "true", "logic", "maximum"] },
            { "latex": "\\colon", "keywords": ["colon", "relation", "such that"] },
            { "latex": "\\frown", "keywords": ["frown", "relation", "opposite of smile"] },
            { "latex": "\\smile", "keywords": ["smile", "relation", "opposite of frown"] },
            { "latex": "\\Join", "keywords": ["join", "bowtie", "relational algebra"] },
            { "latex": "\\pitchfork", "keywords": ["pitchfork", "relation", "independence"] },
            { "latex": "\\Rsh", "keywords": ["right shift", "relation", "binary"] },
            { "latex": "\\ulcorner", "keywords": ["upper left corner", "corner bracket", "delimiter"] },
            { "latex": "\\urcorner", "keywords": ["upper right corner", "corner bracket", "delimiter"] },
          ]
        },
        {
          "name": "Geometry",
          "symbols": [
            { "latex": "\\perp", "keywords": ["perpendicular", "orthogonal", "geometry"] },
            { "latex": "\\parallel", "keywords": ["parallel", "geometry", "lines"] },
            { "latex": "\\angle", "keywords": ["angle", "geometry", "measure"] },
            { "latex": "\\lozenge", "keywords": ["lozenge", "diamond", "geometry", "shape"] },
            { "latex": "\\triangle", "keywords": ["triangle", "geometry", "shape"] },
            { "latex": "\\triangledown", "keywords": ["inverted triangle", "geometry", "shape"] },
            { "latex": "\\triangleleft", "keywords": ["left triangle", "geometry", "relation"] },
            { "latex": "\\triangleright", "keywords": ["right triangle", "geometry", "relation"] },
            { "latex": "\\cong", "keywords": ["congruent", "geometry", "equal shape and size"] },
            { "latex": "\\sim", "keywords": ["similar", "tilde", "~", "geometry", "same shape", "distributed", "distribution", "follows", "equivalent", "equivalence", "relation"] },
            { "latex": "\\lrcorner", "keywords": ["lower right corner", "corner bracket", "delimiter"] },
            { "latex": "\\llcorner", "keywords": ["lower left corner", "corner bracket", "delimiter"] },
          ]
        },
      ]
    },
    {
      "id": "arrows_mappings",
      "name": "Arrows & Mappings",
      "label": "Arrows",
      "symbol": "A\\to B",
      "categories": [
        {
          "name": "Common Arrows",
          "symbols": [
            { "latex": "\\rightarrow", "keywords": ["arrow", "function", "maps to", "to"] },
            { "latex": "\\leftrightarrow", "keywords": ["double arrow", "equivalence", "relation"] },
            { "latex": "\\leftarrow", "keywords": ["left arrow", "reverse", "mapping", "assignment", "gets"] },
            { "latex": "\\Rightarrow", "keywords": ["double arrow", "implies", "logic"] },
            { "latex": "\\Leftrightarrow", "keywords": ["equivalent", "if and only if", "equivalence", "iff", "bi-implication", "biconditional"] },
            { "latex": "\\Leftarrow", "keywords": ["left double arrow", "implied by", "logic"] },
            { "latex": "\\uparrow", "keywords": ["up arrow", "increase", "direction"] },
            { "latex": "\\downarrow", "keywords": ["down arrow", "decrease", "direction"] },
            { "latex": "\\updownarrow", "keywords": ["up-down arrow", "bidirectional", "vertical"] },
          ]
        },
        {
          "name": "Special Arrows",
          "symbols": [
            { "latex": "\\circlearrowleft", "keywords": ["circle arrow left", "counterclockwise", "rotation"] },
            { "latex": "\\circlearrowright", "keywords": ["circle arrow right", "clockwise", "rotation"] },
            { "latex": "\\looparrowleft", "keywords": ["loop arrow left", "counterclockwise", "circular arrow"] },
            { "latex": "\\looparrowright", "keywords": ["loop arrow right", "clockwise", "circular arrow"] },
            { "latex": "\\curvearrowleft", "keywords": ["curve arrow left", "counterclockwise", "curved"] },
            { "latex": "\\curvearrowright", "keywords": ["curve arrow right", "clockwise", "curved"] },
            { "latex": "\\hookrightarrow", "keywords": ["hook arrow", "injection", "embedding"] },
            { "latex": "\\hookleftarrow", "keywords": ["hook left arrow", "injection", "embedding"] },
            { "latex": "\\twoheadleftarrow", "keywords": ["two head left arrow", "surjection", "onto"] },
            { "latex": "\\twoheadrightarrow", "keywords": ["two head arrow", "surjection", "onto"] },
            { "latex": "\\downdownarrows", "keywords": ["double down arrows", "decrease", "direction"] },
            { "latex": "\\downharpoonleft", "keywords": ["down harpoon left", "partial function", "mapping"] },
            { "latex": "\\downharpoonright", "keywords": ["down harpoon right", "partial function", "mapping"] },
            { "latex": "\\upharpoonleft", "keywords": ["up harpoon left", "partial function", "mapping"] },
            { "latex": "\\upharpoonright", "keywords": ["up harpoon right", "partial function", "mapping"] },
            { "latex": "\\leadsto", "keywords": ["leadsto", "squiggly arrow", "mapping"] },
            { "latex": "\\leftarrowtail", "keywords": ["left arrow tail", "injection", "mapping"] },
            { "latex": "\\leftleftarrows", "keywords": ["left left arrows", "double left arrow", "mapping"] },
            { "latex": "\\leftrightarrows", "keywords": ["left right arrows", "bidirectional", "mapping"] },
            { "latex": "\\leftrightharpoons", "keywords": ["left right harpoons", "equilibrium", "reaction"] },
            { "latex": "\\leftrightsquigarrow", "keywords": ["left right squiggly", "bidirectional", "mapping"] },
            { "latex": "\\multimap", "keywords": ["multimap", "many-to-one mapping", "relation"] },
            { "latex": "\\nearrow", "keywords": ["northeast arrow", "diagonal", "direction"] },
            { "latex": "\\nwarrow", "keywords": ["northwest arrow", "diagonal", "direction"] },
            { "latex": "\\searrow", "keywords": ["southeast arrow", "diagonal", "direction"] },
            { "latex": "\\swarrow", "keywords": ["southwest arrow", "diagonal", "direction"] },
            { "latex": "\\rightarrowtail", "keywords": ["right arrow tail", "injection", "mapping"] },
            { "latex": "\\rightleftarrows", "keywords": ["right left arrows", "bidirectional", "mapping"] },
            { "latex": "\\rightleftharpoons", "keywords": ["right left harpoons", "equilibrium", "reaction"] },
            { "latex": "\\rightrightarrows", "keywords": ["right right arrows", "double right arrow", "mapping"] },
            { "latex": "\\rightsquigarrow", "keywords": ["right squiggly", "leads to", "mapping"] },
            { "latex": "\\rightthreetimes", "keywords": ["right three times", "operator", "binary"] },
            { "latex": "\\xleftarrow{}", "keywords": ["extensible left arrow", "arrow with text", "mapping"] },
            { "latex": "\\xrightarrow{}", "keywords": ["extensible right arrow", "arrow with text", "mapping"] },
            { "latex": "\\xLeftarrow{}", "keywords": ["extensible left double arrow", "arrow with text", "logic"] },
            { "latex": "\\xRightarrow{}", "keywords": ["extensible right double arrow", "arrow with text", "logic"] },
            { "latex": "\\xleftrightarrow{}", "keywords": ["extensible left-right arrow", "arrow with text", "relation"] },
            { "latex": "\\xLeftrightarrow{}", "keywords": ["extensible left-right double arrow", "arrow with text", "logic"] },
            { "latex": "\\xmapsto{}", "keywords": ["extensible maps to", "arrow with text", "mapping"] },
            { "latex": "\\xleftharpoonup{}", "keywords": ["extensible left harpoon up", "arrow with text", "mapping"] },
            { "latex": "\\xleftharpoondown{}", "keywords": ["extensible left harpoon down", "arrow with text", "mapping"] },
            { "latex": "\\xrightharpoonup{}", "keywords": ["extensible right harpoon up", "arrow with text", "mapping"] },
            { "latex": "\\xrightharpoondown{}", "keywords": ["extensible right harpoon down", "arrow with text", "mapping"] }
          ]
        }
      ]
    },
    {
      "id": "decorative_misc",
      "name": "Decorative & Miscellaneous",
      "label": "Accents",
      "symbol": "\\hat{x}",
      "categories": [
        {
          "name": "Stretchy Accents",
          "symbols": [
            {
              "latex": "\\overline{Ꞩ1}",
              "keywords": ["overline", "conjugate", "complex", "closure", "span", "logic", "complement", "average"]
            },
            {
              "latex": "\\overbrace{Ꞩ1}",
              "keywords": ["overbrace", "grouping", "summation", "highlight", "proof", "structure"]
            },
            {
              "latex": "\\overleftarrow{Ꞩ1}",
              "keywords": ["arrow", "left", "inverse", "mapping", "sequence", "limit"]
            },
            {
              "latex": "\\overrightarrow{Ꞩ1}",
              "keywords": ["arrow", "right", "function", "mapping", "vector", "direction"]
            },
            {
              "latex": "\\overleftrightarrow{Ꞩ1}",
              "keywords": ["arrow", "left-right", "bidirectional", "equilibrium", "interaction", "relation"]
            },
            {
              "latex": "\\widehat{Ꞩ1}",
              "keywords": ["widehat", "Fourier", "transform", "frequency", "domain", "estimator"]
            },
            {
              "latex": "\\widetilde{Ꞩ1}",
              "keywords": ["widetilde", "equivalence", "asymptotic", "perturbation", "expansion"]
            }
          ]
        },
        {
          "name": "Fixed Accents",
          "symbols": [
            {
              "latex": "\\overset{Ꞩ2}{Ꞩ1}",
              "keywords": ["overset", "manual", "above", "label", "annotation"]
            },
            {
              "latex": "\\hat{Ꞩ1}",
              "keywords": ["hat", "estimator", "statistics", "Fourier", "coefficient", "vector", "unit", "quantum", "operator"]
            },
            {
              "latex": "\\bar{Ꞩ1}",
              "keywords": ["bar", "mean", "average", "conjugate", "complex", "closure", "topology", "complement", "set theory"]
            },
            {
              "latex": "\\vec{Ꞩ1}",
              "keywords": ["vector", "arrow", "linear algebra", "geometry", "physics", "mechanics"]
            },
            {
              "latex": "\\tilde{Ꞩ1}",
              "keywords": ["tilde", "approximation", "asymptotic", "equivalence", "perturbation", "variable", "transform"]
            },
            {
              "latex": "\\dot{Ꞩ1}",
              "keywords": ["dot", "derivative", "time", "velocity", "calculus", "differential equations", "mechanics"]
            },
            {
              "latex": "\\ddot{Ꞩ1}",
              "keywords": ["double dot", "derivative", "second", "acceleration", "oscillation", "harmonic", "motion"]
            },
            {
              "latex": "\\check{Ꞩ1}",
              "keywords": ["check", "inverse", "Fourier", "dual", "space"]
            },
            {
              "latex": "\\acute{Ꞩ1}",
              "keywords": ["acute", "mark", "prime", "derivative"]
            },
            {
              "latex": "\\breve{Ꞩ1}",
              "keywords": ["breve", "short", "function", "space"]
            },
            {
              "latex": "\\grave{Ꞩ1}",
              "keywords": ["grave", "mark", "operator", "conjugate"]
            }
          ]
        },
        {
          "name": "Stretchy Under Accents",
          "symbols": [
            {
              "latex": "\\underbrace{Ꞩ1}",
              "keywords": ["underbrace", "grouping", "summation", "expansion", "structure"]
            },
            {
              "latex": "\\underleftarrow{Ꞩ1}",
              "keywords": ["arrow", "left", "inverse", "mapping", "sequence"]
            },
            {
              "latex": "\\underrightarrow{Ꞩ1}",
              "keywords": ["arrow", "right", "mapping", "function", "direction"]
            },
            {
              "latex": "\\underleftrightarrow{Ꞩ1}",
              "keywords": ["arrow", "left-right", "bidirectional", "relation", "equilibrium"]
            },
            {
              "latex": "\\underline{Ꞩ1}",
              "keywords": ["underline", "emphasis", "basis", "vector"]
            }
          ]
        },
        {
          "name": "Fixed Under Accents",
          "symbols": [
            {
              "latex": "\\underset{Ꞩ2}{Ꞩ1}",
              "keywords": ["underset", "manual", "below", "label", "annotation"]
            }
          ]
        },
      ]
    },
    {
      "id": "delimiters",
      "name": "Delimiters",
      "label": "Delimiters",
      "symbol": "[x]",
      "categories": [
        {
          "name": "Enclosed Delimiters",
          "autoScalable": true,
          "symbols": [
            { "latex": "( Ꞩ1 )", "display": "( {Ꞩ1} )", "keywords": ["parentheses", "grouping", "enclosed"] },
            { "latex": "[ Ꞩ1 ]", "display": "[ {Ꞩ1} ]", "keywords": ["square brackets", "grouping", "enclosed"] },
            { "latex": "\\{ Ꞩ1 \\}", "display": "\\{ {Ꞩ1} \\}", "keywords": ["braces", "curly braces", "set", "enclosed"] },
            { "latex": "| Ꞩ1 |", "display": "| {Ꞩ1} |", "keywords": ["absolute value", "vertical bar", "enclosed"] },
            { "latex": "\\| Ꞩ1 \\|", "display": "\\| {Ꞩ1} \\|", "keywords": ["norm", "double vertical bar", "enclosed"] },
            { "latex": "\\langle Ꞩ1 \\rangle", "display": "\\langle {Ꞩ1} \\rangle", "keywords": ["angle brackets", "inner product", "enclosed"] },
            { "latex": "\\lfloor Ꞩ1 \\rfloor", "display": "\\lfloor {Ꞩ1} \\rfloor", "keywords": ["floor", "floor function", "enclosed"] },
            { "latex": "\\lceil Ꞩ1 \\rceil", "display": "\\lceil {Ꞩ1} \\rceil", "keywords": ["ceiling", "ceiling function", "enclosed"] },
            { "latex": "\\langle Ꞩ1 |", "display": "\\langle {Ꞩ1} |", "keywords": ["bra", "quantum state", "quantum mechanics", "enclosed"] },
            { "latex": "| Ꞩ1 \\rangle", "display": "| {Ꞩ1} \\rangle", "keywords": ["ket", "quantum state", "quantum mechanics", "enclosed"] },
            { "latex": "\\langle Ꞩ1 | Ꞩ2 \\rangle", "display": "\\langle {Ꞩ1} | {Ꞩ2} \\rangle", "keywords": ["braket", "inner product", "quantum mechanics", "two-argument", "enclosed"] }
          ]
        },
        {
          "name": "Single Delimiters",
          "symbols": [
            { "latex": "(", "keywords": ["left parenthesis", "grouping", "delimiter"] },
            { "latex": ")", "keywords": ["right parenthesis", "grouping", "delimiter"] },
            { "latex": "[", "keywords": ["left square bracket", "grouping", "delimiter"] },
            { "latex": "]", "keywords": ["right square bracket", "grouping", "delimiter"] },
            { "latex": "\\rbrack", "keywords": ["right square bracket", "grouping", "delimiter"] },
            { "latex": "\\{", "keywords": ["left brace", "curly", "set", "delimiter"] },
            { "latex": "\\}", "keywords": ["right brace", "curly", "set", "delimiter"] },
            { "latex": "\\rbrace", "keywords": ["right brace", "curly", "set", "delimiter"] },
            { "latex": "\\langle", "keywords": ["left angle bracket", "inner product", "delimiter"] },
            { "latex": "\\rangle", "keywords": ["right angle bracket", "inner product", "delimiter"] },
            { "latex": "\\lfloor", "keywords": ["left floor", "floor function", "delimiter"] },
            { "latex": "\\rfloor", "keywords": ["right floor", "floor function", "delimiter"] },
            { "latex": "\\lceil", "keywords": ["left ceiling", "ceiling function", "delimiter"] },
            { "latex": "\\rceil", "keywords": ["right ceiling", "ceiling function", "delimiter"] },
            { "latex": "\\lmoustache", "keywords": ["left moustache", "brace variant", "delimiter"] },
            { "latex": "\\rmoustache", "keywords": ["right moustache", "brace variant", "delimiter"] },
            { "latex": "|", "keywords": ["vertical bar", "absolute value", "delimiter"] },
            { "latex": "\\|", "keywords": ["double vertical bar", "norm", "delimiter"] },
          ]
        }
      ]
    },
    {
      "id": "matrices_arrays",
      "name": "Matrices & Arrays",
      "label": "Matrices",
      "symbol": "\\begin{bmatrix} A & B \\\\ C & D \\end{bmatrix}",
      "categories": [
        {
          "name": "Arrays",
          "note": {
            "type": "HTML",
            "content": "<kbd>Tab</kbd> → type m×n in the smart menu for custom sizes."
          },
          "symbols": [
            {
              "id": "matrix_3x3",
              "latex": "\\begin{bmatrix} Ꞩ1 & Ꞩ2 & Ꞩ3 \\\\ Ꞩ4 & Ꞩ5 & Ꞩ6 \\\\ Ꞩ7 & Ꞩ8 & Ꞩ9 \\end{bmatrix}",
              "keywords": ["bracket matrix", "array"]
            },
            {
              "id": "vector_col_3",
              "latex": "\\begin{bmatrix} {Ꞩ1} \\\\ {Ꞩ2} \\\\ {Ꞩ3} \\end{bmatrix}",
              "keywords": ["column vector"]
            },
            {
              "id": "matrix_2x2",
              "latex": "\\begin{bmatrix} Ꞩ1 & Ꞩ2 \\\\ Ꞩ3 & Ꞩ4 \\end{bmatrix}",
              "keywords": ["bracket matrix", "array"]
            },
            {
              "id": "vector_col_2",
              "latex": "\\begin{bmatrix} {Ꞩ1} \\\\ {Ꞩ2} \\end{bmatrix}",
              "keywords": ["column vector"]
            },
            {
              "id": "vector_row_2",
              "latex": "\\begin{bmatrix} {Ꞩ1} & {Ꞩ2} \\end{bmatrix}",
              "keywords": ["row vector"]
            },
            {
              "id": "vector_row_3",
              "latex": "\\begin{bmatrix} {Ꞩ1} & {Ꞩ2} & {Ꞩ3} \\end{bmatrix}",
              "keywords": ["row vector"]
            }

          ]
        },
        {
          "name": "Miscellaneous",
          "symbols": [
            {
              "id": "cases_2x2",
              "latex": "\\begin{cases} {Ꞩ1} & {Ꞩ2} \\\\ {Ꞩ3} & {Ꞩ4} \\end{cases}",
              "keywords": ["cases", "piecewise", "conditions"]
            },
            {
              "id": "cases_example",
              "latex": "\\begin{cases} x^2 & \\text{if } x < 0 \\\\ 1 & \\text{if } x \\ge 0 \\end{cases}",
              "keywords": ["cases example", "piecewise function example"]
            }
          ]
        }
      ]
    },
    {
      "id": "units_constants",
      "name": "Units & Constants",
      "label": "Constants",
      "symbol": "\\text{kg}",
      "categories": [
        {
          "name": "Physical Constants",
          "symbols": [
            { "latex": "\\hbar", "keywords": ["reduced planck constant", "h-bar", "planck", "physics", "quantum"] },
            { "latex": "h", "keywords": ["planck constant", "planck", "physics", "quantum"] },
            { "latex": "c", "keywords": ["speed of light", "light speed", "physics", "relativity"] },
            { "latex": "G", "keywords": ["gravitational constant", "gravity", "physics", "newton"] },
            { "latex": "k_B", "keywords": ["boltzmann constant", "boltzmann", "statistical mechanics", "physics"] },
            { "latex": "N_A", "keywords": ["avogadro constant", "avogadro", "mole", "chemistry", "physics"] },
            { "latex": "R", "keywords": ["gas constant", "ideal gas", "chemistry", "physics"] },
            { "latex": "e", "keywords": ["elementary charge", "electron charge", "physics", "electricity"] },
            { "latex": "m_e", "keywords": ["electron mass", "electron", "physics", "particle"] },
            { "latex": "m_p", "keywords": ["proton mass", "proton", "physics", "particle"] },
            { "latex": "\\epsilon_0", "keywords": ["vacuum permittivity", "electric constant", "physics", "electricity"] },
            { "latex": "\\mu_0", "keywords": ["vacuum permeability", "magnetic constant", "physics", "magnetism"] },
            { "latex": "\\alpha", "keywords": ["fine structure constant", "physics", "quantum"] },
            { "latex": "\\sigma", "keywords": ["stefan boltzmann constant", "blackbody", "physics", "thermodynamics"] }
          ]
        },
        {
          "name": "SI Base Units",
          "symbols": [
            { "latex": "\\text{m}", "keywords": ["meter", "metre", "length", "distance", "unit", "si"] },
            { "latex": "\\text{kg}", "keywords": ["kilogram", "mass", "weight", "unit", "si"] },
            { "latex": "\\text{s}", "keywords": ["second", "time", "duration", "unit", "si"] },
            { "latex": "\\text{A}", "keywords": ["ampere", "current", "electricity", "unit", "si"] },
            { "latex": "\\text{K}", "keywords": ["kelvin", "temperature", "thermodynamics", "unit", "si"] },
            { "latex": "\\text{mol}", "keywords": ["mole", "amount", "chemistry", "unit", "si"] },
            { "latex": "\\text{cd}", "keywords": ["candela", "luminous intensity", "light", "unit", "si"] }
          ]
        },
        {
          "name": "SI Derived Units",
          "symbols": [
            { "latex": "\\text{Hz}", "keywords": ["hertz", "frequency", "oscillation", "unit", "si"] },
            { "latex": "\\text{N}", "keywords": ["newton", "force", "mechanics", "unit", "si"] },
            { "latex": "\\text{Pa}", "keywords": ["pascal", "pressure", "stress", "unit", "si"] },
            { "latex": "\\text{J}", "keywords": ["joule", "energy", "work", "unit", "si"] },
            { "latex": "\\text{W}", "keywords": ["watt", "power", "energy rate", "unit", "si"] },
            { "latex": "\\text{C}", "keywords": ["coulomb", "electric charge", "electricity", "unit", "si"] },
            { "latex": "\\text{V}", "keywords": ["volt", "voltage", "potential", "electricity", "unit", "si"] },
            { "latex": "\\text{F}", "keywords": ["farad", "capacitance", "electricity", "unit", "si"] },
            { "latex": "\\text{S}", "keywords": ["siemens", "conductance", "electricity", "unit", "si"] },
            { "latex": "\\text{Wb}", "keywords": ["weber", "magnetic flux", "magnetism", "unit", "si"] },
            { "latex": "\\text{T}", "keywords": ["tesla", "magnetic field", "magnetism", "unit", "si"] },
            { "latex": "\\text{H}", "keywords": ["henry", "inductance", "magnetism", "unit", "si"] },
            { "latex": "\\text{lm}", "keywords": ["lumen", "luminous flux", "light", "unit", "si"] },
            { "latex": "\\text{lx}", "keywords": ["lux", "illuminance", "light", "unit", "si"] },
            { "latex": "\\text{Bq}", "keywords": ["becquerel", "radioactivity", "nuclear", "unit", "si"] },
            { "latex": "\\text{Gy}", "keywords": ["gray", "absorbed dose", "radiation", "unit", "si"] },
            { "latex": "\\text{Sv}", "keywords": ["sievert", "dose equivalent", "radiation", "unit", "si"] }
          ]
        },
        {
          "name": "Common Units",
          "symbols": [
            { "latex": "\\text{g}", "keywords": ["gram", "mass", "weight", "unit"] },
            { "latex": "\\text{cm}", "keywords": ["centimeter", "centimetre", "length", "unit"] },
            { "latex": "\\text{mm}", "keywords": ["millimeter", "millimetre", "length", "unit"] },
            { "latex": "\\text{km}", "keywords": ["kilometer", "kilometre", "length", "unit"] },
            { "latex": "\\text{L}", "keywords": ["liter", "litre", "volume", "unit"] },
            { "latex": "\\text{mL}", "keywords": ["milliliter", "millilitre", "volume", "unit"] },
            { "latex": "\\text{min}", "keywords": ["minute", "time", "unit"] },
            { "latex": "\\text{h}", "keywords": ["hour", "time", "unit"] },
            { "latex": "\\text{d}", "keywords": ["day", "time", "unit"] },
            { "latex": "\\text{y}", "keywords": ["year", "time", "unit"] },
            { "latex": "\\text{eV}", "keywords": ["electron volt", "energy", "physics", "unit"] },
            { "latex": "\\text{cal}", "keywords": ["calorie", "energy", "unit"] },
            { "latex": "\\text{atm}", "keywords": ["atmosphere", "pressure", "unit"] },
            { "latex": "\\text{bar}", "keywords": ["bar", "pressure", "unit"] },
            { "latex": "^{\\circ}\\text{C}", "keywords": ["degree celsius"] },
            { "latex": "^{\\circ}\\text{F}", "keywords": ["degree fahrenheit"] }
          ]
        }
      ]
    },
    {
      "id": "text_formatting",
      "name": "Text & Formatting",
      "symbol": "\\text{text}",
      "hide": true,
      "categories": [
        {
          "name": "Text Fonts",
          "symbols": [
            {
              "name": "Text Block",
              "latex": "\\text{Ꞩ1}",
              "display": "none",
              "keywords": ["text", "normal text", "regular text", "formatting"]
            },
            {
              "name": "Text Bold",
              "latex": "\\textbf{Ꞩ1}",
              "display": "none",
              "keywords": ["text bold", "bold text", "formatting", "emphasis"]
            },
            {
              "name": "Text Italic",
              "latex": "\\textit{Ꞩ1}",
              "display": "none",
              "keywords": ["text italic", "italic text", "formatting", "emphasis"]
            },
            {
              "name": "Text Serif",
              "latex": "\\textrm{Ꞩ1}",
              "display": "none",
              "keywords": ["text roman", "roman text", "formatting"]
            },
            {
              "name": "Text Sans Serif",
              "latex": "\\textsf{Ꞩ1}",
              "display": "none",
              "keywords": ["text sans serif", "sans serif text", "formatting"]
            },
            {
              "name": "Text Monospace",
              "latex": "\\texttt{Ꞩ1}",
              "display": "none",
              "keywords": ["text typewriter", "monospace text", "code", "formatting"]
            },
          ]
        },
      ]
    },
    {
      "id": "special_functions",
      "name": "Special Functions & Operators",
      "symbol": "\\operatorname{sinc}",
      "hide": true,
      "categories": [
        {
          "name": "Signal Processing",
          "symbols": [
            {
              "latex": "\\operatorname{sinc}",
              "keywords": ["sinc", "normalized sinc", "bandlimited", "interpolation kernel"]
            },
            {
              "latex": "\\operatorname{rect}",
              "keywords": ["rect", "rectangle", "unit pulse", "gate"]
            },
            {
              "latex": "\\operatorname{tri}",
              "keywords": ["tri", "triangle", "triangular window", "tent kernel"]
            }
          ]
        },
        {
          "name": "Integral Special Operators",
          "symbols": [
            {
              "latex": "\\operatorname{erf}",
              "keywords": ["erf", "gaussian integral", "diffusion kernel"]
            },
            {
              "latex": "\\operatorname{erfc}",
              "keywords": ["erfc", "gaussian tail", "complementary erf"]
            },
            {
              "latex": "\\operatorname{Ei}",
              "keywords": ["Ei", "exponential integral", "logarithmic type"],
              "weight": 0.7
            },
            {
              "latex": "\\operatorname{Si}",
              "keywords": ["Si", "sine integral", "oscillatory type"]
            },
            {
              "latex": "\\operatorname{Ci}",
              "keywords": ["Ci", "cosine integral", "logarithmic oscillation"],
              "weight": 0.8
            }
          ]
        },
        {
          "name": "Miscellaneous Operators",
          "symbols": [
            {
              "latex": "\\operatorname{sgn}",
              "keywords": ["sgn", "signum", "piecewise sign"]
            },
            {
              "latex": "\\operatorname{supp}",
              "keywords": ["supp", "support set", "nonzero region"]
            },
            {
              "latex": "\\operatorname*{Res}",
              "keywords": ["Res", "complex residue", "pole coefficient"],
              "weight": 0.8
            },
            {
              "latex": "\\operatorname{p.v.}",
              "keywords": ["p.v.", "cauchy principal value", "singular value"],
              "weight": 0.7
            }
          ]
        }
      ]
    },
  ]
}

const negatableSymbols = [
  // Comparison / Equality
  "=", "<", ">", "\\leq", "\\leqq", "\\leqslant", "\\geq", "\\geqq", "\\geqslant",

  // Ordering
  "\\prec", "\\preceq", "\\succ", "\\succeq",
  "\\triangleleft", "\\triangleright", "\\trianglelefteq", "\\trianglerighteq",

  // Set theory
  "\\in", "\\ni", "\\subseteq", "\\supseteq", "\\subset", "\\supset",

  // Logic
  "\\exists", "\\vdash", "\\Vdash", "\\vDash", "\\VDash",

  // Arrows
  "\\leftarrow", "\\rightarrow", "\\Leftarrow", "\\Rightarrow",
  "\\leftrightarrow", "\\Leftrightarrow",

  // Similarity / Relations
  "\\sim", "\\cong", "\\mid",

  "\\parallel"
];

const symbolVariants = {
  "=": [
    { "latex": "\\approx", "keywords": ["approximately", "approx", "equal"] },
    { "latex": "\\doteq", "keywords": ["dot", "equal"] },
    { "latex": "\\doteqdot", "keywords": ["dot", "equal"] },
    { "latex": "\\eqcirc", "keywords": ["circle", "equal"] },
    { "latex": "\\equiv", "keywords": ["equivalent", "identity", "equal", "definition", "defines", "defined"] },
    //{ "latex": "\\thickapprox", "keywords": ["thick", "approximate"] },
    { "latex": "\\fallingdotseq", "keywords": ["falling", "dot", "equal"] },
    { "latex": "\\approxeq", "keywords": ["approximate", "equal"] },
    { "latex": "\\risingdotseq", "keywords": ["rising", "dot", "equal"] }
  ],
  "\\sim": [
    //{ "latex": "\\thicksim", "keywords": ["thick", "similar"] },
    { "latex": "\\simeq", "keywords": ["similar", "equal"] },
    { "latex": "\\backsim", "keywords": ["back", "similar"] }
  ],
  "\\times": [
    { "latex": "\\otimes", "keywords": ["tensor", "product", "circle"] },
    { "latex": "\\boxtimes", "keywords": ["box", "product"] },
    { "latex": "\\rtimes", "keywords": ["right", "product"] },
    { "latex": "\\ltimes", "keywords": ["left", "product"] }
  ],
  "/": [
    { "latex": "\\div", "keywords": ["division", "obelus"] }
  ],
  "<": [
    { "latex": "\\leq", "keywords": ["less than or equal", "equal"] },
    { "latex": "\\ll", "keywords": ["much less than", "double"] },
    { "latex": "\\leqq", "keywords": ["less than or equal", "double equal"] },
    { "latex": "\\leqslant", "keywords": ["less than or equal", "slanted equal"] },
    { "latex": "\\lesssim", "keywords": ["less than", "similar"] },
    { "latex": "\\lessapprox", "keywords": ["less than", "approximately"] },
    { "latex": "\\lneq", "keywords": ["less than", "not equal"] },
    { "latex": "\\lneqq", "keywords": ["less than", "not double equal"] },
    { "latex": "\\lnsim", "keywords": ["less than", "not similar"] },
    { "latex": "\\lnapprox", "keywords": ["less than", "not approximately"] },
    { "latex": "\\eqslantless", "keywords": ["equals slanted less than", "relation"] },
    { "latex": "\\lessdot", "keywords": ["less than", "dot"] },
    { "latex": "\\lll", "keywords": ["triple less than", "much less"] }
  ],
  "\\prec": [
    { "latex": "\\preceq", "keywords": ["precedes or equals", "ordering", "comparison"] },
    { "latex": "\\preccurlyeq", "keywords": ["precedes or equals curly", "ordering", "comparison"] },
    { "latex": "\\curlyeqprec", "keywords": ["curly equal precedes", "relation", "ordering"] },
    { "latex": "\\precsim", "keywords": ["precedes similar", "ordering", "comparison"] },
    { "latex": "\\precapprox", "keywords": ["precedes approximately", "ordering", "comparison"] },
    { "latex": "\\precneqq", "keywords": ["precedes not double equals", "ordering", "comparison"] },
    { "latex": "\\precnsim", "keywords": ["precedes not similar", "ordering", "comparison"] },
    { "latex": "\\precnapprox", "keywords": ["precedes not approximately", "ordering", "comparison"] }
  ],
  "\\succ": [
    { "latex": "\\succeq", "keywords": ["succeeds or equals", "ordering", "comparison"] },
    { "latex": "\\succcurlyeq", "keywords": ["succeeds or equals curly", "ordering", "comparison"] },
    { "latex": "\\curlyeqsucc", "keywords": ["curly equal succeeds", "relation", "ordering"] },
    { "latex": "\\succsim", "keywords": ["succeeds similar", "ordering", "comparison"] },
    { "latex": "\\succapprox", "keywords": ["succeeds approximately", "ordering", "comparison"] },
    { "latex": "\\succneqq", "keywords": ["succeeds not double equals", "ordering", "comparison"] },
    { "latex": "\\succnsim", "keywords": ["succeeds not similar", "ordering", "comparison"] },
    { "latex": "\\succnapprox", "keywords": ["succeeds not approximately", "ordering", "comparison"] },
  ],
  ">": [
    { "latex": "\\geq", "keywords": ["greater than or equal", "equal"] },
    { "latex": "\\gg", "keywords": ["much greater than", "double"] },
    { "latex": "\\geqq", "keywords": ["greater than or equal", "double equal"] },
    { "latex": "\\geqslant", "keywords": ["greater than or equal", "slanted equal"] },
    { "latex": "\\gtrsim", "keywords": ["greater than", "similar"] },
    { "latex": "\\gtrapprox", "keywords": ["greater than", "approximately"] },
    { "latex": "\\gneq", "keywords": ["greater than", "not equal"] },
    { "latex": "\\gneqq", "keywords": ["greater than", "not double equal"] },
    { "latex": "\\gnsim", "keywords": ["greater than", "not similar"] },
    { "latex": "\\gnapprox", "keywords": ["greater than", "not approximately"] },
    { "latex": "\\eqslantgtr", "keywords": ["equals slanted greater than", "relation"] },
    { "latex": "\\gtrdot", "keywords": ["greater than", "dot"] },
    { "latex": "\\ggg", "keywords": ["triple greater than", "much greater"] }
  ],
  "\\gtrless": [
    { "latex": "\\gtreqless", "keywords": ["greater than or equal less than", "inequality", "comparison"] },
    { "latex": "\\lesseqgtr", "keywords": ["less than or equal greater than", "inequality", "comparison"] },
    { "latex": "\\gtreqqless", "keywords": ["greater than or double equal less than", "inequality", "comparison"] },
    { "latex": "\\lesseqqgtr", "keywords": ["less than or double equal greater than", "inequality", "comparison"] },
    { "latex": "\\lessgtr", "keywords": ["less than or greater than", "inequality", "comparison"] },
  ],
  "\\subset": [
    { "latex": "\\subseteq", "keywords": ["equal"] },
    //{ "latex": "\\subseteqq", "keywords": ["equal", "double", "line"] },
    //{ "latex": "\\subsetneq", "keywords": ["not", "equal"] },
    //{ "latex": "\\subsetneqq", "keywords": ["not", "equal", "double", "line"] },
    //{ "latex": "\\varsubsetneq", "keywords": ["not", "equal", "variant"] },
    //{ "latex": "\\varsubsetneqq", "keywords": ["not", "equal", "double", "line", "variant"] },
    { "latex": "\\Subset", "keywords": ["double subset", "subset", "set theory"] },
    { "latex": "\\sqsubset", "keywords": ["square subset", "subset", "set theory"] },
    { "latex": "\\sqsubseteq", "keywords": ["square subset or equal", "subset", "set theory"] },

  ],
  "\\supset": [
    { "latex": "\\supseteq", "keywords": ["equal"] },
    //{ "latex": "\\supseteqq", "keywords": ["equal", "double", "line"] },
    //{ "latex": "\\supsetneq", "keywords": ["not", "equal"] },
    //{ "latex": "\\supsetneqq", "keywords": ["not", "equal", "double", "line"] },
    //{ "latex": "\\varsupsetneq", "keywords": ["not", "equal", "variant"] },
    //{ "latex": "\\varsupsetneqq", "keywords": ["not", "equal", "double", "line", "variant"] },
    { "latex": "\\Supset", "keywords": ["double superset", "superset", "set theory"] },
    { "latex": "\\sqsupset", "keywords": ["square superset", "superset", "set theory"] },
    { "latex": "\\sqsupseteq", "keywords": ["square superset or equal", "superset", "set theory"] },
  ],
  "\\angle": [
    { "latex": "\\measuredangle", "keywords": ["measured"] },
    { "latex": "\\sphericalangle", "keywords": ["spherical"] }
  ],
  "\\epsilon": [
    { "latex": "\\varepsilon", "keywords": ["variant"] }
  ],
  "\\theta": [
    { "latex": "\\vartheta", "keywords": ["variant"] }
  ],
  "\\phi": [
    { "latex": "\\varphi", "keywords": ["variant"] }
  ],
  "\\rho": [
    { "latex": "\\varrho", "keywords": ["variant"] }
  ],
  "\\sigma": [
    { "latex": "\\varsigma", "keywords": ["variant"] }
  ],
  "\\pi": [
    { "latex": "\\varpi", "keywords": ["variant"] }
  ],
  "\\kappa": [
    { "latex": "\\varkappa", "keywords": ["variant"] }
  ],
  "\\pm": [
    { "latex": "\\mp", "keywords": ["minus plus", "minus or plus", "uncertainty"] },
  ],
  "\\int": [
    {
      "latex": "\\iint",
      "keywords": ["double integral", "calculus", "multiple integral"]
    },
    {
      "latex": "\\iiint",
      "keywords": ["triple integral", "calculus", "multiple integral"]
    },
    {
      "latex": "\\oint",
      "keywords": ["contour integral", "line integral"]
    },
    {
      "latex": "\\oiint",
      "keywords": ["double surface integral", "closed surface integral"]
    },
    {
      "latex": "\\smallint",
      "keywords": ["small integral", "calculus", "antiderivative"]
    },
  ],
  "\\prod": [
    {
      "latex": "\\coprod",
      "keywords": ["coproduct", "calculus", "operator"]
    },
  ],
  "\\log": [
    { "latex": "\\ln", "keywords": ["natural logarithm", "log", "base e"] },
    { "latex": "\\lg", "keywords": ["logarithm base 10", "log", "base 10"] },
    { "latex": "\\log_b", "keywords": ["logarithm base b", "log", "custom base"] }
  ],
  "\\sin": [
    { "latex": "\\arcsin", "keywords": ["inverse sine", "arcsin", "trig", "function"] },
    { "latex": "\\sinh", "keywords": ["hyperbolic sine", "hyperbolic", "function"] },
    { "latex": "\\sh", "keywords": ["hyperbolic sine alternative", "hyperbolic", "function"] }
  ],
  "\\cos": [
    { "latex": "\\arccos", "keywords": ["inverse cosine", "arccos", "trig", "function"] },
    { "latex": "\\cosh", "keywords": ["hyperbolic cosine", "hyperbolic", "function"] }
  ],
  "\\tan": [
    { "latex": "\\arctan", "keywords": ["inverse tangent", "arctan", "trig", "function"] },
    { "latex": "\\tanh", "keywords": ["hyperbolic tangent", "hyperbolic", "function"] }
  ],
  "\\lim": [
    { "latex": "\\lim_{n \\to \\infty}", "keywords": ["limit", "approach", "infinity", "calculus"] },
    { "latex": "\\liminf", "keywords": ["limit inferior", "infimum", "calculus"] },
    { "latex": "\\limsup", "keywords": ["limit superior", "supremum", "calculus"] },
    { "latex": "\\plim", "keywords": ["probability limit", "limit in probability", "statistics"] },
    { "latex": "\\projlim", "keywords": ["projective limit", "category theory", "limit"] }
  ],
  "\\frac{d}{dx}": [
    {
      "latex": "\\frac{d^2}{dx^2}",
      "keywords": ["second derivative"]
    },
    {
      "latex": "\\frac{d^{}}{dx^{}}",
      "keywords": ["general derivative"]
    },
    {
      "latex": "\\frac{\\partial}{\\partial x}",
      "keywords": ["partial derivative"]
    },
    {
      "latex": "\\frac{\\partial^2}{\\partial x^2}",
      "keywords": ["second partial derivative"]
    },
    {
      "latex": "\\frac{\\partial^{}}{\\partial x^{}}",
      "keywords": ["general partial derivative"]
    },
  ],
  "\\cup": [
    { "latex": "\\Cup", "keywords": ["double union", "sets", "combine"] },
    { "latex": "\\bigcup", "keywords": ["big union", "large union", "indexed union", "sets", "combine"] },
    { "latex": "\\sqcup", "keywords": ["square cup", "union", "sets"] }
  ],
  "\\cap": [
    { "latex": "\\Cap", "keywords": ["double intersection", "sets", "common elements"] },
    { "latex": "\\bigcap", "keywords": ["big intersection", "large intersection", "indexed intersection", "sets", "common elements"] },
    { "latex": "\\sqcap", "keywords": ["square cap", "intersection", "sets"] }
  ],
  "\\vdash": [
    { "latex": "\\Vdash", "keywords": ["double turnstile", "models", "logic"] },
    //{ "latex": "\\models", "keywords": ["models", "satisfies", "semantic entailment", "logic"] },
    { "latex": "\\vDash", "keywords": ["vertical double turnstile", "models", "logic"] },
    { "latex": "\\Vvdash", "keywords": ["triple turnstile", "forces", "logic"] }
  ],
  "\\wedge": [
    { "latex": "\\barwedge", "keywords": ["bar wedge", "logical and", "logic"] },
    { "latex": "\\curlywedge", "keywords": ["curly wedge", "logical and", "logic"] },
  ],
  "\\vee": [
    { "latex": "\\curlyvee", "keywords": ["curly vee", "logical or", "logic"] },
  ],
  "\\triangleleft": [
    { "latex": "\\vartriangleleft", "keywords": ["variant left triangle", "geometry", "relation"] },
    { "latex": "\\trianglelefteq", "keywords": ["left triangle equals", "geometry", "relation"] },
  ],
  "\\triangleright": [
    { "latex": "\\vartriangleright", "keywords": ["variant right triangle", "geometry", "relation"] },
    { "latex": "\\trianglerighteq", "keywords": ["right triangle equals", "geometry", "relation"] },
  ],
  "\\parallel": [
    { "latex": "\\shortparallel", "keywords": ["short parallel", "geometry", "lines"] },
  ],
  "\\rightarrow": [
    { "latex": "\\mapsto", "keywords": ["maps to", "arrow", "mapping"] },
    { "latex": "\\longrightarrow", "keywords": ["long right arrow", "function", "maps to"] },
    { "latex": "\\longmapsto", "keywords": ["long maps to", "arrow", "mapping"] },
    { "latex": "\\rightharpoonup", "keywords": ["right harpoon", "partial function", "mapping"] },
    { "latex": "\\rightharpoondown", "keywords": ["right harpoon down", "partial function", "mapping"] },
  ],
  "\\leftarrow": [
    { "latex": "\\longleftarrow", "keywords": ["long right arrow", "function", "maps to"] },
    { "latex": "\\leftharpoondown", "keywords": ["right harpoon", "partial function", "mapping"] },
    { "latex": "\\leftharpoonup", "keywords": ["right harpoon down", "partial function", "mapping"] },
  ],
  "\\leftrightarrow": [
    { "latex": "\\longleftrightarrow", "keywords": ["long left-right arrow", "equivalence", "relation"] },
  ],
  "\\Rightarrow": [
    { "latex": "\\Rrightarrow", "keywords": ["triple right arrow", "implies", "logic"] },
    { "latex": "\\Longrightarrow", "keywords": ["long right double arrow", "implies", "logic"] },
  ],
  "\\Leftarrow": [
    { "latex": "\\Lleftarrow", "keywords": ["double L left arrow", "special arrow", "mapping"] },
    { "latex": "\\Longleftarrow", "keywords": ["long left double arrow", "implied by", "logic"] },
  ],
  "\\Leftrightarrow": [
    { "latex": "\\Longleftrightarrow", "keywords": ["long left-right double arrow", "if and only if", "logic"] },
  ],
  "\\uparrow": [
    { "latex": "\\Uparrow", "keywords": ["double up arrow", "increase", "direction"] },
  ],
  "\\downarrow": [
    { "latex": "\\Downarrow", "keywords": ["double down arrow", "decrease", "direction"] },
  ],
  "\\updownarrow": [
    { "latex": "\\Updownarrow", "keywords": ["double up-down arrow", "bidirectional", "vertical"] },
  ],
  "\\mid": [
    { "latex": "\\shortmid", "keywords": ["short mid", "such that", "conditional", "delimiter"] },
  ],
}

symbolVariants["matrix_2x2"] = [
  {
    latex: "\\begin{pmatrix} Ꞩ1 & Ꞩ2 \\\\ Ꞩ3 & Ꞩ4 \\end{pmatrix}",
    keywords: ["parenthesis matrix"]
  },
  {
    latex: "\\begin{Bmatrix} Ꞩ1 & Ꞩ2 \\\\ Ꞩ3 & Ꞩ4 \\end{Bmatrix}",
    keywords: ["curly bracket matrix", "brace matrix"]
  },
  {
    latex: "\\begin{vmatrix} Ꞩ1 & Ꞩ2 \\\\ Ꞩ3 & Ꞩ4 \\end{vmatrix}",
    keywords: ["vertical bar matrix", "determinant"]
  },
  {
    latex: "\\begin{Vmatrix} Ꞩ1 & Ꞩ2 \\\\ Ꞩ3 & Ꞩ4 \\end{Vmatrix}",
    keywords: ["double vertical bar matrix", "norm matrix"]
  },
  {
    latex: "\\begin{array}{cc} Ꞩ1 & Ꞩ2 \\\\ Ꞩ3 & Ꞩ4 \\end{array}",
    keywords: ["matrix"]
  }
];

symbolVariants["matrix_3x3"] = [
  {
    latex: "\\begin{pmatrix} Ꞩ1 & Ꞩ2 & Ꞩ3 \\\\ Ꞩ4 & Ꞩ5 & Ꞩ6 \\\\ Ꞩ7 & Ꞩ8 & Ꞩ9 \\end{pmatrix}",
    keywords: ["parenthesis matrix"]
  },
  {
    latex: "\\begin{Bmatrix} Ꞩ1 & Ꞩ2 & Ꞩ3 \\\\ Ꞩ4 & Ꞩ5 & Ꞩ6 \\\\ Ꞩ7 & Ꞩ8 & Ꞩ9 \\end{Bmatrix}",
    keywords: ["curly bracket matrix", "brace matrix"]
  },
  {
    latex: "\\begin{vmatrix} Ꞩ1 & Ꞩ2 & Ꞩ3 \\\\ Ꞩ4 & Ꞩ5 & Ꞩ6 \\\\ Ꞩ7 & Ꞩ8 & Ꞩ9 \\end{vmatrix}",
    keywords: ["vertical bar matrix", "determinant"]
  },
  {
    latex: "\\begin{Vmatrix} Ꞩ1 & Ꞩ2 & Ꞩ3 \\\\ Ꞩ4 & Ꞩ5 & Ꞩ6 \\\\ Ꞩ7 & Ꞩ8 & Ꞩ9 \\end{Vmatrix}",
    keywords: ["double vertical bar matrix", "norm matrix"]
  },
  {
    latex: "\\begin{array}{ccc} Ꞩ1 & Ꞩ2 & Ꞩ3 \\\\ Ꞩ4 & Ꞩ5 & Ꞩ6 \\\\ Ꞩ7 & Ꞩ8 & Ꞩ9 \\end{array}",
    keywords: ["matrix"]
  }
];

symbolVariants["vector_col_2"] = [
  {
    latex: "\\begin{pmatrix} {Ꞩ1} \\\\ {Ꞩ2} \\end{pmatrix}",
    keywords: ["column vector"]
  },
  {
    latex: "\\begin{array}{c} {Ꞩ1} \\\\ {Ꞩ2} \\end{array}",
    keywords: ["column vector"]
  }
];

symbolVariants["vector_col_3"] = [
  {
    latex: "\\begin{pmatrix} {Ꞩ1} \\\\ {Ꞩ2} \\\\ {Ꞩ3} \\end{pmatrix}",
    keywords: ["column vector"]
  },
  {
    latex: "\\begin{array}{c} {Ꞩ1} \\\\ {Ꞩ2} \\\\ {Ꞩ3} \\end{array}",
    keywords: ["column vector"]
  }
];

symbolVariants["vector_row_2"] = [
  {
    latex: "\\begin{pmatrix} {Ꞩ1} & {Ꞩ2} \\end{pmatrix}",
    keywords: ["row vector"]
  },
  {
    latex: "\\begin{array}{cc} {Ꞩ1} & {Ꞩ2} \\end{array}",
    keywords: ["row vector"]
  }
];

symbolVariants["vector_row_3"] = [
  {
    latex: "\\begin{pmatrix} {Ꞩ1} & {Ꞩ2} & {Ꞩ3} \\end{pmatrix}",
    keywords: ["row vector"]
  },
  {
    latex: "\\begin{array}{ccc} {Ꞩ1} & {Ꞩ2} & {Ꞩ3} \\end{array}",
    keywords: ["row vector"]
  }
];

const autoScalableDelimiters = {
  "( Ꞩ1 )": {
    "latex": "\\left( Ꞩ1 \\right)",
    "display": "\\left( {Ꞩ1} \\right)",
    "keywords": []
  },
  "[ Ꞩ1 ]": {
    "latex": "\\left[ Ꞩ1 \\right]",
    "display": "\\left[ {Ꞩ1} \\right]",
    "keywords": []
  },
  "\\{ Ꞩ1 \\}": {
    "latex": "\\left\\{ Ꞩ1 \\right\\}",
    "display": "\\left\\{ {Ꞩ1} \\right\\}",
    "keywords": []
  },
  "| Ꞩ1 |": {
    "latex": "\\left| Ꞩ1 \\right|",
    "display": "\\left| {Ꞩ1} \\right|",
    "keywords": []
  },
  "\\| Ꞩ1 \\|": {
    "latex": "\\left\\| Ꞩ1 \\right\\|",
    "display": "\\left\\| {Ꞩ1} \\right\\|",
    "keywords": []
  },
  "\\langle Ꞩ1 \\rangle": {
    "latex": "\\left\\langle Ꞩ1 \\right\\rangle",
    "display": "\\left\\langle {Ꞩ1} \\right\\rangle",
    "keywords": []
  },
  "\\lfloor Ꞩ1 \\rfloor": {
    "latex": "\\left\\lfloor Ꞩ1 \\right\\rfloor",
    "display": "\\left\\lfloor {Ꞩ1} \\right\\rfloor",
    "keywords": []
  },
  "\\lceil Ꞩ1 \\rceil": {
    "latex": "\\left\\lceil Ꞩ1 \\right\\rceil",
    "display": "\\left\\lceil {Ꞩ1} \\right\\rceil",
    "keywords": []
  },
  "\\langle Ꞩ1 |": {
  "latex": "\\left\\langle Ꞩ1 \\right|",
  "display": "\\left\\langle {Ꞩ1} \\right|",
  "keywords": []
  },
  "| Ꞩ1 \\rangle": {
    "latex": "\\left| Ꞩ1 \\right\\rangle",
    "display": "\\left| {Ꞩ1} \\right\\rangle",
    "keywords": []
  },
  "\\langle Ꞩ1 | Ꞩ2 \\rangle": {
    "latex": "\\left\\langle Ꞩ1 \\middle| Ꞩ2 \\right\\rangle",
    "display": "\\left\\langle {Ꞩ1} \\middle| {Ꞩ2} \\right\\rangle",
    "keywords": []
  }
};

// Not important enough to keep in the symbolpad
const other = [
  {
    "latex": "\\surd",
    "keywords": ["radical", "square root symbol", "root"]
  },
  { "latex": "\\hslash", "keywords": ["h-slash", "Planck constant", "physics"] },
  { "latex": "\\ddagger", "keywords": ["double dagger", "diesis", "reference mark"] },
  { "latex": "\\backslash", "keywords": ["backslash", "set difference", "delimiter"] },
]

const defaultFrequentlyUsedSymbols = [
  { "latex": "=", "keywords": ["equals", "equality", "is equal to"] },
  { "latex": "+", "keywords": ["plus", "addition", "add"] },
  { "latex": "-", "keywords": ["minus", "subtraction", "subtract"] },
  { "latex": "\\cdot", "keywords": ["center dot", "times", "multiply", "dot product"] },
  { "latex": "\\times", "keywords": ["times", "multiplication", "cross"] },
  { "latex": "\\div", "keywords": ["divide", "division", "obelus"] },
  { "latex": "<", "keywords": ["less than", "inequality", "comparison"] },
  { "latex": ">", "keywords": ["greater than", "inequality", "comparison"] },
  {
    "latex": "\\frac{Ꞩ1}{Ꞩ2}",
    "keywords": ["fraction", "division", "rational"],
    "id": "frac"
  },
  {
    "latex": "\\sqrt{Ꞩ1}",
    "keywords": ["square root", "radical", "root"]
  },
  {
    "latex": "\\int",
    "keywords": ["integral", "calculus", "antiderivative"]
  },
  {
    "latex": "\\sum",
    "keywords": ["summation", "series", "sum", "sigma"]
  },
  { "latex": "\\in", "keywords": ["element of", "belongs to", "set"] },
  { "latex": "\\subset", "keywords": ["subset", "proper subset", "contained in"] },
  { "latex": "\\cup", "keywords": ["union", "sets", "combine"] },
  { "latex": "\\cap", "keywords": ["intersection", "sets", "common elements"] },
  { "latex": "\\forall", "keywords": ["for all", "quantifier", "logic"] },
  { "latex": "\\exists", "keywords": ["there exists", "quantifier", "logic"] },
  { "latex": "\\rightarrow", "keywords": ["arrow", "function", "maps to", "to"] },
  { "latex": "\\leftarrow", "keywords": ["left arrow", "reverse", "mapping", "assignment", "gets"] },
  { "latex": "\\Rightarrow", "keywords": ["double arrow", "implies", "logic"] },
  { "latex": "\\Leftrightarrow", "keywords": ["double double arrow", "if and only if", "logic", "equivalence", "iff", "bi-implication"] },
  { "latex": "\\neg", "keywords": ["negation", "not", "logic"] },
  { "latex": "\\wedge", "keywords": ["logical and", "conjunction", "logic"] },
  { "latex": "\\vee", "keywords": ["logical or", "disjunction", "logic"] },
  { "latex": "\\alpha", "keywords": ["alpha", "greek", "letter"] },
  { "latex": "\\pi", "keywords": ["pi", "greek", "letter", "ratio"] },
  { "latex": "\\mathbb{R}", "keywords": ["real numbers", "blackboard", "set"] }
];

module.exports = {
  symbol_categories,
  symbolVariants,
  negatableSymbols,
  autoScalableDelimiters,
  other,
  defaultFrequentlyUsedSymbols
};
