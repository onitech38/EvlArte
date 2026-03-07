/**
 * ============================================================
 *  EvlArte — app.js  (v0.1.2)
 *  Módulos: Estado | PromptBuilder | API | UI | App
 *  Depende de: config.js (carregado antes no HTML)
 *
 *  NOVO: fallback automático de provedores de imagem
 *  pollinations → huggingface → lexica
 * ============================================================
 */
'use strict';

/* ═══════════════════════════════════════
   1. ESTADO
═══════════════════════════════════════ */
const Estado = {
  tipo:    'imagem',
  online:  navigator.onLine,
  aGerar:  false,
  historico: [],

  init() {
    try {
      const s = localStorage.getItem(CONFIG.storage.chave);
      if (s) this.historico = JSON.parse(s);
    } catch (_) { this.historico = []; }
  },

  guardar() {
    localStorage.setItem(CONFIG.storage.chave,
      JSON.stringify(this.historico.slice(0, CONFIG.limites.maxHistorico)));
  },

  adicionarHistorico(item) { this.historico.push(item); this.guardar(); },
  limparHistorico()        { this.historico = [];        this.guardar(); },
};

/* ═══════════════════════════════════════
   2. CONSTRUTOR DE PROMPTS
═══════════════════════════════════════ */
const PromptBuilder = {
  construir({ tema, estilo, artista } = {}) {
    return [
      tema,
      estilo  && `estilo ${estilo}`,
      artista && `ao estilo de ${artista}`,
    ].filter(Boolean).join(', ');
  },
};

/* ═══════════════════════════════════════
   3. APIS
═══════════════════════════════════════ */
const API = {

  /* ── Utilitário: fetch com timeout ── */
  async _fetchComTimeout(url, opcoes = {}, ms = CONFIG.limites.timeoutMs) {
    const ctrl   = new AbortController();
    const timer  = setTimeout(() => ctrl.abort(), ms);
    try {
      return await fetch(url, { ...opcoes, signal: ctrl.signal });
    } finally {
      clearTimeout(timer);
    }
  },

  /* ────────────────────────────────────
     IMAGEM — tenta provedores por ordem
  ──────────────────────────────────── */
  async gerarImagem(prompt, { resolucao = '512x512' } = {}) {
    const ordem = CONFIG.apis.imagem.ordem;
    const erros = [];

    for (const provedor of ordem) {
      try {
        console.log(`[EvlArte] A tentar provedor: ${provedor}`);
        UI.mostrarProvedor(provedor);

        const resultado = await this._gerarImagemCom(provedor, prompt, resolucao);
        console.log(`[EvlArte] ✅ Sucesso com ${provedor}`);
        return resultado;

      } catch (err) {
        console.warn(`[EvlArte] ❌ ${provedor} falhou:`, err.message);
        erros.push(`${provedor}: ${err.message}`);
      }
    }

    throw new Error(`Todos os provedores falharam:\n${erros.join('\n')}`);
  },

  async _gerarImagemCom(provedor, prompt, resolucao) {
    const dim  = CONFIG.resolucoes[resolucao] ?? { w: 512, h: 512 };
    const seed = Math.floor(Math.random() * 99999);

    /* ── Pollinations ── */
    if (provedor === 'pollinations') {
      const cfg = CONFIG.apis.imagem.pollinations;
      const qs  = new URLSearchParams({
        width: dim.w, height: dim.h,
        model: cfg.modelo, seed, nologo: cfg.nologo,
      });
      const url = `${cfg.baseUrl}${encodeURIComponent(prompt)}?${qs}`;
      console.log('[EvlArte] URL Pollinations:', url);

      /* Testa se o servidor responde antes de entregar */
      const resp = await this._fetchComTimeout(url, { method: 'HEAD' }, 15000);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      return { tipo: 'imagem', url, prompt, seed, provedor: 'Pollinations' };
    }

    /* ── Hugging Face — devolve blob ── */
    if (provedor === 'huggingface') {
      const cfg     = CONFIG.apis.imagem.huggingface;
      const headers = { 'Content-Type': 'application/json' };
      if (cfg.chaveApi) headers['Authorization'] = `Bearer ${cfg.chaveApi}`;

      const resp = await this._fetchComTimeout(
        `${cfg.baseUrl}${cfg.modelo}`,
        { method: 'POST', headers, body: JSON.stringify({ inputs: prompt }) },
        60000   /* HuggingFace pode demorar mais */
      );

      if (resp.status === 503) {
        const info = await resp.json().catch(() => ({}));
        throw new Error(`Modelo a carregar (~${Math.ceil(info.estimated_time ?? 30)}s)`);
      }
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const blob = await resp.blob();
      const url  = URL.createObjectURL(blob);
      return { tipo: 'imagem', url, prompt, seed, provedor: 'HuggingFace' };
    }

    /* ── Lexica — pesquisa (fallback sempre disponível) ── */
    if (provedor === 'lexica') {
      const cfg  = CONFIG.apis.imagem.lexica;
      const resp = await this._fetchComTimeout(
        `${cfg.baseUrl}${encodeURIComponent(prompt)}`,
        {}, 10000
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const data = await resp.json();
      if (!data.images?.length) throw new Error('Sem resultados no Lexica');

      /* Devolve até 4 imagens aleatórias do resultado */
      const imagens = data.images.slice(0, 4);
      return imagens.map(img => ({
        tipo: 'imagem',
        url:  img.src,
        prompt,
        seed,
        provedor: 'Lexica (pesquisa)',
        aviso: '⚠️ Imagem de pesquisa, não gerada de raiz',
      }));
    }

    throw new Error(`Provedor desconhecido: ${provedor}`);
  },

  /* ── Áudio ── */
  async gerarAudio(prompt, modelo, durSeg = 10) {
    const chaveMusica = CONFIG.apis.musica.huggingface.chaveApi;
    const chaveSom    = CONFIG.apis.som.huggingface.chaveApi;
    const chave       = chaveMusica || chaveSom || '';
    const headers     = { 'Content-Type': 'application/json' };
    if (chave) headers['Authorization'] = `Bearer ${chave}`;

    const body = { inputs: prompt };
    if (modelo.includes('musicgen')) body.parameters = { duration: durSeg };

    const resp = await fetch(
      `${CONFIG.apis.musica.huggingface.baseUrl}${modelo}`,
      { method: 'POST', headers, body: JSON.stringify(body) }
    );

    if (resp.status === 503) {
      const info = await resp.json().catch(() => ({}));
      throw new Error(`carregando:${Math.ceil(info.estimated_time ?? 20)}`);
    }
    if (!resp.ok) throw new Error(`Erro ${resp.status}: ${resp.statusText}`);

    const blob = await resp.blob();
    return { tipo: 'audio', url: URL.createObjectURL(blob), prompt };
  },
};

/* ═══════════════════════════════════════
   4. UI
═══════════════════════════════════════ */
const UI = {
  el: {},

  init() {
    const q = id => document.getElementById(id);
    this.el = {
      typeBtns:     document.querySelectorAll('.gm__type-card'),
      gerarBtn:     q('gm-gerar'),
      promptArea:   q('gm-prompt'),
      promptClear:  q('gm-prompt-clear'),
      outputClear:  q('gm-output-clear'),
      resultsGrid:  q('gm-results'),
      historyList:  q('gm-history-list'),
      historyClear: q('gm-history-clear'),
      netDot:       q('gm-net-dot'),
      netLabel:     q('gm-net-label'),
      tema:         q('param-tema'),
      estilo:       q('param-estilo'),
      artista:      q('param-artista'),
      count:        q('param-count'),
      duracao:      q('param-duracao'),
      formato:      q('param-formato'),
      resolucao:    q('param-resolucao'),
      grupoDuracao: q('grupo-duracao'),
    };
  },

  setTipo(tipo) {
    this.el.typeBtns.forEach(b =>
      b.classList.toggle('active', b.dataset.type === tipo)
    );
    this.el.grupoDuracao.style.display =
      ['musica', 'som', 'video'].includes(tipo) ? 'flex' : 'none';
    this._atualizarFormatos(tipo);
    this.el.promptArea.placeholder = CONFIG.exemplos[tipo] ?? '';
  },

  _atualizarFormatos(tipo) {
    const opts = CONFIG.formatos[tipo] ?? ['PNG'];
    this.el.formato.innerHTML = opts
      .map(f => `<option value="${f}">${f}</option>`)
      .join('');
  },

  autoPrompt() {
    if (this.el.promptArea.dataset.manual) return;
    const p = PromptBuilder.construir({
      tema:    this.el.tema.value.trim(),
      estilo:  this.el.estilo.value.trim(),
      artista: this.el.artista.value.trim(),
    });
    if (p) this.el.promptArea.value = p;
  },

  setGerando(on, texto = '') {
    this.el.gerarBtn.disabled = on;
    this.el.gerarBtn.classList.toggle('loading', on);
    this.el.gerarBtn.innerHTML = on
      ? `<span class="gm__spinner"></span> ${texto || 'A gerar…'}`
      : '⚡ Gerar';
  },

  /* Mostra qual provedor está a ser tentado */
  mostrarProvedor(provedor) {
    const nomes = {
      pollinations: 'Pollinations',
      huggingface:  'HuggingFace',
      lexica:       'Lexica',
    };
    this.setGerando(true, `A tentar ${nomes[provedor] ?? provedor}…`);
  },

  limparResultados() { this.el.resultsGrid.innerHTML = ''; },

  mostrarPlaceholder() {
    this.el.resultsGrid.innerHTML = `
      <div class="gm__results-empty">
        <div class="gm__results-empty-icon">✦</div>
        <p>Os resultados aparecerão aqui</p>
      </div>`;
  },

  mostrarEmBreve(msg) {
    this.el.resultsGrid.innerHTML =
      `<div class="gm__coming-soon"><span>⏳</span><p>${msg}</p></div>`;
  },

  mostrarErro(msg) {
    const d = document.createElement('div');
    d.className   = 'gm__error-msg';
    d.textContent = msg;
    this.el.resultsGrid.appendChild(d);
  },

  adicionarImagem({ url, prompt, seed, provedor, aviso }) {
    const c = document.createElement('div');
    c.className = 'gm__result-card gm__result-card--imagem';
    c.innerHTML = `
      <div class="gm__result-img-wrapper">
        <div class="gm__result-loader">A carregar…</div>
        <img class="gm__result-img" src="${url}" alt="${prompt}"
          onload="this.previousElementSibling.style.display='none';this.style.opacity='1'"
          onerror="this.closest('.gm__result-card').classList.add('error')">
      </div>
      <div class="gm__result-footer">
        <span class="gm__result-seed">${provedor ? '📡 ' + provedor : 'seed: ' + seed}</span>
        <a class="gm__result-dl" href="${url}" target="_blank" download="evlarte_${seed}.png">↓ Guardar</a>
      </div>
      ${aviso ? `<div class="gm__result-aviso">${aviso}</div>` : ''}`;
    this.el.resultsGrid.appendChild(c);
  },

  adicionarAudio({ url, prompt }) {
    const c = document.createElement('div');
    c.className = 'gm__result-card gm__result-card--audio';
    const t = prompt.length > 70 ? prompt.slice(0, 70) + '…' : prompt;
    c.innerHTML = `
      <div class="gm__result-audio-wrapper">
        <div class="gm__result-audio-icon">♫</div>
        <p class="gm__result-audio-prompt">${t}</p>
        <audio class="gm__result-audio" controls src="${url}"></audio>
      </div>
      <div class="gm__result-footer">
        <span></span>
        <a class="gm__result-dl" href="${url}" download="evlarte_audio.wav">↓ Guardar</a>
      </div>`;
    this.el.resultsGrid.appendChild(c);
  },

  renderHistorico(historico) {
    const list = this.el.historyList;
    if (!historico.length) {
      list.innerHTML = '<p class="gm__history-empty">Sem histórico ainda.</p>';
      return;
    }
    list.innerHTML = [...historico].reverse().map(item => {
      const trunc = item.prompt.length > 80
        ? item.prompt.slice(0, 80) + '…'
        : item.prompt;
      return `
        <div class="gm__history-item" data-prompt="${item.prompt}">
          <div class="gm__history-item-header">
            <span class="gm__history-type gm__history-type--${item.tipo}">${item.tipo}</span>
            <span class="gm__history-time">${new Date(item.ts).toLocaleTimeString('pt-PT')}</span>
          </div>
          <p class="gm__history-prompt">${trunc}</p>
        </div>`;
    }).join('');

    list.querySelectorAll('.gm__history-item').forEach(item => {
      item.addEventListener('click', () => {
        UI.el.promptArea.value          = item.dataset.prompt;
        UI.el.promptArea.dataset.manual = 'true';
      });
    });
  },

  setRede(online) {
    this.el.netDot.className     = `gm__network-dot ${online ? 'online' : 'offline'}`;
    this.el.netLabel.textContent  = online ? 'Online' : 'Offline';
  },
};

/* ═══════════════════════════════════════
   5. APP
═══════════════════════════════════════ */
const App = {

  init() {
    Estado.init();
    UI.init();
    this._bindEventos();
    UI.setTipo(Estado.tipo);
    UI.setRede(Estado.online);
    UI.mostrarPlaceholder();
    UI.renderHistorico(Estado.historico);

    window.addEventListener('online',  () => UI.setRede((Estado.online = true)));
    window.addEventListener('offline', () => UI.setRede((Estado.online = false)));

    console.log('[EvlArte] App iniciada v' + CONFIG.versao);
  },

  _bindEventos() {
    UI.el.typeBtns.forEach(btn =>
      btn.addEventListener('click', () => {
        Estado.tipo = btn.dataset.type;
        UI.setTipo(Estado.tipo);
      })
    );

    ['tema', 'estilo', 'artista'].forEach(k =>
      UI.el[k]?.addEventListener('input', () => UI.autoPrompt())
    );

    UI.el.promptArea.addEventListener('input', () => {
      UI.el.promptArea.dataset.manual = 'true';
    });

    UI.el.promptClear?.addEventListener('click', () => {
      UI.el.promptArea.value = '';
      delete UI.el.promptArea.dataset.manual;
    });

    UI.el.outputClear?.addEventListener('click', () => {
      UI.limparResultados();
      UI.mostrarPlaceholder();
    });

    UI.el.gerarBtn.addEventListener('click', () => this.gerar());

    UI.el.historyClear?.addEventListener('click', () => {
      Estado.limparHistorico();
      UI.renderHistorico([]);
    });
  },

  async gerar() {
    if (Estado.aGerar) return;

    const tipo   = Estado.tipo;
    const prompt = UI.el.promptArea.value.trim();

    if (!prompt)        { alert('Escreve um prompt antes de gerar! ✍️'); return; }
    if (!Estado.online) { alert('Sem ligação à internet.'); return; }

    const apiCfg = CONFIG.apis[tipo];
    if (!apiCfg?.ativo) {
      UI.limparResultados();
      UI.mostrarEmBreve(apiCfg?.mensagem ?? 'Em breve!');
      return;
    }

    Estado.aGerar = true;
    UI.setGerando(true);
    UI.limparResultados();

    const count     = Math.min(parseInt(UI.el.count.value) || 1, CONFIG.limites.maxResultados);
    const resolucao = UI.el.resolucao?.value ?? '512x512';
    const duracao   = parseInt(UI.el.duracao?.value) || 10;

    try {
      if (tipo === 'imagem') {
        for (let i = 0; i < count; i++) {
          const resultado = await API.gerarImagem(prompt, { resolucao });

          /* Lexica pode devolver array */
          if (Array.isArray(resultado)) {
            resultado.forEach(r => UI.adicionarImagem(r));
          } else {
            UI.adicionarImagem(resultado);
          }
        }

      } else if (tipo === 'musica' || tipo === 'som') {
        const modelo = CONFIG.apis[tipo].huggingface.modelo;
        const limite = Math.min(count, CONFIG.limites.audioPorVez);

        for (let i = 0; i < limite; i++) {
          try {
            UI.adicionarAudio(await API.gerarAudio(prompt, modelo, duracao));
          } catch (err) {
            if (err.message.startsWith('carregando:')) {
              const seg = err.message.split(':')[1];
              UI.mostrarErro(`⏳ Modelo a iniciar (~${seg}s). Aguarda e tenta novamente.`);
            } else throw err;
          }
        }
      }

      Estado.adicionarHistorico({ tipo, prompt, ts: Date.now() });
      UI.renderHistorico(Estado.historico);

    } catch (err) {
      console.error('[EvlArte]', err);
      UI.mostrarErro(`Erro: ${err.message}`);
    } finally {
      Estado.aGerar = false;
      UI.setGerando(false);
    }
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
