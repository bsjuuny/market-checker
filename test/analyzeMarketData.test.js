import assert from 'node:assert/strict';
import test from 'node:test';

import { analyzeMarketData } from '../src/logic.js';

const baseMarketData = {
  nasdaq: { rate: '+0.4%' },
  nqFutures: { rate: '+0.2%' },
  sox: { rate: '+0.3%' },
  spx: { rate: '+0.1%' },
  kospi: { rate: '+0.2%' },
  kosdaq: { rate: '+0.1%' },
  exchangeRate: '1,350.00',
  exchangeChange: '+1.0',
  wti: '78.5',
  eurostoxx: { rate: '+0.2%' },
  dax: { rate: '+0.1%' },
  ftse: { rate: '+0.1%' },
  nikkei: { rate: '+0.2%' },
  hangseng: { rate: '+0.1%' },
  shanghai: { rate: '+0.1%' },
  cnnFearGreed: { score: 50 },
  foreignInvestor: { foreign: 500 },
};

test('classifies calm market data as Bull with a low bear score', () => {
  const analysis = analyzeMarketData(baseMarketData);

  assert.equal(analysis.mode, 'Bull');
  assert.equal(analysis.bearScore, 0);
  assert.equal(analysis.bearScoreMax, 17);
  assert.equal(analysis.tags.sox, 'tag-yellow');
});

test('weights semiconductor, US, FX, sentiment, and regional stress into Bear mode', () => {
  const analysis = analyzeMarketData({
    ...baseMarketData,
    nasdaq: { rate: '-2.4%' },
    nqFutures: { rate: '-1.2%' },
    sox: { rate: '-2.3%' },
    spx: { rate: '-2.2%' },
    kospi: { rate: '-1.8%' },
    kosdaq: { rate: '-2.3%' },
    exchangeChange: '+8.0',
    eurostoxx: { rate: '-2.7%' },
    nikkei: { rate: '-2.8%' },
    cnnFearGreed: { score: 12 },
  });

  assert.equal(analysis.mode, 'Bear');
  assert.equal(analysis.bearScore, 17);
  assert.equal(analysis.tags.sox, 'tag-red');
  assert.equal(analysis.tags.exchangeChange, 'tag-orange');
});
