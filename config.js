/**
 * ============================================================
 *  GenMulti — config.js  (v0.1.0)
 *  Todas as definições do projeto num único lugar.
 *  Para ajustar comportamentos, edita APENAS este ficheiro.
 * ============================================================
 */

const CONFIG = {

  versao: '0.1.0',
  nome: 'GenMulti',

  /* ── APIs ── */
  apis: {

    imagem: {
      ativo: true,
      provedor: 'pollinations',           // trocar aqui para mudar fornecedor
      pollinations: {
        baseUrl: 'https://image.pollinations.ai/prompt/',
        modelo: 'flux',                   // opções: 'flux' | 'turbo'
        nologo: true,
      },
    },

    musica: {
      ativo: true,
      provedor: 'huggingface',
      huggingface: {
        baseUrl: 'https://api-inference.huggingface.co/models/',
        modelo: 'facebook/musicgen-small',
        chaveApi: '',                     // opcional — aumenta a quota diária
        duracaoMaxSeg: 30,
      },
    },

    som: {
      ativo: true,
      provedor: 'huggingface',
      huggingface: {
        baseUrl: 'https://api-inference.huggingface.co/models/',
        modelo: 'facebook/audiogen-medium',
        chaveApi: '',
      },
    },

    video: {
      ativo: false,
      mensagem: 'Geração de vídeo está em desenvolvimento. Em breve! 🎬',
    },
  },

  /* ── Limites ── */
  limites: {
    maxResultados: 4,
    maxHistorico: 50,
    audioPorVez: 2,     // áudio é lento — limitamos para não bloquear
  },

  /* ── Resoluções de imagem ── */
  resolucoes: {
    '512×512':   { w: 512,  h: 512  },
    '1024×1024': { w: 1024, h: 1024 },
    '1920×1080': { w: 1920, h: 1080 },
    '1024×1792': { w: 1024, h: 1792 },
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
    chave: 'genmulti_historico',
  },

};
