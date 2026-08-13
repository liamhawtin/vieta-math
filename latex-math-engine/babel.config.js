module.exports = api => {
    const isESMBuild = api.env("esm");

    const presets = [
        ["@babel/env", {
            loose: true,
        }],
        "@babel/preset-flow",
    ];
    if (isESMBuild) {
        presets[0][1].targets = {
            esmodules: true,
        };
    }
    const plugins = [
        "@babel/plugin-syntax-flow",
        "@babel/transform-runtime",
        ["@babel/proposal-class-properties", {
            loose: true,
        }],
        "version-inline",
        "preval",
    ];

    return {
        presets,
        plugins,
    };
};
