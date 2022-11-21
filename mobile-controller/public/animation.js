const $ = document.querySelector.bind(document);

const animationMap = {
  html: 'Pew 1.1s',
  '#shotgun3': 'charge 0.55s alternate',
  '#shotgun4': 'Peww 1.1s',
  '#shotgun5': 'trigger 1.1s',
  '#dot': 'cool 2s',
  '#dot1': 'cooll 2s',
  '#dot2': 'coolll 2s',
  // '#bullet': 'bang 1.1s',
  // '#bullet1': 'bangg 1.1s',
  // '#bullet2': 'banggg 1.1s',
  // '#bullet3': 'bangggg 1.1s',
  // '#bullet4': 'banggg2 1.1s',
  // '#bullet5': 'banggg3 1.1s',
  // '#bullet6': 'banggg4 1.1s',
  // '#bullet7': 'banggg5 1.1s',
  // '#bullet8': 'banggg6 1.1s',
};

const animationMapKeys = Object.keys(animationMap);

const shoot = () => {
  const shotID = new Date().getTime();
  const customSelector = `#shot-${shotID}`;
  const base = $('.bullets');

  const newBullets = base.cloneNode(true);

  newBullets.style.opacity = '1';
  newBullets.classList.add(customSelector);

  base.parentNode.appendChild(newBullets);

  setTimeout(() => {
    base.parentNode.removeChild(newBullets);
  }, 1000);
};

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
  shoot();
};

$('html').addEventListener('click', startAnimation);
