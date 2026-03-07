/**
 * ============================================================
 *  EvlArte — app.js  (v0.1.1)
 *  Módulos: Estado | PromptBuilder | API | UI | App
 *  Depende de: config.js (carregado antes no HTML)
 * ============================================================
 */
'use strict';

/* ═══════════════════════════════════════
   1. ESTADO — fonte única de verdade
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

  async gerarImagem(prompt, { resolucao = '512x512', seed } = {}) {
    const cfg = CONFIG.apis.imagem.pollinations;
    const dim = CONFIG.resolucoes[resolucao] ?? { w: 512, h: 512 };
    const s   = seed ?? Math.floor(Math.random() * 99999);
    const qs  = new URLSearchParams({
      width:  dim.w,
      height: dim.h,
      model:  cfg.modelo,
      seed:   s,
      nologo: cfg.nologo,
    });
    const url = `${cfg.baseUrl}${encodeURIComponent(prompt)}?${qs}`;
    console.log('[EvlArte] URL imagem:', url);
    return { tipo: 'imagem', url, prompt, seed: s };
  },

  async gerarAudio(prompt, modelo, durSeg = 10) {
    const chave   = CONFIG.apis.musica.huggingface.chaveApi || '';
    const headers = { 'Content-Type': 'application/json' };
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
    const q = (id) => document.getElementById(id);
    this.el = {
      typeBtns:     document.querySelectorAll('.gm__type-card'),
      gerarBtn:     q('gm-gerar'),
      promptArea:   q('gm-prompt'),
      promptClear:  q('gm-prompt-clear'),
      outputClear:  q('gm-output-clear'),   // BUG 4 CORRIGIDO: estava em inline onclick
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

  setGerando(on) {
    this.el.gerarBtn.disabled = on;
    this.el.gerarBtn.classList.toggle('loading', on);
    this.el.gerarBtn.innerHTML = on
      ? '<span class="gm__spinner"></span> A gerar…'
      : '⚡ Gerar';
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
    d.className  = 'gm__error-msg';
    d.textContent = msg;
    this.el.resultsGrid.appendChild(d);
  },

  adicionarImagem({ url, prompt, seed }) {
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
        <span class="gm__result-seed">seed: ${seed}</span>
        <a class="gm__result-dl" href="${url}" target="_blank" download="evlarte_${seed}.png">↓ Guardar</a>
      </div>`;
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
    this.el.netDot.className    = `gm__network-dot ${online ? 'online' : 'offline'}`;
    this.el.netLabel.textContent = online ? 'Online' : 'Offline';
  },
};

/* ═══════════════════════════════════════
   5. APP — controlador principal
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
    /* Botões de tipo */
    UI.el.typeBtns.forEach(btn =>
      btn.addEventListener('click', () => {
        Estado.tipo = btn.dataset.type;
        UI.setTipo(Estado.tipo);
      })
    );

    /* Auto-prompt quando preenche os campos */
    ['tema', 'estilo', 'artista'].forEach(k =>
      UI.el[k]?.addEventListener('input', () => UI.autoPrompt())
    );

    /* Prompt manual cancela o auto */
    UI.el.promptArea.addEventListener('input', () => {
      UI.el.promptArea.dataset.manual = 'true';
    });

    /* Botão limpar prompt */
    UI.el.promptClear?.addEventListener('click', () => {
      UI.el.promptArea.value = '';
      delete UI.el.promptArea.dataset.manual;
    });

    /* Botão limpar output */
    UI.el.outputClear?.addEventListener('click', () => {
      UI.limparResultados();
      UI.mostrarPlaceholder();
    });

    /* Botão GERAR */
    UI.el.gerarBtn.addEventListener('click', () => this.gerar());

    /* Limpar histórico */
    UI.el.historyClear?.addEventListener('click', () => {
      Estado.limparHistorico();
      UI.renderHistorico([]);
    });
  },

  async gerar() {
    if (Estado.aGerar) return;

    const tipo   = Estado.tipo;
    const prompt = UI.el.promptArea.value.trim();

    if (!prompt) {
      alert('Escreve um prompt antes de gerar! ✍️');
      return;
    }
    if (!Estado.online) {
      alert('Sem ligação à internet. Liga-te e tenta novamente.');
      return;
    }

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
        const resultados = await Promise.all(
          Array.from({ length: count }, () =>
            API.gerarImagem(prompt, { resolucao })
          )
        );
        resultados.forEach(r => UI.adicionarImagem(r));

      } else if (tipo === 'musica' || tipo === 'som') {
        const cfg    = CONFIG.apis[tipo].huggingface;
        const modelo = cfg.modelo;
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
