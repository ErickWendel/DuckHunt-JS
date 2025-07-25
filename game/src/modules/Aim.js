import { Sprite } from 'pixi.js';

const DEFAULT_SIZE = 40;
const DEFAULT_POSITION = 350;

class Aim extends Sprite {
  constructor({ maxX, maxY, textures }) {
    super(textures['aim/0.png']);

    this.maxX = maxX;
    this.maxY = maxY;

    this.setSize(DEFAULT_SIZE, DEFAULT_SIZE);
    this.move(DEFAULT_POSITION, DEFAULT_POSITION);
    this.visible = true;
  }

  move(x, y) {
    this.position.set(x, y);
  }
  setSize(width, height) {
    this.width = width;
    this.height = height;
  }

  setPosition(x, y) {
    this.position.set(x, y);

    // if (this.visible) {
    //   this.visible = false;
    // }
  }

  normalizePosition(x, y) {
    const newTargetX = this.position.x + x;
    const newTargetY = this.position.y + y;

    const moveToX = newTargetX > this.maxX ? this.position.x : newTargetX;
    const moveToY = newTargetY > this.maxY ? this.position.y : newTargetY;
    return {
      x: moveToX,
      y: moveToY
    };
  }

  move(x, y) {
    const data = this.normalizePosition(x, y);

    this.position.set(data.x, data.y);

    // if (!this.visible) {
    //   this.visible = true;
    // }
  }

  reset() {
    this.setPosition(DEFAULT_POSITION, DEFAULT_POSITION);
    this.visible = false;
  }
}

export default Aim;