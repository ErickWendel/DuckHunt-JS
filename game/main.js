window.Buffer = require('buffer').Buffer;
window.process = require('process/browser');

import Game from './src/modules/Game';
import main from './machine-learning/main';

import Event from 'events';


document.addEventListener('DOMContentLoaded', async function () {
  const eventEmitter = new Event();

  const game = new Game({
    eventEmitter,
    spritesheet: 'sprites.json'
  });
  await game.load();
  await main(game)



}, false);