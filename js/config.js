const CONFIG = {
  versao: '0.2.0',
  nome: 'EvlArte',

  proxyUrl: 'https://TEU_WORKER.cloudflare.workers.dev?url=',

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
      ativo: false,
      mensagem: '🎵 Música requer proxy. Em breve!',
    },

    som: {
      ativo: false,
      mensagem: '🔊 Som requer proxy. Em breve!',
    },

    video: {
      ativo: false,
      mensagem: '🎬 Vídeo em desenvolvimento.',
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
