/*
 * EvlArte — config.js (v1.1)
 */

const CONFIG = {
  versao: '1.1.0',
  nome: 'EvlArte',

  
  proxyUrl: 'https://dry-glade-294d.onitech38.workers.dev/?url=',

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
      endpoint: "https://api-inference.huggingface.co/models/facebook/musicgen-small",
      token: "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",
      mensagem: '🎵 A gerar música via Hugging Face (proxy)…',
    },

    som: {
      ativo: false,
      endpoint: '',
      mensagem: '🔊 Som via proxy ainda não configurado.',
    },

    video: {
      ativo: false,
      endpoint: '',
      mensagem: '🎬 Vídeo via proxy ainda não configurado.',
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
