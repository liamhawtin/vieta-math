import type { Node as ProseMirrorNode, NodeSpec, Schema } from 'prosemirror-model';
import type { Command, EditorState, Plugin, PluginKey } from 'prosemirror-state';
import type { EditorView, NodeView } from 'prosemirror-view';
import type { VietaMath } from './index';

export const vietaMathNodes: {
  vieta_math_inline: NodeSpec;
};

export const vietaMathKey: PluginKey;
export const vietaMathInputRulesKey: PluginKey;

export function vietaMathPlugin(schema: Schema): Plugin;
export function vietaMathInputRulesPlugin(schema: Schema): Plugin;

export interface VietaMathNodeViewOptions {
  toolbarContainer?: HTMLElement | string | null;
  symbolPadContainer?: HTMLElement | string | null;
  smartMenuContainer?: HTMLElement | string | null;
  externalMethods?: Record<string, (...args: unknown[]) => unknown> | null;
}

export function createVietaMathNodeView(
  VietaMathClass: typeof VietaMath,
  options?: VietaMathNodeViewOptions
): (node: ProseMirrorNode, view: EditorView, getPos: () => number) => NodeView;

export function insertVietaMath(
  schema: Schema,
  explicitLatex?: string
): Command;

export function exitActiveVietaMath(view: EditorView): boolean;

export function getVietaMathNodePosition(
  state: EditorState,
  instanceId: string
): { pos: number; size: number } | null;
