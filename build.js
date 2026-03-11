const fs = require('fs');

const url = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_ANON_KEY || '';

if (!url || !key) {
  console.warn('⚠️  SUPABASE_URL 또는 SUPABASE_ANON_KEY 환경변수가 없습니다.');
}

const content = `window.__SUPABASE_CONFIG__ = { url: "${url}", key: "${key}" };\n`;
fs.writeFileSync('config.js', content);
console.log('✅ config.js 생성 완료');
