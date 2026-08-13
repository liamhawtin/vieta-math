import lme from 'lme';

function leafText(node) {
  let expr = node.attrs.latex;
  if (!expr) return "";
  try {
    expr = lme.exportString(expr);
    return expr ? `$${expr}$` : "";
  } catch {
    return "";
  }
}

export const vietaMathNodes = {
  vieta_math_inline: {
    inline: true,
    group: "inline",
    atom: true,
    selectable: true,
    draggable: false,

    attrs: {
      id: { default: null },
      instanceId: { default: null },
      latex: { default: "" },
      vietaData: { default: null },
    },

    leafText,

    toDOM(node) {
      return [
        "span",
        {
          class: "pm-vieta-math",
          "data-vieta-math": "1",
          "data-id": node.attrs.id,
          "data-instanceId": node.attrs.instanceId,
          "data-latex": node.attrs.latex
        },
        leafText(node)
      ];
    },

    parseDOM: [
      {
        tag: 'span[data-vieta-math="1"]',
        getAttrs(dom) {
          return {
            id: dom.getAttribute("data-id"),
            instanceId: dom.getAttribute("data-instanceId"),
            latex: dom.getAttribute("data-latex") || "",
            vietaData: null,
          };
        },
      },
    ],
  },
};
