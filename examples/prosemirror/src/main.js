import { history } from "prosemirror-history";
import { Schema } from "prosemirror-model";
import { schema as basicSchema } from "prosemirror-schema-basic";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { UIRegistry, VietaMath } from "@liamhawtin/vieta-math";
import {
  createVietaMathNodeView,
  vietaMathInputRulesPlugin,
  vietaMathNodes,
  vietaMathPlugin,
} from "@liamhawtin/vieta-math/prosemirror";
import "prosemirror-view/style/prosemirror.css";
import "./styles.css";

const nodes = basicSchema.spec.nodes.append(vietaMathNodes);
const schema = new Schema({ nodes, marks: basicSchema.spec.marks });
const symbolPad = document.querySelector("#symbol-pad");
const smartMenu = document.querySelector("#smart-menu");

const state = EditorState.create({
  schema,
  plugins: [
    vietaMathInputRulesPlugin(schema),
    vietaMathPlugin(schema),
    history(),
  ],
});

new EditorView(document.querySelector("#editor"), {
  state,
  nodeViews: {
    vieta_math_inline: createVietaMathNodeView(VietaMath, {
      symbolPadContainer: symbolPad,
      smartMenuContainer: smartMenu,
    }),
  },
});

UIRegistry.mountSymbolPad(symbolPad);
UIRegistry.mountSmartMenu(smartMenu);
