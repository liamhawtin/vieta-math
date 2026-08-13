import { MMLInspector as ML } from "@utils/MMLInspector";

export class ArrayManager {
  constructor() {
    this.NS = 'http://www.w3.org/1998/Math/MathML';

    this.array = null;
  }

  start(array) {
    this.array = array;
    this.array.classList.add('edit-array');
  }

  cancel() {

  }

}
