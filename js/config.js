/*
 * EvlArte — config.js (v2.0)
 * NOVIDADES v2.0:
 * - Exemplos detalhados por tipo
 * - Música via Pollinations (proxy com token)
 * - Versão atualizada
 */

const CONFIG = {
  versao: '2.0.0',
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
      endpoint: 'https://gen.pollinations.ai/audio/',
      modelo: 'elevenmusicai',
      mensagem: '🎵 A gerar música via Pollinations…',
    },

    som: {
      ativo: false,
      endpoint: '',
      mensagem: '🔊 Som em breve.',
    },

    video: {
      ativo: false,
      endpoint: '',
      mensagem: '🎬 Vídeo em breve.',
    },
  },

  limites: {
    maxResultados: 4,
    maxHistorico: 50,
    timeoutImg: 30000,
    maxDuracao: 300,
    minDuracao: 3,
  },

  resolucoes: {
    '512x512':   { w: 512,  h: 512  },
    '1024x1024': { w: 1024, h: 1024 },
    '1920x1080': { w: 1920, h: 1080 },
    '1024x1792': { w: 1024, h: 1792 },
  },

  // Exemplos clicáveis por tipo
  exemplos: {
    imagem: [
      'Uma floresta mágica ao entardecer, com criaturas fantásticas',
      'Cidade futurista banhada por luz neon na chuva',
      'Retrato de samurai em estilo aquarela japonesa',
      'Paisagem lunar com montanhas de cristal brilhante',
    ],
    musica: [
      'Música eletrónica animada que evoca sentimentos de festa',
      'Jazz suave com piano e saxofone ao anoitecer',
      'Banda sonora épica orquestral para filme de ação',
      'Lo-fi chill beats para estudar e relaxar',
    ],
    som: [
      'Ambiente de uma praia tranquila com ondas suaves',
      'Floresta chuvosa com pássaros e vento',
      'Café movimentado com murmúrio de fundo',
      'Fogueira crepitante numa noite de inverno',
    ],
    video: [
      'Vida selvagem na savana africana ao amanhecer',
      'Time-lapse de uma cidade do pôr do sol à madrugada',
      'Fundo do mar com corais coloridos e peixes tropicais',
      'Aurora boreal sobre montanhas nevadas da Islândia',
    ],
  },

  storage: {
    chave: 'evlarte_historico',
  },
};