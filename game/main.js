import Game from './src/modules/Game';
import Socket from './src/modules/Socket';
import Event from 'events';

const SERVER_URL = 'https://duckhunt-controller.herokuapp.com';

document.addEventListener('DOMContentLoaded', function() {
  const eventEmitter = new Event();
  Socket.connect({
    url: SERVER_URL,
    eventEmitter,
  });
  eventEmitter.on('connection', ({
    id
  }) => {
    const link = document.getElementById('joystick-link');
    if (!link) return;
    link.setAttribute('href', `${SERVER_URL}?id=${id}`);
  });

  // once something is received, initializes the game
  eventEmitter.once('move-aim', () => {
    document.getElementById('intro').remove();
    const game = new Game({
      eventEmitter,
      spritesheet: 'sprites.json'
    });
    game.load();

  });

}, false);