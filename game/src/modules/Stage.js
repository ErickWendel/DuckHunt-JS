// UPDATED FOR PIXIJS v8
import { Point, Graphics, Container, Sprite } from 'pixi.js';

import BPromise from 'bluebird';
import { some as _some } from 'lodash/collection';
import { delay as _delay } from 'lodash/function';
import { inRange as _inRange } from 'lodash/number';
import Utils from '../libs/utils';
import Duck from './Duck';
import Dog from './Dog';
import Hud from './Hud';
import Aim from './Aim';

const MAX_X = 800;
const MAX_Y = 600;

const DUCK_POINTS = {
  ORIGIN: new Point(MAX_X / 2, MAX_Y)
};
const DOG_POINTS = {
  DOWN: new Point(MAX_X / 2, MAX_Y),
  UP: new Point(MAX_X / 2, MAX_Y - 230),
  SNIFF_START: new Point(0, MAX_Y - 130),
  SNIFF_END: new Point(MAX_X / 2, MAX_Y - 130)
};
const HUD_LOCATIONS = {
  SCORE: new Point(MAX_X - 10, 10),
  WAVE_STATUS: new Point(MAX_X - 11, MAX_Y - 30),
  LEVEL_CREATOR_LINK: new Point(MAX_X - 11, MAX_Y - 10),
  FULL_SCREEN_LINK: new Point(MAX_X - 130, MAX_Y - 10),
  PAUSE_LINK: new Point(MAX_X - 318, MAX_Y - 10),
  MUTE_LINK: new Point(MAX_X - 236, MAX_Y - 10),
  GAME_STATUS: new Point(MAX_X / 2, MAX_Y * 0.45),
  REPLAY_BUTTON: new Point(MAX_X / 2, MAX_Y * 0.56),
  BULLET_STATUS: new Point(10, 10),
  DEAD_DUCK_STATUS: new Point(10, MAX_Y * 0.91),
  MISSED_DUCK_STATUS: new Point(10, MAX_Y * 0.95)
};

const FLASH_MS = 60;
const FLASH_SCREEN = new Graphics();
FLASH_SCREEN.fill(0xFFFFFF);
FLASH_SCREEN.rect(0, 0, MAX_X, MAX_Y);
FLASH_SCREEN.fill();
FLASH_SCREEN.position.set(0, 0);

class Stage extends Container {
  constructor({ textures }) {
    super();
    this.locked = false;
    this.interactive = true;
    this.ducks = [];

    this.dog = new Dog({
      textures: textures,
      downPoint: DOG_POINTS.DOWN,
      upPoint: DOG_POINTS.UP
    });
    this.dog.visible = false;
    this.flashScreen = FLASH_SCREEN;
    this.flashScreen.visible = false;
    this.textures = textures

    this.hud = new Hud({ textures: textures });
    this.aim = new Aim({
      textures: textures,
      maxX: MAX_X,
      maxY: MAX_Y
    });
    this._setStage();
    this.scaleToWindow();
  }

  static scoreBoxLocation() { return HUD_LOCATIONS.SCORE; }
  static waveStatusBoxLocation() { return HUD_LOCATIONS.WAVE_STATUS; }
  static gameStatusBoxLocation() { return HUD_LOCATIONS.GAME_STATUS; }
  static pauseLinkBoxLocation() { return HUD_LOCATIONS.PAUSE_LINK; }
  static muteLinkBoxLocation() { return HUD_LOCATIONS.MUTE_LINK; }
  static fullscreenLinkBoxLocation() { return HUD_LOCATIONS.FULL_SCREEN_LINK; }
  static levelCreatorLinkBoxLocation() { return HUD_LOCATIONS.LEVEL_CREATOR_LINK; }
  static replayButtonLocation() { return HUD_LOCATIONS.REPLAY_BUTTON; }
  static bulletStatusBoxLocation() { return HUD_LOCATIONS.BULLET_STATUS; }
  static deadDuckStatusBoxLocation() { return HUD_LOCATIONS.DEAD_DUCK_STATUS; }
  static missedDuckStatusBoxLocation() { return HUD_LOCATIONS.MISSED_DUCK_STATUS; }

  pause() {
    this.dog.timeline.pause();
    this.ducks.forEach((duck) => duck.timeline.pause());
  }

  resume() {
    this.dog.timeline.play();
    this.ducks.forEach((duck) => duck.timeline.play());
  }

  scaleToWindow() {
    this.scale.set(window.innerWidth / MAX_X, window.innerHeight / MAX_Y);
  }

  _setStage() {
    const background = new Sprite(this.textures['scene/back/0.png']);
    background.position.set(0, 0);

    const tree = new Sprite(this.textures['scene/tree/0.png']);
    tree.position.set(100, 237);

    this.addChild(tree);
    this.addChild(background);
    this.addChild(this.dog);
    this.addChild(this.flashScreen);
    this.addChild(this.hud);
    this.addChild(this.aim);

    return this;
  }

  preLevelAnimation() {
    return new BPromise((resolve) => {
      this.cleanUpDucks();
      this.dog.sniff({
        startPoint: DOG_POINTS.SNIFF_START,
        endPoint: DOG_POINTS.SNIFF_END
      }).find({
        onComplete: () => {
          this.setChildIndex(this.dog, 0);
          resolve();
        }
      });
    });
  }

  addDucks(numDucks, speed) {
    for (let i = 0; i < numDucks; i++) {
      const duckColor = i % 2 === 0 ? 'red' : 'black';
      const newDuck = new Duck({
        textures: this.textures,
        colorProfile: duckColor,
        maxX: MAX_X,
        maxY: MAX_Y
      });
      newDuck.position.set(DUCK_POINTS.ORIGIN.x, DUCK_POINTS.ORIGIN.y);
      this.addChildAt(newDuck, 0);
      newDuck.randomFlight({ speed });
      this.ducks.push(newDuck);
    }
  }

  shotsFired(clickPoint, radius) {
    // this.flashScreen.visible = true; // TODO:erickwendel uncomment to flash screen
    _delay(() => { this.flashScreen.visible = false; }, FLASH_MS);

    let ducksShot = 0;
    const scaledClick = this.getScaledClickLocation(clickPoint);

    for (const duck of this.ducks) {
      if (duck.alive && Utils.pointDistance(duck.position, scaledClick) < radius) {
        ducksShot++;
        duck.shot();
        duck.timeline.add(() => {
          if (!this.isLocked()) {
            this.dog.retrieve();
          }
        });
      }
    }
    return ducksShot;
  }

  clickedReplay(clickPoint) {
    return Utils.pointDistance(this.getScaledClickLocation(clickPoint), HUD_LOCATIONS.REPLAY_BUTTON) < 200;
  }

  clickedLevelCreatorLink(clickPoint) {
    const pt = this.getScaledClickLocation(clickPoint);
    return _inRange(pt.x, HUD_LOCATIONS.LEVEL_CREATOR_LINK.x - 110, HUD_LOCATIONS.LEVEL_CREATOR_LINK.x) &&
      _inRange(pt.y, HUD_LOCATIONS.LEVEL_CREATOR_LINK.y - 30, HUD_LOCATIONS.LEVEL_CREATOR_LINK.y + 10);
  }

  clickedPauseLink(clickPoint) {
    const pt = this.getScaledClickLocation(clickPoint);
    return _inRange(pt.x, HUD_LOCATIONS.PAUSE_LINK.x - 110, HUD_LOCATIONS.PAUSE_LINK.x) &&
      _inRange(pt.y, HUD_LOCATIONS.PAUSE_LINK.y - 30, HUD_LOCATIONS.PAUSE_LINK.y + 10);
  }

  clickedFullscreenLink(clickPoint) {
    const pt = this.getScaledClickLocation(clickPoint);
    return _inRange(pt.x, HUD_LOCATIONS.FULL_SCREEN_LINK.x - 110, HUD_LOCATIONS.FULL_SCREEN_LINK.x) &&
      _inRange(pt.y, HUD_LOCATIONS.FULL_SCREEN_LINK.y - 30, HUD_LOCATIONS.FULL_SCREEN_LINK.y + 10);
  }

  clickedMuteLink(clickPoint) {
    const pt = this.getScaledClickLocation(clickPoint);
    return _inRange(pt.x, HUD_LOCATIONS.MUTE_LINK.x - 110, HUD_LOCATIONS.MUTE_LINK.x) &&
      _inRange(pt.y, HUD_LOCATIONS.MUTE_LINK.y - 30, HUD_LOCATIONS.MUTE_LINK.y + 10);
  }

  getScaledClickLocation(clickPoint) {
    return {
      x: clickPoint.x / this.scale.x,
      y: clickPoint.y / this.scale.y
    };
  }

  flyAway() {
    this.dog.stopAndClearTimeline();
    this.dog.laugh();
    this.lock();
    const duckPromises = this.ducks
      .filter((d) => d.alive)
      .map((duck) => new BPromise((resolve) => {
        duck.stopAndClearTimeline();
        duck.flyTo({
          point: new Point(MAX_X / 2, -500),
          onComplete: resolve
        });
      }));
    return BPromise.all(duckPromises)
      .then(this.cleanUpDucks.bind(this))
      .then(this.unlock.bind(this));
  }

  cleanUpDucks() {
    this.ducks.forEach((duck) => this.removeChild(duck));
    this.ducks = [];
  }

  ducksAlive() {
    return _some(this.ducks, (duck) => duck.alive);
  }

  ducksActive() {
    return _some(this.ducks, (duck) => duck.isActive());
  }

  dogActive() {
    return this.dog.isActive();
  }

  isActive() {
    return this.dogActive() || this.ducksAlive() || this.ducksActive();
  }

  lock() {
    this.locked = true;
  }

  unlock() {
    this.locked = false;
  }

  isLocked() {
    return this.locked;
  }
}

export default Stage;
