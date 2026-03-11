(function () {
  const MIN = 1;
  const MAX = 45;
  const COUNT = 6;

  // Supabase 설정: Vercel 빌드 시 build.js가 생성한 config.js에서 주입
  const _cfg = (typeof window.__SUPABASE_CONFIG__ !== 'undefined') ? window.__SUPABASE_CONFIG__ : {};
  const SUPABASE_URL = _cfg.url || '';
  const SUPABASE_ANON_KEY = _cfg.key || '';
  let supabaseClient = null;
  if (typeof window.supabase !== 'undefined' && SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  const setCountEl = document.getElementById('setCount');
  const btnGenerate = document.getElementById('btnGenerate');
  const resultsEl = document.getElementById('results');
  const placeholderEl = document.getElementById('placeholder');
  const machineWindowEl = document.getElementById('machineWindow');
  const machineBallsEl = document.getElementById('machineBalls');
  const machineStatusEl = document.getElementById('machineStatus');
  let isSpinning = false;
  let machineSpinInterval = null;

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function initMachineBalls() {
    if (!machineBallsEl) return;
    machineBallsEl.innerHTML = '';

    const ballCount = 16;
    for (let i = 0; i < ballCount; i++) {
      const wrap = document.createElement('div');
      wrap.className = 'machine-ball-wrap';

      const el = document.createElement('div');
      el.className = 'machine-ball ' + (i % 5 === 0 ? 'is-white' : 'is-blue');
      el.textContent = String(randInt(MIN, MAX));

      const phase = randInt(0, 359);
      const radius = randInt(74, 138);
      const lift = randInt(-16, 16);

      wrap.style.setProperty('--phase', phase + 'deg');
      wrap.style.setProperty('--spin', randInt(650, 1400) + 'ms');
      el.style.setProperty('--radius', radius + 'px');
      el.style.setProperty('--lift', lift + 'px');
      el.style.setProperty('--bob', randInt(180, 420) + 'ms');

      wrap.appendChild(el);
      machineBallsEl.appendChild(wrap);
    }
  }

  function startMachineSpin() {
    if (!machineWindowEl || !machineBallsEl) return;
    machineWindowEl.classList.add('is-spinning');
    if (machineStatusEl) machineStatusEl.textContent = '추첨 중…';

    if (machineSpinInterval) clearInterval(machineSpinInterval);
    machineSpinInterval = setInterval(function () {
      const balls = machineBallsEl.querySelectorAll('.machine-ball');
      for (let i = 0; i < balls.length; i++) {
        if (Math.random() < 0.55) {
          balls[i].textContent = String(randInt(MIN, MAX));
        }
      }
    }, 120);
  }

  function stopMachineSpin() {
    if (!machineWindowEl) return;
    machineWindowEl.classList.remove('is-spinning');
    if (machineStatusEl) machineStatusEl.textContent = '완료';
    if (machineSpinInterval) {
      clearInterval(machineSpinInterval);
      machineSpinInterval = null;
    }
  }

  function pickSet() {
    const pool = [];
    for (let i = MIN; i <= MAX; i++) pool.push(i);
    const main = [];
    for (let i = 0; i < COUNT; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      main.push(pool.splice(idx, 1)[0]);
    }
    main.sort((a, b) => a - b);
    const bonusIdx = Math.floor(Math.random() * pool.length);
    const bonus = pool[bonusIdx];
    return { main: main, bonus: bonus };
  }

  async function saveLottoResult(numbers, bonus) {
    if (!supabaseClient) return;
    try {
      const { error } = await supabaseClient
        .from('lotto_results')
        .insert({ numbers: numbers, bonus: bonus });
      if (error) console.error('Supabase 저장 실패:', error);
    } catch (e) {
      console.error('Supabase 저장 오류:', e);
    }
  }

  function renderFinal() {
    const n = parseInt(setCountEl.value, 10);
    const sets = [];
    for (let i = 0; i < n; i++) sets.push(pickSet());

    sets.forEach(function (setData) {
      saveLottoResult(setData.main, setData.bonus);
    });

    const fragment = document.createDocumentFragment();
    sets.forEach(function (setData, index) {
      const setEl = document.createElement('div');
      setEl.className = 'lotto-set';
      const label = document.createElement('span');
      label.className = 'set-label';
      label.textContent = (index + 1) + '번';
      setEl.appendChild(label);
      setData.main.forEach(function (num) {
        const ball = document.createElement('span');
        ball.className = 'ball';
        ball.textContent = num;
        setEl.appendChild(ball);
      });
      const bonusLabel = document.createElement('span');
      bonusLabel.className = 'bonus-label';
      bonusLabel.textContent = '보너스';
      setEl.appendChild(bonusLabel);
      const bonusBall = document.createElement('span');
      bonusBall.className = 'ball ball-bonus';
      bonusBall.textContent = setData.bonus;
      setEl.appendChild(bonusBall);
      fragment.appendChild(setEl);
    });

    resultsEl.innerHTML = '';
    resultsEl.appendChild(placeholderEl);
    resultsEl.appendChild(fragment);
    placeholderEl.style.display = 'none';
  }

  function createSpinnerRow(index, countPerRow) {
    const row = document.createElement('div');
    row.className = 'lotto-set spinner-row';
    const label = document.createElement('span');
    label.className = 'set-label';
    label.textContent = (index + 1) + '번';
    row.appendChild(label);

    for (let i = 0; i < countPerRow; i++) {
      const ball = document.createElement('span');
      ball.className = 'ball spinner-ball';
      ball.textContent = '--';
      row.appendChild(ball);
    }

    return row;
  }

  function startSpinAnimation() {
    if (isSpinning) return;
    isSpinning = true;
    btnGenerate.disabled = true;
    btnGenerate.classList.add('btn-disabled');
    startMachineSpin();

    const n = parseInt(setCountEl.value, 10);
    const countPerRow = COUNT + 1; // 6개 + 보너스 1개

    placeholderEl.style.display = 'none';
    resultsEl.innerHTML = '';
    resultsEl.appendChild(placeholderEl);

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < n; i++) {
      fragment.appendChild(createSpinnerRow(i, countPerRow));
    }
    resultsEl.appendChild(fragment);
    placeholderEl.style.display = 'none';

    const balls = Array.prototype.slice.call(
      resultsEl.querySelectorAll('.spinner-ball')
    );

    const spinInterval = setInterval(function () {
      balls.forEach(function (ball) {
        const random = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
        ball.textContent = random;
      });
    }, 60);

    setTimeout(function () {
      clearInterval(spinInterval);
      renderFinal();
      stopMachineSpin();
      isSpinning = false;
      btnGenerate.disabled = false;
      btnGenerate.classList.remove('btn-disabled');
    }, 1500);
  }

  initMachineBalls();
  if (machineStatusEl) machineStatusEl.textContent = '대기 중';

  btnGenerate.addEventListener('click', startSpinAnimation);
})();
