// ============================================================
//  EvlArte — app.js  (v1.3)
//  CORREÇÕES v1.3:
//  - Histórico guarda prompt RAW (sem tema/estilo) — evita duplicação
//  - Histórico ao clicar repõe campos individuais (tema, estilo, artista)
//  - Aspect-ratio do card de imagem ajusta-se à resolução escolhida
// ============================================================

(() => {

  // ─────────────────────────────────────────────
  // 1. DOM
  // ─────────────────────────────────────────────
  const tipoBtns       = document.querySelectorAll('.gm__type-card');
  const campoTema      = document.getElementById('param-tema');
  const campoEstilo    = document.getElementById('param-estilo');
  const campoCount     = document.getElementById('param-count');
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
  const logBox         = document.getElementById('gm-logs');

  // ─────────────────────────────────────────────
  // 2. Estado
  // ─────────────────────────────────────────────
  let tipoAtual = 'imagem';
  let historico = [];
  const storageKey = CONFIG.storage.chave;

  // ─────────────────────────────────────────────
  // 3. Logs (ocultar/mostrar com tecla `)
  // ─────────────────────────────────────────────
  function log(msg) {
    if (!logBox) return;
    const line = document.createElement('div');
    line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logBox.appendChild(line);
    logBox.scrollTop = logBox.scrollHeight;
  }

  // Botão toggle de logs
  const btnLog = document.getElementById('gm-log-toggle');
  if (btnLog) {
    btnLog.addEventListener('click', () => {
      const visible = logBox.style.display !== 'none';
      logBox.style.display = visible ? 'none' : 'block';
      btnLog.textContent = visible ? '🐛 logs' : '✕ logs';
    });
  }

  // ─────────────────────────────────────────────
  // 4. Rede
  // ─────────────────────────────────────────────
  function setNetworkStatus(online) {
    netDot.classList.toggle('online', online);
    netDot.classList.toggle('offline', !online);
    netLabel.textContent = online ? 'Online' : 'Offline';
  }

  // ─────────────────────────────────────────────
  // 5. Histórico
  // ─────────────────────────────────────────────
  function carregarHistorico() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) historico = JSON.parse(raw);
    } catch { historico = []; }
  }

  function guardarHistorico() {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify(historico.slice(-CONFIG.limites.maxHistorico))
      );
    } catch (e) {
      log('Erro ao guardar histórico: ' + e.message);
    }
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

      // Miniatura se existir
      const thumb = item.thumb
        ? `<img src="${item.thumb}" style="width:36px;height:36px;object-fit:cover;border-radius:4px;flex-shrink:0;">`
        : '';

      li.innerHTML = `
        <div class="gm__history-item-header">
          <span class="gm__history-type gm__history-type--${item.tipo}">
            ${item.tipo.toUpperCase()}
          </span>
          <span class="gm__history-time">
            ${new Date(item.ts).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'})}
          </span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
          ${thumb}
          <div class="gm__history-prompt">${item.prompt}</div>
        </div>
      `;

      li.addEventListener('click', () => {
        selecionarTipo(item.tipo);
        txtPrompt.value        = item.prompt  || '';
        campoTema.value        = item.tema    || '';
        campoEstilo.value      = item.estilo  || '';
        campoArtista.value     = item.artista || '';
      });

      historyList.appendChild(li);
    });
  }

  // Guarda prompt RAW + campos individuais — evita duplicação ao reutilizar
  function adicionarAoHistorico(tipo, prompt, thumb = null) {
    if (!prompt.trim()) return;
    historico.push({
      tipo,
      prompt,                          // texto puro do textarea
      tema:    campoTema.value.trim(),
      estilo:  campoEstilo.value.trim(),
      artista: campoArtista.value.trim(),
      ts:      Date.now(),
      thumb,
    });
    guardarHistorico();
    atualizarHistoricoUI();
  }

  // ─────────────────────────────────────────────
  // 6. Resultados — estados UI
  // ─────────────────────────────────────────────
  function limparResultados() {
    resultsGrid.innerHTML = `
      <div class="gm__results-empty">
        <div class="gm__results-empty-icon">✦</div>
        <p>Os resultados aparecerão aqui</p>
      </div>`;
  }

  function mostrarErro(msg) {
    resultsGrid.innerHTML = `<div class="gm__error-msg">⚠️ ${msg}</div>`;
  }

  function mostrarLoader(msg) {
    resultsGrid.innerHTML = `
      <div class="gm__coming-soon">
        <span>⏳</span>
        <p>${msg}</p>
      </div>`;
  }

  function mostrarAudio(url, prompt, tipo = 'musica') {
    const icone = tipo === 'musica' ? '🎵' : '🔊';
    resultsGrid.innerHTML = `
      <div class="gm__result-card">
        <div class="gm__result-audio-wrapper">
          <div class="gm__result-audio-icon">${icone}</div>
          <div class="gm__result-audio-prompt">${prompt}</div>
          <audio class="gm__result-audio" controls src="${url}"></audio>
        </div>
        <div class="gm__result-footer">
          <span class="gm__result-seed">${tipo}</span>
          <a class="gm__result-dl" href="${url}" download="evlarte_audio.wav">download</a>
        </div>
      </div>`;
  }

  function mostrarComingSoon(tipo) {
    const info = {
      som:   { icone: '🔊', msg: 'Geração de som em breve — endpoint por configurar.' },
      video: { icone: '🎬', msg: 'Geração de vídeo em breve — endpoint por configurar.' },
    };
    const { icone, msg } = info[tipo] || { icone: '⚙️', msg: 'Funcionalidade em desenvolvimento.' };
    resultsGrid.innerHTML = `
      <div class="gm__coming-soon">
        <span>${icone}</span>
        <p>${msg}</p>
      </div>`;
  }

  // ─────────────────────────────────────────────
  // 6b. Aspect-ratio dinâmico dos cards
  // ─────────────────────────────────────────────
  function atualizarRatioCards() {
    const res = CONFIG.resolucoes[campoResolucao.value] || CONFIG.resolucoes['1024x1024'];
    const ratio = res.w / res.h;
    // Aplica a variável CSS à grid — todos os cards herdam
    resultsGrid.style.setProperty('--card-ratio', ratio);
  }

  // ─────────────────────────────────────────────
  // 7. UI — tipo e placeholder
  // ─────────────────────────────────────────────
  function atualizarPlaceholderPrompt() {
    txtPrompt.placeholder = CONFIG.exemplos[tipoAtual] || 'Descreve o que queres gerar…';
  }

  function atualizarUIporTipo() {
    const eImagem  = tipoAtual === 'imagem';
    const comDuracao = tipoAtual === 'musica' || tipoAtual === 'som';

    // Duração: só para música e som
    grupoDuracao.style.display = comDuracao ? 'flex' : 'none';

    // Formato e Resolução: só fazem sentido para imagem
    const grupoFormato    = document.getElementById('grupo-formato');
    const grupoResolucao  = document.getElementById('grupo-resolucao');
    const grupoCount      = document.getElementById('grupo-count');

    if (grupoFormato)   grupoFormato.style.display   = eImagem ? 'flex' : 'none';
    if (grupoResolucao) grupoResolucao.style.display  = eImagem ? 'flex' : 'none';
    if (grupoCount)     grupoCount.style.display      = eImagem ? 'flex' : 'none';

    atualizarPlaceholderPrompt();
  }

  function selecionarTipo(tipo) {
    tipoAtual = tipo;
    tipoBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.type === tipo));
    atualizarUIporTipo();
  }

  // ─────────────────────────────────────────────
  // 8. Construir prompt final
  // ─────────────────────────────────────────────
  function construirPromptCompleto() {
    const partes = [];
    if (txtPrompt.value.trim())    partes.push(txtPrompt.value.trim());
    if (campoTema.value.trim())    partes.push(`tema: ${campoTema.value.trim()}`);
    if (campoEstilo.value.trim())  partes.push(`estilo: ${campoEstilo.value.trim()}`);
    if (campoArtista.value.trim()) partes.push(`inspirado em ${campoArtista.value.trim()}`);
    return partes.join(', ');
  }

  // ─────────────────────────────────────────────
  // 9. APIs — Música (Hugging Face via proxy)
  // ─────────────────────────────────────────────
  async function gerarMusica(prompt, duracao) {
    log('A gerar música via Hugging Face (proxy)…');

    const cfg = CONFIG.apis.musica;
    if (!cfg.endpoint || !cfg.token || cfg.token === 'SEU_TOKEN_HF') {
      throw new Error('Token do Hugging Face não configurado em config.js.');
    }

    const urlProxy = CONFIG.proxyUrl + encodeURIComponent(cfg.endpoint);

    const resp = await fetch(urlProxy, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: `${prompt} (duration: ${duracao || 10} seconds)`,
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      log(`HF erro ${resp.status}: ${txt}`);
      throw new Error(`Hugging Face respondeu com erro ${resp.status}.`);
    }

    const blob = await resp.blob();
    log('Música gerada com sucesso.');
    return URL.createObjectURL(blob);
  }

  // ─────────────────────────────────────────────
  // 10. APIs — Som (placeholder)
  // ─────────────────────────────────────────────
  async function gerarSom(prompt, duracao) {
    log('Som: endpoint não configurado.');
    const cfg = CONFIG.apis.som;
    if (!cfg.endpoint) throw new Error('Endpoint de som não configurado.');

    const urlProxy = CONFIG.proxyUrl + encodeURIComponent(cfg.endpoint);
    const resp = await fetch(urlProxy, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, duration: duracao }),
    });
    if (!resp.ok) throw new Error('Falha ao gerar som.');
    return URL.createObjectURL(await resp.blob());
  }

  // ─────────────────────────────────────────────
  // 11. APIs — Imagem (Pollinations)
  // ─────────────────────────────────────────────
  function construirUrlPollinations(modelo) {
    const { baseUrl, nologo, enhance } = CONFIG.apis.imagem.pollinations;
    const res    = CONFIG.resolucoes[campoResolucao.value] || CONFIG.resolucoes['1024x1024'];
    const prompt = encodeURIComponent(construirPromptCompleto() || CONFIG.exemplos.imagem);
    const seed   = Math.floor(Math.random() * 1e9);

    const params = new URLSearchParams({
      model: modelo,
      width: res.w,
      height: res.h,
      seed,
    });
    if (nologo)  params.set('nologo', 'true');
    if (enhance) params.set('enhance', 'true');

    return `${baseUrl}${prompt}?${params.toString()}`;
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
        <a class="gm__result-dl" href="#" download="evlarte.png">download</a>
      </div>`;
    return card;
  }

  // Converte URL de imagem → blob → URL local (resolve CORS no download)
  async function urlParaBlob(url) {
    const resp = await fetch(url);
    const blob = await resp.blob();
    return URL.createObjectURL(blob);
  }

  // Cria miniatura 36×36 em base64 para o histórico
  function criarThumb(imgEl) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 36; canvas.height = 36;
      canvas.getContext('2d').drawImage(imgEl, 0, 0, 36, 36);
      return canvas.toDataURL('image/jpeg', 0.6);
    } catch { return null; }
  }

  function carregarImagemComFallback(imgEl, loaderEl, seedEl, dlEl, promptFinal, idx = 0) {
    const modelos = CONFIG.apis.imagem.ordem;

    if (idx >= modelos.length) {
      loaderEl.textContent = '❌ Falha ao gerar — tenta novamente.';
      reporBotaoGerar(); // CORREÇÃO: repõe imediatamente após falha
      return;
    }

    const modelo = modelos[idx];
    const url    = construirUrlPollinations(modelo);

    loaderEl.textContent = `modelo: ${modelo}…`;
    seedEl.textContent   = `modelo: ${modelo}`;

    imgEl.onload = async () => {
      imgEl.style.opacity = '1';
      loaderEl.remove();

      // Download via blob local (sem erros CORS)
      try {
        const blobUrl = await urlParaBlob(url);
        dlEl.href = blobUrl;
      } catch {
        dlEl.href = url; // fallback para URL direta
      }

      // Miniatura para o histórico (só na primeira imagem)
      if (idx === 0 || !historico[historico.length - 1]?.thumb) {
        const thumb = criarThumb(imgEl);
        if (thumb && historico.length > 0) {
          historico[historico.length - 1].thumb = thumb;
          guardarHistorico();
          atualizarHistoricoUI();
        }
      }
    };

    imgEl.onerror = () => {
      log(`Modelo "${modelo}" falhou — a tentar próximo…`);
      carregarImagemComFallback(imgEl, loaderEl, seedEl, dlEl, promptFinal, idx + 1);
    };

    imgEl.src = url;
  }

  // ─────────────────────────────────────────────
  // 12. Botão Gerar — estado
  // ─────────────────────────────────────────────
  function bloquearBotaoGerar() {
    btnGerar.disabled = true;
    btnGerar.classList.add('loading');
    btnGerar.innerHTML = `<span class="gm__spinner"></span> A gerar…`;
  }

  function reporBotaoGerar() {
    btnGerar.disabled = false;
    btnGerar.classList.remove('loading');
    btnGerar.textContent = '⚡ Gerar';
  }

  // ─────────────────────────────────────────────
  // 13. Função principal: gerar()
  // ─────────────────────────────────────────────
  async function gerar() {
    if (!navigator.onLine) {
      mostrarErro('Sem ligação à internet. Verifica a tua rede.');
      return;
    }

    const promptFinal = construirPromptCompleto();
    if (!promptFinal.trim()) {
      mostrarErro('Escreve algo no prompt ou preenche o campo Tema.');
      return;
    }

    // ── MÚSICA ──────────────────────────────────
    if (tipoAtual === 'musica') {
      bloquearBotaoGerar();
      mostrarLoader(CONFIG.apis.musica.mensagem);
      try {
        const duracao = parseInt(campoDuracao.value) || 10;
        const url = await gerarMusica(promptFinal, duracao);
        mostrarAudio(url, promptFinal, 'musica');
        adicionarAoHistorico('musica', promptFinal);
      } catch (e) {
        log('Erro música: ' + e.message);
        mostrarErro(e.message);
      } finally {
        reporBotaoGerar();
      }
      return;
    }

    // ── SOM ─────────────────────────────────────
    if (tipoAtual === 'som') {
      if (!CONFIG.apis.som.endpoint) {
        mostrarComingSoon('som');
        return;
      }
      bloquearBotaoGerar();
      mostrarLoader(CONFIG.apis.som.mensagem);
      try {
        const duracao = parseInt(campoDuracao.value) || 10;
        const url = await gerarSom(promptFinal, duracao);
        mostrarAudio(url, promptFinal, 'som');
        adicionarAoHistorico('som', promptFinal);
      } catch (e) {
        log('Erro som: ' + e.message);
        mostrarErro(e.message);
      } finally {
        reporBotaoGerar();
      }
      return;
    }

    // ── VÍDEO ────────────────────────────────────
    if (tipoAtual === 'video') {
      mostrarComingSoon('video');
      return;
    }

    // ── IMAGEM ───────────────────────────────────
    const rawCount = parseInt(campoCount.value);
    const count = isNaN(rawCount)
      ? 1
      : Math.min(Math.max(rawCount, 1), CONFIG.limites.maxResultados);

    bloquearBotaoGerar();
    resultsGrid.innerHTML = '';

    adicionarAoHistorico('imagem', promptFinal); // regista antes de carregar

    for (let i = 0; i < count; i++) {
      const card    = criarCardImagem();
      resultsGrid.appendChild(card);

      const imgEl   = card.querySelector('.gm__result-img');
      const loaderEl= card.querySelector('.gm__result-loader');
      const seedEl  = card.querySelector('.gm__result-seed');
      const dlEl    = card.querySelector('.gm__result-dl');

      carregarImagemComFallback(imgEl, loaderEl, seedEl, dlEl, promptFinal);
    }

    // Repõe o botão após o timeout configurado
    setTimeout(reporBotaoGerar, CONFIG.limites.timeoutImg);
  }

  // ─────────────────────────────────────────────
  // 14. Eventos
  // ─────────────────────────────────────────────
  tipoBtns.forEach(btn =>
    btn.addEventListener('click', () => selecionarTipo(btn.dataset.type))
  );

  btnPromptClear.addEventListener('click', () => (txtPrompt.value = ''));
  btnGerar.addEventListener('click', gerar);
  btnOutputClear.addEventListener('click', limparResultados);

  btnHistoryClear.addEventListener('click', () => {
    if (!confirm('Tens a certeza que queres limpar o histórico?')) return;
    historico = [];
    guardarHistorico();
    atualizarHistoricoUI();
  });

  window.addEventListener('online',  () => setNetworkStatus(true));
  window.addEventListener('offline', () => setNetworkStatus(false));

  // Actualiza o ratio dos cards quando muda a resolução
  campoResolucao.addEventListener('change', atualizarRatioCards);

  // Permite submeter com Ctrl+Enter no textarea
  txtPrompt.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'Enter') gerar();
  });

  // ─────────────────────────────────────────────
  // 15. Validação de configuração
  // ─────────────────────────────────────────────
  function validarConfig() {
    const avisos = [];
    if (!CONFIG.proxyUrl || CONFIG.proxyUrl.includes('TEU_WORKER_URL')) {
      avisos.push('proxyUrl não configurado em config.js');
    }
    if (!CONFIG.apis.musica.token || CONFIG.apis.musica.token === 'SEU_TOKEN_HF') {
      avisos.push('Token Hugging Face não configurado em config.js');
    }
    avisos.forEach(a => log('⚠️ CONFIG: ' + a));
    return avisos.length === 0;
  }

  // ─────────────────────────────────────────────
  // 16. Init
  // ─────────────────────────────────────────────
  function init() {
    logBox.style.display = 'none'; // logs ocultos por defeito (tecla ` para ver)
    setNetworkStatus(navigator.onLine);
    carregarHistorico();
    atualizarHistoricoUI();
    selecionarTipo('imagem');
    limparResultados();
    atualizarRatioCards();
    validarConfig();
    log('EvlArte v1.3 iniciado. Prima ` para ver/ocultar logs.');
  }

  init();

})();
