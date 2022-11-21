const $ = document.querySelector.bind(document);
console.log('here bitches');

const animationMap = {
  html: 'Pew 1.1s',
  '#shotgun3': 'charge 0.55s alternate',
  '#shotgun4': 'Peww 1.1s',
  '#dot': 'cool 2s',
  '#dot1': 'cooll 2s',
  '#dot2': 'coolll 2s',
};

const animationMapKeys = Object.keys(animationMap);

const stopAnimation = () => {
  animationMapKeys.forEach(key => ($(key).style.animation = ''));
};

const startAnimation = e => {
  e.preventDefault;

  // stops current animation
  stopAnimation();

  // allows animation restart -> https://css-tricks.com/restart-css-animation/
  void $('html').offsetWidth;

  // start animation again
  animationMapKeys.forEach(key => ($(key).style.animation = animationMap[key]));
};

$('html').addEventListener('click', startAnimation);
