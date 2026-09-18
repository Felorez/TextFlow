import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { normalizeFonts, filterFonts, createFontSource } from './googleFonts';

const font = (family, overrides = {}) => ({
  family,
  subsets: ['latin', 'cyrillic'],
  category: 'sans-serif',
  files: { regular: `https://fonts/${family}.ttf` },
  ...overrides
});

describe('normalizeFonts', () => {
  it('оставляет только шрифты с кириллицей', () => {
    const result = normalizeFonts([
      font('Roboto'),
      font('Latin Only', { subsets: ['latin'] })
    ]);

    expect(result.map(f => f.family)).toEqual(['Roboto']);
  });

  it('не падает на элементах без subsets', () => {
    expect(normalizeFonts([{ family: 'X', files: {} }])).toEqual([]);
  });

  it('оставляет по одному шрифту на семейство', () => {
    const result = normalizeFonts([font('Roboto'), font('Roboto')]);
    expect(result).toHaveLength(1);
  });

  it('берёт regular как основной url', () => {
    const [result] = normalizeFonts([font('Roboto')]);
    expect(result.url).toBe('https://fonts/Roboto.ttf');
  });

  it('падает обратно на первое доступное начертание, если regular нет', () => {
    const [result] = normalizeFonts([
      font('Roboto', { files: { '700': 'https://fonts/Roboto-700.ttf' } })
    ]);

    expect(result.url).toBe('https://fonts/Roboto-700.ttf');
  });

  it('возвращает пустой список без аргументов', () => {
    expect(normalizeFonts()).toEqual([]);
  });
});

describe('filterFonts', () => {
  const fonts = [{ family: 'Roboto' }, { family: 'Open Sans' }, { family: 'PT Serif' }];

  it('пустой запрос возвращает всё', () => {
    expect(filterFonts(fonts, '')).toHaveLength(3);
    expect(filterFonts(fonts, '   ')).toHaveLength(3);
    expect(filterFonts(fonts, undefined)).toHaveLength(3);
  });

  it('ищет без учёта регистра по подстроке', () => {
    expect(filterFonts(fonts, 'sans').map(f => f.family)).toEqual(['Open Sans']);
    expect(filterFonts(fonts, 'ROB').map(f => f.family)).toEqual(['Roboto']);
  });

  it('возвращает пустой список, если совпадений нет', () => {
    expect(filterFonts(fonts, 'comic')).toEqual([]);
  });
});

describe('createFontSource', () => {
  let warn;

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
  });

  const okResponse = (items) => ({
    ok: true,
    json: async () => ({ items })
  });

  it('без ключа не ходит в сеть и предупреждает', async () => {
    const fetchImpl = vi.fn();
    const source = createFontSource({ apiKey: '', fetchImpl });

    expect(await source.load()).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });

  it('подставляет ключ в урл запроса', async () => {
    const fetchImpl = vi.fn(async () => okResponse([font('Roboto')]));
    await createFontSource({ apiKey: 'KEY123', fetchImpl }).load();

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://www.googleapis.com/webfonts/v1/webfonts?key=KEY123'
    );
  });

  it('кеширует список: повторный поиск не делает новый запрос', async () => {
    const fetchImpl = vi.fn(async () => okResponse([font('Roboto'), font('Open Sans')]));
    const source = createFontSource({ apiKey: 'KEY', fetchImpl });

    await source.search('');
    await source.search('rob');
    await source.search('sans');

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('параллельные вызовы делят один запрос', async () => {
    const fetchImpl = vi.fn(async () => okResponse([font('Roboto')]));
    const source = createFontSource({ apiKey: 'KEY', fetchImpl });

    await Promise.all([source.load(), source.load(), source.load()]);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('search фильтрует загруженный список', async () => {
    const fetchImpl = async () => okResponse([font('Roboto'), font('Open Sans')]);
    const source = createFontSource({ apiKey: 'KEY', fetchImpl });

    const result = await source.search('open');

    expect(result.map(f => f.family)).toEqual(['Open Sans']);
  });

  it('бросает ошибку на плохом ответе API', async () => {
    const fetchImpl = async () => ({ ok: false, status: 403 });
    const source = createFontSource({ apiKey: 'KEY', fetchImpl });

    await expect(source.load()).rejects.toThrow('403');
  });

  it('не кеширует неудачу — следующий вызов пробует снова', async () => {
    let attempt = 0;
    const fetchImpl = vi.fn(async () => {
      attempt++;
      return attempt === 1 ? { ok: false, status: 500 } : okResponse([font('Roboto')]);
    });
    const source = createFontSource({ apiKey: 'KEY', fetchImpl });

    await expect(source.load()).rejects.toThrow('500');
    expect(await source.load()).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
