import { catalog } from '../policy/catalog.js';
import { evaluateAnswers } from '../policy/engine.js';

// The public site has no backend. Answers never leave this browser tab.
const visitor = Object.freeze({ role: 'public' });
export async function publicRequest(path, options = {}) {
  if (path === '/api/session') return { user: visitor };
  if (path === '/api/catalog') return catalog;
  if (path === '/api/evaluate') {
    const { answers = {} } = JSON.parse(options.body || '{}');
    return evaluateAnswers(answers);
  }
  throw new Error('공개 사이트에서 지원하지 않는 기능입니다.');
}
