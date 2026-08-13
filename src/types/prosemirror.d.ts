import type { Schema } from 'prosemirror-model';
import type { EditorState } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';

export const vietaMathNodes: any;
export const vietaMathPlugin: any;
export const createVietaMathNodeView: any;
export const vietaMathInputRulesPlugin: any;

export function insertVietaMath(
  schema: Schema
): (state: EditorState, dispatch: EditorView['dispatch']) => boolean;

export function exitActiveVietaMath(view: EditorView): boolean;

export function getVietaMathNodePosition(
  state: EditorState,
  instanceId: string
): { pos: number; node: unknown } | null;
