'use strict';

{
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const PALETTE = ['--c1', '--c2', '--c3', '--c4', '--c5', '--c6', '--c7', '--c8', '--ink'].map((name) => `var(${name})`);

  const cloneTemplate = (id) => document.getElementById(id).content.cloneNode(true);

  // Restart a CSS animation
  const resetClasses = (el, ...classes) => {
    el.classList.remove(...classes);
    void el.offsetWidth;
  };

  // Screen-reader announcements go through one always-present live region
  let announceTimer;
  const announce = (text) => {
    const region = document.getElementById('announce');
    if (!region) return;
    clearTimeout(announceTimer);
    region.textContent = '';
    requestAnimationFrame(() => { region.textContent = text; });
    announceTimer = setTimeout(() => { region.textContent = ''; }, 5000);
  };

  initParallax();
  initKonami();
  initGotv();

  function initParallax() {
    const mark = document.querySelector('.mark');
    if (!mark) return;

    let pointerX = 0;
    let pointerY = 0;
    let frame = 0;

    const update = () => {
      frame = 0;
      if (reduceMotion.matches) {
        for (const prop of ['--sy', '--mx', '--my']) mark.style.removeProperty(prop);
        return;
      }
      mark.style.setProperty('--sy', `${Math.min(Math.round(scrollY * 0.2), 240)}px`);
      mark.style.setProperty('--mx', `${Math.round(-pointerX * 36)}px`);
      mark.style.setProperty('--my', `${Math.round(-pointerY * 22)}px`);
    };
    const schedule = () => { frame ||= requestAnimationFrame(update); };

    addEventListener('scroll', schedule, { passive: true });
    document.addEventListener('mousemove', (e) => {
      if (!finePointer.matches) return;
      pointerX = e.clientX / innerWidth - 0.5;
      pointerY = e.clientY / innerHeight - 0.5;
      schedule();
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', () => {
      pointerX = 0;
      pointerY = 0;
      schedule();
    });
    reduceMotion.addEventListener('change', schedule);
    schedule();
  }

  // Konami
  function initKonami() {
    const page = document.querySelector('.page');
    const toast = document.querySelector('.toast');
    if (!page || !toast) return;

    const SEQUENCE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
    let pos = 0;
    let timer;

    const reset = () => {
      page.classList.remove('burst');
      toast.replaceChildren();
    };

    const fire = () => {
      clearTimeout(timer);
      reset();
      resetClasses(page, 'burst');
      toast.replaceChildren(cloneTemplate('konami-toast'));
      page.classList.add('burst');
      announce('Konami code entered. Nice.');
      timer = setTimeout(reset, 3000);
    };

    document.addEventListener('keydown', (e) => {
      const { target, code } = e;
      if (target.isContentEditable || target.closest?.('input, textarea, select')) return;
      if (e.metaKey || e.ctrlKey || e.altKey || /^(Shift|CapsLock)/.test(code)) return;

      // A wrong key resets, unless it could be the start of a fresh attempt
      // (an extra ↑ after ↑ ↑ still counts as ↑ ↑).
      if (code === SEQUENCE[pos]) pos++;
      else if (code === 'ArrowUp') pos = pos === 2 ? 2 : 1;
      else pos = 0;

      if (pos === SEQUENCE.length) {
        pos = 0;
        fire();
      }
    });
  }

  // GOTV 
  function initGotv() {
    const trigger = document.querySelector('.gotv');
    const box = document.querySelector('.vote');
    const layer = document.querySelector('.confetti');
    if (!trigger || !box || !layer) return;

    let leaveTimer;
    let hideTimer;
    let confettiTimer;

    const animate = (cls) => {
      resetClasses(box, 'in', 'out');
      box.classList.add(cls);
    };

    const ask = () => {
      clearTimeout(leaveTimer);
      clearTimeout(hideTimer);
      box.replaceChildren(cloneTemplate('vote-ask'));
      box.hidden = false;
      animate('in');
      box.querySelector('.yes').focus({ preventScroll: true });
    };

    const leave = (delay) => {
      clearTimeout(leaveTimer);
      clearTimeout(hideTimer);
      leaveTimer = setTimeout(() => {
        animate('out');
        hideTimer = setTimeout(() => {
          box.hidden = true;
          box.replaceChildren();
        }, 600);
      }, delay);
    };

    const answer = (voted) => {
      const hadFocus = box.contains(document.activeElement);
      const reply = cloneTemplate(voted ? 'vote-yes' : 'vote-no');
      announce(reply.textContent);
      box.replaceChildren(reply);
      if (hadFocus) trigger.focus({ preventScroll: true });
      if (voted) burst();
      leave(2600);
    };

    const random = (min, range) => min + Math.round(Math.random() * range);
    const spreadOf = (range) => Math.round((Math.random() - 0.5) * range);

    const burst = () => {
      if (reduceMotion.matches) return;
      clearTimeout(confettiTimer);
      const spread = Math.min(innerWidth, 900);
      const bits = Array.from({ length: 80 }, (_, i) => {
        const bit = document.createElement('span');
        const w = random(6, 5);
        const h = random(9, 7);
        bit.style.cssText = `
          --dx: ${spreadOf(spread)}px;
          --dy: ${-random(200, 260)}px;
          --r: ${spreadOf(1080)}deg;
          inline-size: ${w}px;
          block-size: ${h}px;
          margin-inline-start: ${-w / 2}px;
          background: ${PALETTE[i % PALETTE.length]};
          animation-delay: ${random(0, 120)}ms;
          animation-duration: ${random(1700, 700)}ms;
        `;
        return bit;
      });
      layer.replaceChildren(...bits);
      confettiTimer = setTimeout(() => layer.replaceChildren(), 2800);
    };

    trigger.addEventListener('click', ask);
    box.addEventListener('click', (e) => {
      if (e.target.closest('.yes')) answer(true);
      else if (e.target.closest('.no')) answer(false);
    });

    box.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !box.querySelector('.yes')) return;
      trigger.focus({ preventScroll: true });
      leave(0);
    });
  }
}
