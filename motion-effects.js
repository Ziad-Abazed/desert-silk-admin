import { animate, hover, inView, stagger } from 'motion';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let stopProductHover = () => {};

export function initHomeMotion() {
  if (reducedMotion.matches) return;
  animate('.hero-copy > *', { opacity: [0, 1], y: [18, 0] }, {
    duration: .8, delay: stagger(.12), ease: [.22, 1, .36, 1]
  });
  inView('.section-top, .filters, .story', element => {
    animate(element, { opacity: [0, 1], y: [24, 0] }, {
      duration: .7, ease: [.22, 1, .36, 1]
    });
  }, { amount: .15 });
}

export function mountProductMotion() {
  stopProductHover();
  if (reducedMotion.matches) return;
  animate('.product', { opacity: [0, 1], y: [18, 0] }, {
    duration: .45, delay: stagger(.05), ease: [.22, 1, .36, 1]
  });
  stopProductHover = hover('.product', card => {
    const image = card.querySelector('.product-image');
    const photo = image.querySelector('img');
    animate(image, { y: -6 }, { duration: .3, ease: 'easeOut' });
    animate(photo, { scale: 1.07 }, { duration: .45, ease: 'easeOut' });
    return () => {
      animate(image, { y: 0 }, { duration: .3, ease: 'easeOut' });
      animate(photo, { scale: 1 }, { duration: .45, ease: 'easeOut' });
    };
  });
}

export function initProductMotion() {
  if (reducedMotion.matches) return;
  animate('.detail-copy', { opacity: [0, 1], y: [18, 0] }, {
    duration: .7, ease: [.22, 1, .36, 1]
  });
  animate('.detail-image', { opacity: [0, 1] }, { duration: .6 });
  hover('.detail-image', image => {
    const photo = image.querySelector('img');
    animate(photo, { scale: 1.07 }, { duration: .5, ease: 'easeOut' });
    return () => animate(photo, { scale: 1 }, { duration: .5, ease: 'easeOut' });
  });
}
