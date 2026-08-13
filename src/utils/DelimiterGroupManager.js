import { MMLInspector as ML } from "@utils/MMLInspector";

export class DelimiterGroupManager {
  constructor() {
    this.NS = 'http://www.w3.org/1998/Math/MathML';
    this.group = null;
    this.originalParent = null;
    this.originalParentSnapshot = null;

    this.anchorNode = null;
    this.activeEdge = null;

    this._originalAttributesMap = new Map();
  }

  generateUUID() {
    return 'mml-delim-' + crypto.randomUUID();
  }

  backupAndNormalizeDelimiter(delim) {
    if (!delim.id) {
      delim.id = this.generateUUID();
    }

    const prevAttrs = {};
    for (let attr of delim.attributes) {
      prevAttrs[attr.name] = attr.value;
    }

    this._originalAttributesMap.set(delim.id, prevAttrs);

    delim.setAttribute('fence', 'true');

    delim.removeAttribute('stretchy');
    delim.removeAttribute('minsize');
    delim.removeAttribute('maxsize');
  }

  restoreOriginalAttributes(delim) {
    const id = delim.id;
    if (!delim.id || !this._originalAttributesMap.has(id)) return;

    // Clear all current attributes first
    while (delim.attributes.length > 0) {
      delim.removeAttribute(delim.attributes[0].name);
    }

    const original = this._originalAttributesMap.get(id);

    for (const [key, value] of Object.entries(original)) {
      delim.setAttribute(key, value);
    }

    this._originalAttributesMap.delete(id);
  }

  startDelimiterGroupWith(delimiterNode) {
    if (!ML.isDelimiter(delimiterNode)) return null;

    const group = document.createElementNS(this.NS, 'mrow');
    group.classList.add('dynamic-delimiter-group');

    const parent = delimiterNode.parentNode;

    this.originalParent = parent;
    this.originalParentSnapshot = parent.cloneNode(true);

    this.backupAndNormalizeDelimiter(delimiterNode);

    parent.replaceChild(group, delimiterNode);
    group.appendChild(delimiterNode);

    this.group = group;
    this.anchorNode = delimiterNode;
    this.activeEdge = null;

    return group;
  }

  autoExpand(direction) {
    if (!this.group || !this.anchorNode) return;

    const children = Array.from(this.group.children);
    const anchorIndex = children.indexOf(this.anchorNode);

    const expandEdge = (dir) => {
      let target = null;
      if (dir === 'right') {
        target = this.group.nextElementSibling;
        if (target && ML.isDelimiter(target)) this.backupAndNormalizeDelimiter(target);
        if (target) this.group.appendChild(target);
      } else {
        target = this.group.previousElementSibling;
        if (target && ML.isDelimiter(target)) this.backupAndNormalizeDelimiter(target);
        if (target) this.group.insertBefore(target, this.group.firstChild);
      }
    };

    if (!this.activeEdge) {
      this.activeEdge = direction;
    }

    if (direction === this.activeEdge) {
      expandEdge(direction);
    } else {
      if (this.activeEdge === 'right') {
        const last = this.group.lastElementChild;
        if (children.indexOf(last) > anchorIndex) {
          this.group.removeChild(last);
          this.group.parentNode.insertBefore(last, this.group.nextElementSibling);
          this.restoreOriginalAttributes(last);
        } else {
          this.activeEdge = direction;
          expandEdge(direction);
        }
      } else if (this.activeEdge === 'left') {
        const first = this.group.firstElementChild;
        if (children.indexOf(first) < anchorIndex) {
          this.group.removeChild(first);
          this.group.parentNode.insertBefore(first, this.group);
          this.restoreOriginalAttributes(first);
        } else {
          this.activeEdge = direction;
          expandEdge(direction);
        }
      }
    }
  }

  extendRight() {
    const next = this.group?.nextElementSibling;
    if (next) {
      if (ML.isDelimiter(next)) this.backupAndNormalizeDelimiter(next);
      this.group.appendChild(next);
    }
  }

  shrinkRight() {
    const children = this.group?.children;
    if (children?.length > 1) {
      const last = children[children.length - 1];
      this.group.removeChild(last);
      this.group.parentNode.insertBefore(last, this.group.nextElementSibling);
      this.restoreOriginalAttributes(last);
    }
  }

  extendLeft() {
    const prev = this.group?.previousElementSibling;
    if (prev) {
      if (ML.isDelimiter(prev)) this.backupAndNormalizeDelimiter(prev);
      this.group.insertBefore(prev, this.group.firstChild);
    }
  }

  shrinkLeft() {
    const children = this.group?.children;
    if (children?.length > 1) {
      const first = children[0];
      this.group.removeChild(first);
      this.group.parentNode.insertBefore(first, this.group);
      this.restoreOriginalAttributes(first);
    }
  }

  cancelGroup() {
    if (!this.originalParent || !this.originalParentSnapshot) return;

    const restored = this.originalParentSnapshot.cloneNode(true);
    this.originalParent.replaceWith(restored);

    this.group = null;
    this.originalParent = null;
    this.originalParentSnapshot = null;
    this.anchorNode = null;
    this.activeEdge = null;
    this._originalAttributesMap.clear();
  }

  getGroupInfo() {
    if (!this.activeEdge || !this.group || !this.anchorNode) return null;

    const children = Array.from(this.group.children);
    const anchorIndex = children.indexOf(this.anchorNode);
    const first = children[0];
    const last = children[children.length - 1];

    return {
      elements: children,
      anchorIndex,
      groupExpandsFromLeft: this.activeEdge === "right",
      isClosed: ML.isDelimiter(first) && ML.isDelimiter(last)
    };
  }

  getGroup() {
    return this.group;
  }
}
