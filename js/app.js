/**
 * ============================================================
 *  EvlArte — app.js  (v0.1.3)
 *
 *  CORREÇÃO PRINCIPAL:
 *  Pollinations funciona como URL direta — a tag <img> carrega
 *  a imagem sem precisar de fetch(). Isto evita CORS e timeouts.
 *
 *  Fallback: se o modelo falhar (onerror na img), tenta o próximo.
 * ============================================================
 */
'use strict';

/* ═══════════════════════════════════════
   1. ESTADO
═══════════════════════════════════════ */
const Estado = {
  tipo:      'imagem',
  online:    navigator.onLine,
  aGerar:    false,
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

  /*
   * Gera a URL da imagem — SEM fazer fetch().
   * A <img> carrega diretamente — assim não há CORS.
   * Se a imagem falhar (onerror), o card tenta o próximo modelo.
   */
  construirUrlImagem(prompt, modelo, { resolucao = '512x512', seed } = {}) {
    const cfg = CONFIG.apis.imagem.pollinations;
    const dim = CONFIG.resolucoes[resolucao] ?? { w: 512, h: 512 };
    const s   = seed ?? Math.floor(Math.random() * 99999);

    const qs = new URLSearchParams({
      width:   dim.w,
      height:  dim.h,
      model:   modelo,
      seed:    s,
      nologo:  cfg.nologo,
      enhance: cfg.enhance,
    });

    const url = `${cfg.baseUrl}${encodeURIComponent(prompt)}?${qs}`;
    console.log(`[EvlArte] URL (${modelo}):`, url);
    return { url, seed: s, modelo };
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
    d.className   = 'gm__error-msg';
    d.textContent = msg;
    this.el.resultsGrid.appendChild(d);
  },

  /*
   * Cria o card e uma Promise que resolve quando a imagem
   * carrega (onload) ou rejeita se falhar (onerror).
   * O chamador pode usar isto para fazer fallback de modelo.
   */
  adicionarImagemComPromise({ url, seed, modelo, prompt }) {
    const c = document.createElement('div');
    c.className = 'gm__result-card gm__result-card--imagem';

    const promise = new Promise((resolve, reject) => {
      c.innerHTML = `
        <div class="gm__result-img-wrapper">
          <div class="gm__result-loader">🤖 modelo: ${modelo}…</div>
          <img class="gm__result-img" src="${url}" alt="${prompt}">
        </div>
        <div class="gm__result-footer">
          <span class="gm__result-seed">🎨 ${modelo} · seed ${seed}</span>
          <a class="gm__result-dl" href="${url}" target="_blank"
             download="evlarte_${seed}.png">↓ Guardar</a>
        </div>`;

      const img    = c.querySelector('.gm__result-img');
      const loader = c.querySelector('.gm__result-loader');

      img.onload  = () => {
        loader.style.display = 'none';
        img.style.opacity    = '1';
        resolve(c);
      };
      img.onerror = () => {
        c.remove();
        reject(new Error(`Modelo ${modelo} falhou`));
      };

      /* Timeout de segurança */
      setTimeout(() => {
        if (img.style.opacity !== '1') {
          c.remove();
          reject(new Error(`Timeout no modelo ${modelo}`));
        }
      }, CONFIG.limites.timeoutImg);
    });

    this.el.resultsGrid.appendChild(c);
    return promise;
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

  async gerarUmaImagem(prompt, resolucao) {
    const modelos = CONFIG.apis.imagem.ordem;
    const seed    = Math.floor(Math.random() * 99999);

    for (const modelo of modelos) {
      try {
        console.log(`[EvlArte] A tentar modelo: ${modelo}`);
        const { url } = API.construirUrlImagem(prompt, modelo, { resolucao, seed });
        await UI.adicionarImagemComPromise({ url, seed, modelo, prompt });
        console.log(`[EvlArte] ✅ Sucesso com modelo: ${modelo}`);
        return; /* Saiu — imagem carregou! */
      } catch (err) {
        console.warn(`[EvlArte] ❌ ${modelo}:`, err.message);
      }
    }

    UI.mostrarErro('⚠️ Todos os modelos falharam. O servidor Pollinations.ai pode estar em baixo. Tenta novamente em alguns minutos.');
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

    try {
      if (tipo === 'imagem') {
        /* Gera todas em paralelo */
        await Promise.all(
          Array.from({ length: count }, () =>
            this.gerarUmaImagem(prompt, resolucao)
          )
        );
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
