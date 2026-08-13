import { Plugin, PluginKey } from "prosemirror-state";
import { InputRule } from "prosemirror-inputrules";
import lme from "lme";

export const vietaMathInputRulesKey = new PluginKey("vietaMathInputRules");

const MAX_MATCH = 500;

export function vietaMathInputRulesPlugin(schema) {
  const type = schema.nodes.vieta_math_inline;

  const rule = new InputRule(/\$([^$\n]+)\$$/, (state, match, start, end) => {
    const latex = lme.expandString(match[1] || "");
    const id = `vieta-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return state.tr.replaceWith(start, end, type.create({ id, latex }));
  });

  return new Plugin({
    key: vietaMathInputRulesKey,
    isInputRules: true,
    props: {
      handleTextInput(view, from, to, text) {
        const { state } = view;
        const { $from } = state.selection;

        if (!$from.parent.isTextblock) return false;

        const parentText = $from.parent.textBetween(
          Math.max(0, $from.parentOffset - MAX_MATCH),
          $from.parentOffset,
          null,
          "\ufffc"
        );

        const textBefore = parentText + text;
        const match = rule.match.exec(textBefore);
        if (!match) return false;

        const matchText = match[0];
        const start = from - (matchText.length - text.length);
        const end = to;

        const tr = rule.handler(state, match, start, end);
        if (!tr) return false;

        tr.setMeta(vietaMathInputRulesKey, {
          from: start,
          to: end,
          text: matchText,
        });

        view.dispatch(tr);
        return true;
      },
    },
  });
}
