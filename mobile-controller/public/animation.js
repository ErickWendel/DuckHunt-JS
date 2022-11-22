const $ = document.querySelector.bind(document);

const animationMap = {
  html: 'Pew 1.1s',
  '#shotgun3': 'charge 0.55s alternate',
  '#shotgun4': 'Peww 1.1s',
  '#shotgun5': 'trigger 1.1s',
  '#dot': 'cool 2s',
  '#dot1': 'cooll 2s',
  '#dot2': 'coolll 2s',
};

const animationMapKeys = Object.keys(animationMap);

const shoot = () => {
  const base = $('.bullets');
  const newBullets = base.cloneNode(true);

  newBullets.style.opacity = '1';

  base.parentNode.appendChild(newBullets);

  setTimeout(() => {
    base.parentNode.removeChild(newBullets);
  }, 1000);
};

const stopAnimation = () => {
  animationMapKeys.forEach(key => ($(key).style.animation = ''));
};

const startAnimation = () => {
  // stops current animation
  stopAnimation();

  // allows animation restart -> https://css-tricks.com/restart-css-animation/
  void $('html').offsetWidth;

  // start animation again
  animationMapKeys.forEach(key => ($(key).style.animation = animationMap[key]));
  shoot();
};

export default startAnimation;
