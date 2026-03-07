/**
 * ============================================================
 *  EvlArte — config.js  (v0.1.2)
 *  Adicionados provedores alternativos de imagem:
 *  pollinations → huggingface (SDXL) → lexica (fallback)
 * ============================================================
 */
const CONFIG = {
  versao: '0.1.2',
  nome: 'EvlArte',

  /* ── APIs ── */
  apis: {
    imagem: {
      ativo: true,

      /* Ordem de tentativa automática — se o 1º falhar, tenta o 2º, etc. */
      ordem: ['pollinations', 'huggingface', 'lexica'],

      pollinations: {
        baseUrl: 'https://image.pollinations.ai/prompt/',
        modelo:  'flux',        /* 'flux' | 'turbo' */
        nologo:  true,
      },

      /* Hugging Face — gratuito, sem chave (com chave tem mais quota) */
      huggingface: {
        baseUrl:  'https://api-inference.huggingface.co/models/',
        modelo:   'stabilityai/stable-diffusion-xl-base-1.0',
        chaveApi: '',
      },

      /* Lexica — pesquisa de imagens IA (sempre disponível, sem gerar de raiz) */
      lexica: {
        baseUrl: 'https://lexica.art/api/v1/search?q=',
      },
    },

    musica: {
      ativo: true,
      provedor: 'huggingface',
      huggingface: {
        baseUrl:       'https://api-inference.huggingface.co/models/',
        modelo:        'facebook/musicgen-small',
        chaveApi:      '',
        duracaoMaxSeg: 30,
      },
    },

    som: {
      ativo: true,
      provedor: 'huggingface',
      huggingface: {
        baseUrl:  'https://api-inference.huggingface.co/models/',
        modelo:   'facebook/audiogen-medium',
        chaveApi: '',
      },
    },

    video: {
      ativo:    false,
      mensagem: 'Geração de vídeo está em desenvolvimento. Em breve! 🎬',
    },
  },

  /* ── Limites ── */
  limites: {
    maxResultados: 4,
    maxHistorico:  50,
    audioPorVez:   2,
    timeoutMs:     25000,   /* 25s por provedor */
  },

  /* ── Resoluções de imagem ── */
  resolucoes: {
    '512x512':   { w: 512,  h: 512  },
    '1024x1024': { w: 1024, h: 1024 },
    '1920x1080': { w: 1920, h: 1080 },
    '1024x1792': { w: 1024, h: 1792 },
  },

  /* ── Formatos por tipo ── */
  formatos: {
    imagem: ['PNG', 'WEBP', 'JPG'],
    video:  ['MP4', 'WEBM'],
    musica: ['MP3', 'WAV', 'OGG'],
    som:    ['WAV', 'MP3', 'OGG'],
  },

  /* ── Prompts de exemplo ── */
  exemplos: {
    imagem: 'Uma floresta mágica ao entardecer, com criaturas fantásticas',
    musica: 'Música eletrónica animada que evoca sentimentos de festa',
    som:    'Ambiente de uma praia tranquila com ondas suaves',
    video:  'Vida selvagem na savana africana ao amanhecer',
  },

  /* ── Armazenamento local ── */
  storage: {
    chave: 'evlarte_historico',
  },
};
