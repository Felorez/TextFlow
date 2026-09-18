import { describe, it, expect } from 'vitest';
import { escapeHTML, buildHTML } from './htmlExport';

describe('escapeHTML', () => {
  it('экранирует спецсимволы', () => {
    expect(escapeHTML('<b>&"')).toBe('&lt;b&gt;&amp;&quot;');
  });

  it('экранирует амперсанд первым, без двойного экранирования', () => {
    expect(escapeHTML('&lt;')).toBe('&amp;lt;');
  });

  it('превращает null и undefined в пустую строку', () => {
    expect(escapeHTML(null)).toBe('');
    expect(escapeHTML(undefined)).toBe('');
  });

  it('приводит числа к строке', () => {
    expect(escapeHTML(42)).toBe('42');
  });

  it('не трогает обычный текст, включая кириллицу', () => {
    expect(escapeHTML('Привет, мир')).toBe('Привет, мир');
  });
});

const canvasSize = { width: 800, height: 600 };

describe('buildHTML', () => {
  it('подставляет размеры холста', () => {
    const html = buildHTML([], canvasSize);
    expect(html).toContain('width: 800px;');
    expect(html).toContain('height: 600px;');
  });

  it('рендерит текстовый элемент с координатами и кеглем', () => {
    const html = buildHTML(
      [{ text: 'Заголовок', x: 10, y: 20, fontSize: 32 }],
      canvasSize
    );

    expect(html).toContain('Заголовок');
    expect(html).toContain('left: 10px;');
    expect(html).toContain('top: 20px;');
    expect(html).toContain('font-size: 32px;');
  });

  it('подставляет кегль и шрифт по умолчанию', () => {
    const html = buildHTML([{ text: 'Текст', x: 0, y: 0 }], canvasSize);

    expect(html).toContain('font-size: 20px;');
    expect(html).toContain("font-family: sans-serif;");
  });

  it('экранирует текст элемента — иначе выгруженный файл ломается', () => {
    const html = buildHTML(
      [{ text: '<script>alert(1)</script>', x: 0, y: 0 }],
      canvasSize
    );

    expect(html).not.toContain('<script>alert(1)');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('рендерит таблицу построчно', () => {
    const html = buildHTML(
      [{ type: 'table', x: 5, y: 5, rows: [['a', 'b'], ['c', 'd']] }],
      canvasSize
    );

    expect(html.match(/<tr>/g)).toHaveLength(2);
    expect(html.match(/<td /g)).toHaveLength(4);
    expect(html).toContain('>a</td>');
    expect(html).toContain('>d</td>');
  });

  it('экранирует содержимое ячеек', () => {
    const html = buildHTML(
      [{ type: 'table', x: 0, y: 0, rows: [['<td>']] }],
      canvasSize
    );

    expect(html).toContain('&lt;td&gt;');
  });

  it('пропускает строки таблицы, которые не массивы', () => {
    const html = buildHTML(
      [{ type: 'table', x: 0, y: 0, rows: [null, ['ок']] }],
      canvasSize
    );

    expect(html.match(/<tr>/g)).toHaveLength(2);
    expect(html.match(/<td /g)).toHaveLength(1);
  });

  it('собирает документ целиком для пустого холста', () => {
    const html = buildHTML([], canvasSize);

    expect(html.startsWith('<html>')).toBe(true);
    expect(html.trim().endsWith('</html>')).toBe(true);
    expect(html).toContain('<meta charset="UTF-8">');
  });

  it('рендерит несколько элементов разных типов', () => {
    const html = buildHTML(
      [
        { text: 'Первый', x: 0, y: 0 },
        { type: 'table', x: 0, y: 40, rows: [['ячейка']] }
      ],
      canvasSize
    );

    expect(html).toContain('Первый');
    expect(html).toContain('ячейка');
  });
});
