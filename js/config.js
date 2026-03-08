/*
 * EvlArte — config.js (v1.0)
 */

const CONFIG = {
  versao: '1.0.0',
  nome: 'EvlArte',

  // URL do teu Cloudflare Worker (termina em ?url=)
  proxyUrl: 'https://TEU_WORKER_URL.workers.dev?url=',

  apis: {
    imagem: {
      ativo: true,
      ordem: ['flux', 'turbo', 'flux-realism'],

      pollinations: {
        baseUrl: 'https://image.pollinations.ai/prompt/',
        nologo: true,
        enhance: false,
      },
    },

    musica: {
      ativo: true,
      endpoint: 'https://api-interna-musica.com/generate', // TROCAR
      mensagem: '🎵 A gerar música via proxy…',
    },

    som: {
      ativo: true,
      endpoint: 'https://api-interna-som.com/generate', // TROCAR
      mensagem: '🔊 A gerar som via proxy…',
    },

    video: {
      ativo: true,
      endpoint: 'https://api-interna-video.com/generate', // TROCAR
      mensagem: '🎬 A gerar vídeo via proxy…',
    },
  },

  limites: {
    maxResultados: 4,
    maxHistorico: 50,
    timeoutImg: 30000,
  },

  resolucoes: {
    '512x512': { w: 512, h: 512 },
    '1024x1024': { w: 1024, h: 1024 },
    '1920x1080': { w: 1920, h: 1080 },
    '1024x1792': { w: 1024, h: 1792 },
  },

  exemplos: {
    imagem: 'Uma floresta mágica ao entardecer, com criaturas fantásticas',
    musica: 'Música eletrónica animada que evoca sentimentos de festa',
    som: 'Ambiente de uma praia tranquila com ondas suaves',
    video: 'Vida selvagem na savana africana ao amanhecer',
  },

  storage: {
    chave: 'evlarte_historico',
  },
};
