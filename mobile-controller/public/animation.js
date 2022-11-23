const $ = document.querySelector.bind(document);

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
  $('html').style.animation = '';
  $('#root').classList.remove('animated');
};

const startAnimation = () => {
  // stops current animation
  stopAnimation();

  // allows animation restart -> https://css-tricks.com/restart-css-animation/
  void $('html').offsetWidth;

  // start animation again
  $('html').style.animation = 'Pew 1.1s';
  $('#root').classList.add('animated');
  shoot();
};

export default startAnimation;
