(() => {
  const hero = document.querySelector('.hero');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const visitKey = 'desert-silk-spray-seen';
  if (!hero || motion.matches) return;
  const preview = new URLSearchParams(location.search).get('preview') === 'spray';
  try { if (!preview && sessionStorage.getItem(visitKey)) return; } catch {}
  let started = false;
  function playSpray() {
    if (started || motion.matches) return;
    started = true;
    const canvas = document.createElement('canvas');
    canvas.className = 'spray-intro';
    canvas.setAttribute('aria-hidden', 'true');
    const context = canvas.getContext('2d');
    if (!context) return;
    hero.append(canvas);
    hero.dataset.sprayState = 'playing';
    try { sessionStorage.setItem(visitKey, 'true'); } catch {}
    const bounds = hero.getBoundingClientRect();
    const width = bounds.width;
    const height = bounds.height;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.scale(ratio, ratio);
    const visibleHeight = Math.min(height, Math.max(200, innerHeight - Math.max(0, bounds.top)));
    const origin = { x: width * .82, y: visibleHeight * .65 };
    const distance = Math.min(width * .7, 720);
    const particles = Array.from({ length: 160 }, (_, i) => ({
      delay: Math.random() * 380,
      travel: distance * (.45 + Math.random() * .55),
      spread: (Math.random() - .5) * visibleHeight * .65,
      radius: i < 105 ? 12 + Math.random() * 32 : .8 + Math.random() * 2,
      cloud: i < 105,
      gold: Math.random() > .65,
      phase: Math.random() * Math.PI * 2
    }));
    let frame;
    let began;
    function finish() {
      cancelAnimationFrame(frame);
      canvas.remove();
      hero.dataset.sprayState = 'complete';
      motion.removeEventListener('change', stopForReducedMotion);
      window.removeEventListener('pagehide', finish);
    }
    function stopForReducedMotion() { if (motion.matches) finish(); }
    motion.addEventListener('change', stopForReducedMotion);
    window.addEventListener('pagehide', finish, { once: true });
    function draw(time) {
      if (began === undefined) began = time;
      const elapsed = time - began;
      context.clearRect(0, 0, width, height);
      for (const p of particles) {
        const age = (elapsed - p.delay) / 2100;
        if (age <= 0 || age >= 1) continue;
        const travel = 1 - Math.pow(1 - age, 2);
        const x = origin.x - p.travel * travel;
        const y = origin.y + p.spread * travel - age * visibleHeight * .18 + Math.sin(age * 4 + p.phase) * age * 14;
        const fade = Math.sin(Math.PI * age) * (p.cloud ? .075 : .6);
        const radius = p.radius * (p.cloud ? .35 + age * 2 : 1 + age);
        const color = p.gold ? '230,196,137' : '250,237,222';
        const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `rgba(${color},${fade})`);
        gradient.addColorStop(.35, `rgba(${color},${fade * .55})`);
        gradient.addColorStop(1, `rgba(${color},0)`);
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
      }
      if (elapsed < 2600) frame = requestAnimationFrame(draw);
      else finish();
    }
    frame = requestAnimationFrame(draw);
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect();
        playSpray();
      }
    }, { threshold: .2 });
    observer.observe(hero);
  } else playSpray();
})();

