window.Buffer = require('buffer').Buffer;
window.process = require('process/browser');

import Game from './src/modules/Game';
import main from './machine-learning/main';

import Event from 'events';
import Events from './machine-learning/events';


document.addEventListener('DOMContentLoaded', async function () {
  const eventEmitter = new Event();
  const container = await main()
  eventEmitter.on('user-shoot', (data) => {
    Events.dispatchOnShoot(data);
  });

  Events.onShoot((data) => {
    eventEmitter.emit('shoot', data);
  });

  Events.onStartCapture(() => {
    eventEmitter.emit('disable-aim');
  })
  Events.onStopCapture(() => {

    eventEmitter.emit('enable-aim');
  })

  Events.onRunModel(() => {
    // eventEmitter.emit('enable-aim')

    // eventEmitter.emit('run-model');
  })

  const game = new Game({
    eventEmitter,
    container,
    spritesheet: 'sprites.json'
  });
  game.load();


}, false);