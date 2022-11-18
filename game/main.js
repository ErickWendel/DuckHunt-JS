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
    const url = `${SERVER_URL}?id=${id}`
    const qr = document.getElementById('joystick-qr');
    console.log({url})
    qr.setAttribute('src', `https://chart.googleapis.com/chart?cht=qr&chs=512&chl=${encodeURIComponent(url)}&choe=UTF-8`);
    if (!link) return;
    link.setAttribute('href', url);
    link.style.display = null
    // Use google api to rende qr code with encoded url
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