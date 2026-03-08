// ============================================================
//  EvlArte — app.js  (v1.1)
// ============================================================

(() => {

  // 1. DOM
  const tipoBtns = document.querySelectorAll('.gm__type-card');
  const campoTema = document.getElementById('param-tema');
  const campoEstilo = document.getElementById('param-estilo');
  const campoCount = document.getElementById('param-count');
  const campoFormato = document.getElementById('param-formato');
  const campoResolucao = document.getElementById('param-resolucao');
  const campoArtista = document.getElementById('param-artista');
  const campoDuracao = document.getElementById('param-duracao');
  const grupoDuracao = document.getElementById('grupo-duracao');

  const txtPrompt = document.getElementById('gm-prompt');
  const btnPromptClear = document.getElementById('gm-prompt-clear');
  const btnGerar = document.getElementById('gm-gerar');

  const resultsGrid = document.getElementById('gm-results');
  const btnOutputClear = document.getElementById('gm-output-clear');

  const historyList = document.getElementById('gm-history-list');
  const btnHistoryClear = document.getElementById('gm-history-clear');

  const netDot = document.getElementById('gm-net-dot');
  const netLabel = document.getElementById('gm-net-label');

  const logBox = document.getElementById('gm-logs');

  // 2. Estado
  let tipoAtual = 'imagem';
  let historico = [];
  const storageKey = CONFIG.storage.chave;

  // 3. Utilitários
  function log(msg) {
    if (!logBox) return;
    const line = document.createElement('div');
    line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logBox.appendChild(line);
    logBox.scrollTop = logBox.scrollHeight;
  }

  function setNetworkStatus(online) {
    netDot.classList.toggle('online', online);
    netDot.classList.toggle('offline', !online);
    netLabel.textContent = online ? 'Online' : 'Offline';
  }

  function carregarHistorico() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) historico = JSON.parse(raw);
    } catch {}
  }

  function guardarHistorico() {
    const max = CONFIG.limites.maxHistorico;
    localStorage.setItem(storageKey, JSON.stringify(historico.slice(-max)));
  }

  function atualizarHistoricoUI() {
    historyList.innerHTML = '';

    if (!historico.length) {
      historyList.innerHTML = `<p class="gm__history-empty">Sem histórico ainda.</p>`;
      return;
    }

    historico.slice().reverse().forEach(item => {
      const li = document.createElement('div');
      li.className = 'gm__history-item';

      li.innerHTML = `
        <div class="gm__history-item-header">
          <span class="gm__history-type gm__history-type--${item.tipo}">
            ${item.tipo.toUpperCase()}
          </span>
          <span class="gm__history-time">${new Date(item.ts).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'})}</span>
        </div>
        <div class="gm__history-prompt">${item.prompt}</div>
      `;

      li.addEventListener('click', () => {
        selecionarTipo(item.tipo);
        txtPrompt.value = item.prompt;
      });

      historyList.appendChild(li);
    });
  }

  function adicionarAoHistorico(tipo, prompt) {
    if (!prompt.trim()) return;
    historico.push({ tipo, prompt, ts: Date.now() });
    guardarHistorico();
    atualizarHistoricoUI();
  }

  function limparResultados() {
    resultsGrid.innerHTML = `
      <div class="gm__results-empty">
        <div class="gm__results-empty-icon">✦</div>
        <p>Os resultados aparecerão aqui</p>
      </div>
    `;
  }

  function mostrarErro(msg) {
    resultsGrid.innerHTML = `<div class="gm__error-msg">${msg}</div>`;
  }

  // 4. UI
  function atualizarPlaceholderPrompt() {
    txtPrompt.placeholder = CONFIG.exemplos[tipoAtual] || 'Descreve o que queres gerar…';
  }

  function atualizarUIporTipo() {
    grupoDuracao.style.display = (tipoAtual === 'musica' || tipoAtual === 'som') ? 'flex' : 'none';
    atualizarPlaceholderPrompt();
  }

  function selecionarTipo(tipo) {
    tipoAtual = tipo;
    tipoBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.type === tipo));
    atualizarUIporTipo();
  }

  // 5. Prompt
  function construirPromptCompleto() {
    const partes = [];
    if (txtPrompt.value.trim()) partes.push(txtPrompt.value.trim());
    if (campoTema.value.trim()) partes.push(`tema: ${campoTema.value.trim()}`);
    if (campoEstilo.value.trim()) partes.push(`estilo: ${campoEstilo.value.trim()}`);
    if (campoArtista.value.trim()) partes.push(`inspirado em ${campoArtista.value.trim()}`);
    return partes.join(', ');
  }

  // 6. Proxy (música, som, vídeo)

  // 🎵 Música via Hugging Face (text-to-audio) + proxy
  async function gerarMusica(prompt, duracao) {
    log('A gerar música via Hugging Face (proxy)…');

    const cfg = CONFIG.apis.musica;
    if (!cfg.endpoint || !cfg.token) {
      throw new Error('Configuração de música incompleta.');
    }

    const urlReal = cfg.endpoint;
    const urlProxy = CONFIG.proxyUrl + encodeURIComponent(urlReal);

    // Hugging Face Inference API espera { "inputs": "texto" }
    const body = {
      inputs: `${prompt} (duração aproximada: ${duracao || 10} segundos)`,
    };

    const resp = await fetch(urlProxy, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cfg.token}`,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      log('Resposta HF não OK: ' + resp.status + ' ' + txt);
      throw new Error('Falha ao gerar música.');
    }

    const blob = await resp.blob();
    return URL.createObjectURL(blob);
  }

  // 🔊 Som (placeholder via proxy — podes adaptar depois)
  async function gerarSom(prompt, duracao) {
    log('A gerar som via proxy…');

    const cfg = CONFIG.apis.som;
    if (!cfg.endpoint) {
      throw new Error('Endpoint de som não configurado.');
    }

    const urlReal = cfg.endpoint;
    const urlProxy = CONFIG.proxyUrl + encodeURIComponent(urlReal);

    const resp = await fetch(urlProxy, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, duration: duracao }),
    });

    if (!resp.ok) throw new Error('Falha ao gerar som.');

    const blob = await resp.blob();
    return URL.createObjectURL(blob);
  }

  // 🎬 Vídeo (placeholder via proxy — podes adaptar depois)
  async function gerarVideo(prompt) {
    log('A gerar vídeo via proxy…');

    const cfg = CONFIG.apis.video;
    if (!cfg.endpoint) {
      throw new Error('Endpoint de vídeo não configurado.');
    }

    const urlReal = cfg.endpoint;
    const urlProxy = CONFIG.proxyUrl + encodeURIComponent(urlReal);

    const resp = await fetch(urlProxy, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (!resp.ok) throw new Error('Falha ao gerar vídeo.');

    const blob = await resp.blob();
    return URL.createObjectURL(blob);
  }

  // 7. Helpers de renderização
  function mostrarLoader(msg) {
    resultsGrid.innerHTML = `
      <div class="gm__coming-soon">
        <span>⏳</span>
        <p>${msg}</p>
      </div>
    `;
  }

  function mostrarAudio(url, prompt) {
    resultsGrid.innerHTML = `
      <div class="gm__result-card">
        <div class="gm__result-audio-wrapper">
          <div class="gm__result-audio-icon">🎵</div>
          <div class="gm__result-audio-prompt">${prompt}</div>
          <audio class="gm__result-audio" controls src="${url}"></audio>
        </div>
      </div>
    `;
  }

  function mostrarVideo(url, prompt) {
    resultsGrid.innerHTML = `
      <div class="gm__result-card">
        <video controls width="100%" src="${url}"></video>
        <div class="gm__result-footer">
          <span class="gm__result-seed">${prompt}</span>
        </div>
      </div>
    `;
  }

  // 8. Pollinations (imagem)
  function construirUrlPollinations(modelo) {
    const { baseUrl, nologo, enhance } = CONFIG.apis.imagem.pollinations;
    const res = CONFIG.resolucoes[campoResolucao.value] || CONFIG.resolucoes['1024x1024'];
    const prompt = encodeURIComponent(construirPromptCompleto() || CONFIG.exemplos.imagem);

    const params = new URLSearchParams();
    params.set('model', modelo);
    params.set('width', res.w);
    params.set('height', res.h);
    if (nologo) params.set('nologo', 'true');
    if (enhance) params.set('enhance', 'true');
    params.set('seed', Math.floor(Math.random() * 1e9));

    return `${baseUrl}${prompt}?${params.toString()}`;
  }

  function criarCardImagem() {
    const card = document.createElement('div');
    card.className = 'gm__result-card';
    card.innerHTML = `
      <div class="gm__result-img-wrapper">
        <div class="gm__result-loader">A gerar imagem…</div>
        <img class="gm__result-img" alt="Resultado">
      </div>
      <div class="gm__result-footer">
        <span class="gm__result-seed"></span>
        <a class="gm__result-dl" href="#" download>download</a>
      </div>
    `;
    return card;
  }

  function carregarImagemComFallback(imgEl, loaderEl, seedEl, dlEl, idx = 0) {
    const modelos = CONFIG.apis.imagem.ordem;
    if (idx >= modelos.length) {
      loaderEl.textContent = 'Falha ao gerar imagem.';
      return;
    }

    const modelo = modelos[idx];
    const url = construirUrlPollinations(modelo);

    loaderEl.textContent = `A gerar com modelo: ${modelo}…`;
    seedEl.textContent = `modelo: ${modelo}`;

    imgEl.onload = () => {
      imgEl.style.opacity = '1';
      loaderEl.remove();
      dlEl.href = url;
    };

    imgEl.onerror = () => carregarImagemComFallback(imgEl, loaderEl, seedEl, dlEl, idx + 1);

    imgEl.src = url;
  }

  // 9. gerar()
  async function gerar() {
    if (!navigator.onLine) {
      mostrarErro('Sem ligação à internet.');
      return;
    }

    const promptFinal = construirPromptCompleto();

    if (!promptFinal.trim()) {
      mostrarErro('Escreve algo no prompt ou no tema.');
      return;
    }

    // Música
    if (tipoAtual === 'musica') {
      mostrarLoader(CONFIG.apis.musica.mensagem);
      try {
        const url = await gerarMusica(promptFinal, parseInt(campoDuracao.value));
        mostrarAudio(url, promptFinal);
        adicionarAoHistorico('musica', promptFinal);
      } catch (e) {
        log('Erro música: ' + e.message);
        mostrarErro('Erro ao gerar música.');
      }
      return;
    }

    // Som
    if (tipoAtual === 'som') {
      mostrarLoader(CONFIG.apis.som.mensagem);
      try {
        const url = await gerarSom(promptFinal, parseInt(campoDuracao.value));
        mostrarAudio(url, promptFinal);
        adicionarAoHistorico('som', promptFinal);
      } catch (e) {
        log('Erro som: ' + e.message);
        mostrarErro('Erro ao gerar som.');
      }
      return;
    }

    // Vídeo
    if (tipoAtual === 'video') {
      mostrarLoader(CONFIG.apis.video.mensagem);
      try {
        const url = await gerarVideo(promptFinal);
        mostrarVideo(url, promptFinal);
        adicionarAoHistorico('video', promptFinal);
      } catch (e) {
        log('Erro vídeo: ' + e.message);
        mostrarErro('Erro ao gerar vídeo.');
      }
      return;
    }

    // Imagem
    const count = Math.min(Math.max(parseInt(campoCount.value || '1'), 1), CONFIG.limites.maxResultados);

    btnGerar.disabled = true;
    btnGerar.classList.add('loading');
    btnGerar.textContent = 'A gerar…';

    resultsGrid.innerHTML = '';

    for (let i = 0; i < count; i++) {
      const card = criarCardImagem();
      resultsGrid.appendChild(card);

      const imgEl = card.querySelector('.gm__result-img');
      const loaderEl = card.querySelector('.gm__result-loader');
      const seedEl = card.querySelector('.gm__result-seed');
      const dlEl = card.querySelector('.gm__result-dl');

      carregarImagemComFallback(imgEl, loaderEl, seedEl, dlEl);
    }

    adicionarAoHistorico('imagem', promptFinal);

    setTimeout(() => {
      btnGerar.disabled = false;
      btnGerar.classList.remove('loading');
      btnGerar.textContent = '⚡ Gerar';
    }, CONFIG.limites.timeoutImg);
  }

  // 10. Eventos
  tipoBtns.forEach(btn => btn.addEventListener('click', () => selecionarTipo(btn.dataset.type)));
  btnPromptClear.addEventListener('click', () => (txtPrompt.value = ''));
  btnGerar.addEventListener('click', gerar);
  btnOutputClear.addEventListener('click', limparResultados);
  btnHistoryClear.addEventListener('click', () => {
    historico = [];
    guardarHistorico();
    atualizarHistoricoUI();
  });

  window.addEventListener('online', () => setNetworkStatus(true));
  window.addEventListener('offline', () => setNetworkStatus(false));

  // 11. Init
  function init() {
    setNetworkStatus(navigator.onLine);
    carregarHistorico();
    atualizarHistoricoUI();
    selecionarTipo('imagem');
    limparResultados();
    log('EvlArte iniciado.');
  }

  init();

})();
