/**
 * ============================================================
 *  EvlArte — config.js  (v0.1.3)
 *
 *  LIÇÃO APRENDIDA:
 *  HuggingFace e Lexica bloqueiam CORS — não funcionam
 *  diretamente do browser.
 *
 *  Pollinations.ai funciona como URL direta de imagem
 *  (não precisa de fetch — a tag <img> carrega sozinha).
 *  Usamos 3 modelos diferentes como fallback.
 * ============================================================
 */
const CONFIG = {
  versao: '0.1.3',
  nome: 'EvlArte',

  apis: {
    imagem: {
      ativo: true,

      /*
       * Todos usam Pollinations mas com modelos diferentes.
       * Se 'flux' der 502, tenta 'turbo', depois 'flux-realism'.
       * A URL é usada DIRETAMENTE como src da <img> — sem fetch!
       */
      ordem: ['flux', 'turbo', 'flux-realism'],

      pollinations: {
        baseUrl: 'https://image.pollinations.ai/prompt/',
        nologo:  true,
        enhance: false,
      },
    },

    musica: {
      ativo:    false,
      mensagem: '🎵 Música requer servidor próprio (CORS). Em breve com solução proxy!',
    },

    som: {
      ativo:    false,
      mensagem: '🔊 Som requer servidor próprio (CORS). Em breve com solução proxy!',
    },

    video: {
      ativo:    false,
      mensagem: '🎬 Geração de vídeo está em desenvolvimento. Em breve!',
    },
  },

  limites: {
    maxResultados: 4,
    maxHistorico:  50,
    timeoutImg:    30000,   /* ms para considerar imagem falhada */
  },

  resolucoes: {
    '512x512':   { w: 512,  h: 512  },
    '1024x1024': { w: 1024, h: 1024 },
    '1920x1080': { w: 1920, h: 1080 },
    '1024x1792': { w: 1024, h: 1792 },
  },

  formatos: {
    imagem: ['PNG', 'WEBP', 'JPG'],
    video:  ['MP4', 'WEBM'],
    musica: ['MP3', 'WAV'],
    som:    ['WAV', 'MP3'],
  },

  exemplos: {
    imagem: 'Uma floresta mágica ao entardecer, com criaturas fantásticas',
    musica: 'Música eletrónica animada que evoca sentimentos de festa',
    som:    'Ambiente de uma praia tranquila com ondas suaves',
    video:  'Vida selvagem na savana africana ao amanhecer',
  },

  storage: {
    chave: 'evlarte_historico',
  },
};
