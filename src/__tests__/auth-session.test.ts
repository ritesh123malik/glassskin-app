import fs from 'fs';
import path from 'path';

describe('SecureStoreAdapter session storage parity', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'src/services/supabaseClient.ts'),
    'utf8'
  );

  it('keeps large mobile auth sessions in chunks for native secure storage', () => {
    expect(source).toContain('const CHUNK_SIZE = 2000');
    expect(source).toContain("`${key}_chunks`");
    expect(source).toContain("`${key}_chunk_${i}`");
  });
});
