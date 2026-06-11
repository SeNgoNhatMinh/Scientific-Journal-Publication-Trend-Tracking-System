const normalize = text =>
  String(text || '')
    .trim()
    .toLowerCase()
    .replace(/[-_/]+/g, ' ')
    .replace(/[^\w\s.]/g, ' ')
    .replace(/\s+/g, ' ');

const RULES = [
  {
    category: 'algorithm',
    confidence: 0.95,
    terms: [
      'mamba',
      'transformer',
      'vision transformer',
      'bert',
      'gpt',
      'llama',
      'cnn',
      'convolutional neural network',
      'rnn',
      'lstm',
      'gru',
      'gnn',
      'graph neural network',
      'gan',
      'diffusion model',
      'random forest',
      'support vector machine',
      'svm',
      'xgboost',
      'resnet',
      'yolo',
      'u net',
      'unet',
      'autoencoder',
    ],
  },
  {
    category: 'dataset',
    confidence: 0.92,
    terms: [
      'mnist',
      'fashion mnist',
      'imagenet',
      'cifar',
      'coco',
      'pubmed',
      'mimic',
      'kaggle',
      'benchmark dataset',
    ],
  },
  {
    category: 'tool',
    confidence: 0.9,
    terms: [
      'pytorch',
      'tensorflow',
      'keras',
      'scikit learn',
      'sklearn',
      'huggingface',
      'opencv',
      'matlab',
      'cuda',
      'spark',
    ],
  },
  {
    category: 'application',
    confidence: 0.88,
    terms: [
      'classification',
      'segmentation',
      'image segmentation',
      'object detection',
      'detection',
      'forecasting',
      'prediction',
      'recommendation',
      'retrieval',
      'diagnosis',
      'translation',
      'summarization',
      'question answering',
      'anomaly detection',
      'time series forecasting',
      'sentiment analysis',
      'speech recognition',
    ],
  },
  {
    category: 'method',
    confidence: 0.86,
    terms: [
      'deep learning',
      'machine learning',
      'reinforcement learning',
      'federated learning',
      'contrastive learning',
      'self supervised learning',
      'supervised learning',
      'unsupervised learning',
      'semi supervised learning',
      'transfer learning',
      'meta learning',
      'active learning',
      'representation learning',
      'fine tuning',
      'prompt tuning',
      'retrieval augmented generation',
      'rag',
      'natural language processing',
      'computer vision',
    ],
  },
  {
    category: 'domain',
    confidence: 0.84,
    terms: [
      'medical imaging',
      'healthcare',
      'medicine',
      'robotics',
      'education',
      'finance',
      'agriculture',
      'cybersecurity',
      'remote sensing',
      'bioinformatics',
      'drug discovery',
      'climate',
      'transportation',
      'manufacturing',
      'internet of things',
      'iot',
      'smart city',
      'autonomous driving',
      'radiology',
      'pathology',
    ],
  },
];

const termMatches = (normalizedText, term) => {
  if (normalizedText === term) return true;
  return new RegExp(`(^|\\s)${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`).test(
    normalizedText
  );
};

const classifyKeyword = text => {
  const normalizedText = normalize(text);

  for (const rule of RULES) {
    const matchedTerm = rule.terms.find(term => termMatches(normalizedText, normalize(term)));
    if (matchedTerm) {
      return {
        category: rule.category,
        confidence: rule.confidence,
        classifiedBy: 'rule',
        matchedTerm,
      };
    }
  }

  return {
    category: 'general',
    confidence: 0.25,
    classifiedBy: 'rule',
    matchedTerm: null,
  };
};

module.exports = {
  classifyKeyword,
  normalize,
  RULES,
};
