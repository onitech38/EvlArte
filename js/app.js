// EvlArte — app.js (v0.1.3)
// Lado cliente apenas. Usa Pollinations via URL de imagem (sem fetch).

(() => {
  // ---------- Referências ao DOM ----------
  const tipoBtns       = document.querySelectorAll('.gm__type-card');
  const campoTema      = document.getElementById('param-tema');
  const campoEstilo    = document.getElementById('param-estilo');
  const campoCount     = document.getElementById('param-count');
  const campoFormato   = document.getElementById('param-formato');
  const campoResolucao = document.getElementById('param-resolucao');
  const campoArtista   = document.getElementById('param-artista');
  const campoDuracao   = document.getElementById('param-duracao');
  const grupoDuracao   = document.getElementById('grupo-duracao');

  const txtPrompt      = document.getElementById('gm-prompt');
  const btnPromptClear = document.getElementById('gm-prompt-clear');
  const btnGerar       = document.getElementById('gm-gerar');

  const resultsGrid    = document.getElementById('gm-results');
  const btnOutputClear = document.getElementById('gm-output-clear');

  const historyList    = document.getElementById('gm-history-list');
  const btnHistoryClear= document.getElementById('gm-history-clear');

  const netDot         = document.getElementById('gm-net-dot');
  const netLabel       = document.getElementById('gm-net-label');

  // ---------- Estado ----------
  let tipoAtual   = 'imagem';
  let historico   = [];
  const storageKey = CONFIG.storage.chave;

  // ---------- Utilitários ----------
  function setNetworkStatus(online) {
    if (!netDot || !netLabel) return;
    netDot.classList.toggle('online', online);
    netDot.classList.toggle('offline', !online);
    netLabel.textContent = online ? 'Online' : 'Offline';
  }

  function carregarHistorico() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Array.isArray(data)) historico = data;
    } catch (e) {
      console.warn('Erro ao ler histórico:', e);
    }
  }

  function guardarHistorico() {
    try {
      const max = CONFIG.limites.maxHistorico;
      const trimmed = historico.slice(-max);
      localStorage.setItem(storageKey, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('Erro ao guardar histórico:', e);
    }
  }

  function formatarData(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  }

  function atualizarHistoricoUI() {
    historyList.innerHTML = '';

    if (!historico.length) {
      const p = document.createElement('p');
      p.className = 'gm__history-empty';
      p.textContent = 'Sem histórico ainda.';
      historyList.appendChild(p);
      return;
    }

    historico
      .slice()
      .reverse()
      .forEach(item => {
        const li = document.createElement('div');
        li.className = 'gm__history-item';

        li.innerHTML = `
          <div class="gm__history-item-header">
            <span class="gm__history-type gm__history-type--${item.tipo}">
              ${item.tipo.toUpperCase()}
            </span>
            <span class="gm__history-time">${formatarData(item.ts)}</span>
          </div>
          <div class="gm__history-prompt">${item.prompt}</div>
        `;

        li.addEventListener('click', () => {
          // Restaurar tipo e prompt
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
    resultsGrid.innerHTML = `
      <div class="gm__error-msg">${msg}</div>
    `;
  }

  function atualizarPlaceholderPrompt() {
    const exemplo = CONFIG.exemplos[tipoAtual] || '';
    txtPrompt.placeholder = exemplo || 'Descreve o que queres gerar…';
  }

  function atualizarUIporTipo() {
    // Mostrar/ocultar duração para música/som
    if (tipoAtual === 'musica' || tipoAtual === 'som') {
      grupoDuracao.style.display = 'flex';
    } else {
      grupoDuracao.style.display = 'none';
    }

    atualizarPlaceholderPrompt();
  }

  function selecionarTipo(tipo) {
    tipoAtual = tipo;

    tipoBtns.forEach(btn => {
      const t = btn.getAttribute('data-type');
      btn.classList.toggle('active', t === tipo);
    });

    atualizarUIporTipo();
  }

  // ---------- Pollinations: construção de URL ----------
  function construirPromptCompleto() {
    const partes = [];

    const tema   = campoTema.value.trim();
    const estilo = campoEstilo.value.trim();
    const artista= campoArtista.value.trim();
    const basePrompt = txtPrompt.value.trim();

    if (basePrompt) partes.push(basePrompt);
    if (tema)       partes.push(`tema: ${tema}`);
    if (estilo)     partes.push(`estilo: ${estilo}`);
    if (artista)    partes.push(`inspirado em ${artista}`);

    return partes.join(', ');
  }

  function construirUrlPollinations(modelo) {
    const { baseUrl, nologo, enhance } = CONFIG.apis.imagem.pollinations;
    const resKey = campoResolucao.value || '1024x1024';
    const res    = CONFIG.resolucoes[resKey] || CONFIG.resolucoes['1024x1024'];

    const promptCompleto = construirPromptCompleto() || CONFIG.exemplos.imagem;
    const encodedPrompt  = encodeURIComponent(promptCompleto);

    const params = new URLSearchParams();
    params.set('model', modelo);
    params.set('width',  res.w);
    params.set('height', res.h);
    if (nologo)  params.set('nologo', 'true');
    if (enhance) params.set('enhance', 'true');
    params.set('seed', Math.floor(Math.random() * 1e9));

    return `${baseUrl}${encodedPrompt}?${params.toString()}`;
  }

  function criarCardImagem() {
    const card = document.createElement('div');
    card.className = 'gm__result-card';

    card.innerHTML = `
      <div class="gm__result-img-wrapper">
        <div class="gm__result-loader">A gerar imagem…</div>
        <img class="gm__result-img" alt="Resultado gerado">
      </div>
      <div class="gm__result-footer">
        <span class="gm__result-seed"></span>
        <a class="gm__result-dl" href="#" download>download</a>
      </div>
    `;

    return card;
  }

  function carregarImagemComFallback(imgEl, loaderEl, seedEl, dlEl, modeloIndex = 0) {
    const modelos = CONFIG.apis.imagem.ordem;
    if (modeloIndex >= modelos.length) {
      loaderEl.textContent = 'Falha ao gerar imagem (todos os modelos falharam).';
      return;
    }

    const modelo = modelos[modeloIndex];
    const url    = construirUrlPollinations(modelo);

    loaderEl.textContent = `A gerar com modelo: ${modelo}…`;
    seedEl.textContent   = `modelo: ${modelo}`;

    imgEl.onload = () => {
      imgEl.style.opacity = '1';
      loaderEl.remove();
      dlEl.href = url;
    };

    imgEl.onerror = () => {
      // tentar próximo modelo
      carregarImagemComFallback(imgEl, loaderEl, seedEl, dlEl, modeloIndex + 1);
    };

    imgEl.src = url;
  }

  // ---------- Geração ----------
  function gerar() {
    if (!navigator.onLine) {
      mostrarErro('Sem ligação à internet. Verifica a tua conexão.');
      return;
    }

    if (tipoAtual !== 'imagem') {
      const apiCfg = CONFIG.apis[tipoAtual];
      const msg = apiCfg && apiCfg.mensagem
        ? apiCfg.mensagem
        : 'Este tipo de conteúdo ainda não está disponível.';
      mostrarErro(msg);
      adicionarAoHistorico(tipoAtual, txtPrompt.value.trim());
      return;
    }

    const count = Math.min(
      Math.max(parseInt(campoCount.value || '1', 10), 1),
      CONFIG.limites.maxResultados
    );

    const promptFinal = construirPromptCompleto();
    if (!promptFinal.trim()) {
      mostrarErro('Por favor, descreve o que queres gerar no prompt ou no tema.');
      return;
    }

    // Preparar UI
    btnGerar.disabled = true;
    btnGerar.classList.add('loading');
    btnGerar.textContent = 'A gerar…';

    resultsGrid.innerHTML = '';

    for (let i = 0; i < count; i++) {
      const card = criarCardImagem();
      resultsGrid.appendChild(card);

      const imgEl    = card.querySelector('.gm__result-img');
      const loaderEl = card.querySelector('.gm__result-loader');
      const seedEl   = card.querySelector('.gm__result-seed');
      const dlEl     = card.querySelector('.gm__result-dl');

      carregarImagemComFallback(imgEl, loaderEl, seedEl, dlEl, 0);
    }

    adicionarAoHistorico('imagem', promptFinal);

    // Timeout de segurança para reativar botão
    setTimeout(() => {
      btnGerar.disabled = false;
      btnGerar.classList.remove('loading');
      btnGerar.textContent = '⚡ Gerar';
    }, CONFIG.limites.timeoutImg);
  }

  // ---------- Eventos ----------
  tipoBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tipo = btn.getAttribute('data-type');
      selecionarTipo(tipo);
    });
  });

  btnPromptClear.addEventListener('click', () => {
    txtPrompt.value = '';
  });

  btnGerar.addEventListener('click', gerar);

  btnOutputClear.addEventListener('click', () => {
    limparResultados();
  });

  btnHistoryClear.addEventListener('click', () => {
    historico = [];
    guardarHistorico();
    atualizarHistoricoUI();
  });

  window.addEventListener('online',  () => setNetworkStatus(true));
  window.addEventListener('offline', () => setNetworkStatus(false));

  // ---------- Init ----------
  function init() {
    setNetworkStatus(navigator.onLine);
    carregarHistorico();
    atualizarHistoricoUI();
    selecionarTipo('imagem');
    limparResultados();
  }

  init();
})();
