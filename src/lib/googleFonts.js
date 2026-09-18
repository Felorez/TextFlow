// Работа со списком шрифтов Google Fonts.
// Вынесено из App.vue отдельным модулем, чтобы покрыть тестами.

// Из ответа API остаются только шрифты с кириллицей, по одному на семейство
export const normalizeFonts = (items = []) => {
  const uniqueFonts = {};

  items.forEach(item => {
    if (item.subsets && item.subsets.includes('cyrillic')) {
      if (!uniqueFonts[item.family]) {
        uniqueFonts[item.family] = item;
      }
    }
  });

  return Object.values(uniqueFonts).map((item, index) => ({
    id: index,
    family: item.family,
    url: item.files.regular || Object.values(item.files)[0],
    urls: item.files,
    category: item.category,
    samplePath: null
  }));
};

export const filterFonts = (fonts, searchQuery) => {
  const query = (searchQuery || '').toLowerCase().trim();
  return fonts.filter(font => !query || font.family.toLowerCase().includes(query));
};

// Источник шрифтов с кешем: сеть дёргается один раз,
// поиск потом фильтрует уже загруженное
export const createFontSource = ({ apiKey, fetchImpl = fetch } = {}) => {
  let loaded = null;
  let pending = null;

  const load = async () => {
    if (loaded) return loaded;

    if (!apiKey) {
      console.warn('VITE_GOOGLE_FONTS_API_KEY не задан — список шрифтов недоступен. См. .env.example');
      loaded = [];
      return loaded;
    }

    // Параллельные вызовы ждут один и тот же запрос
    if (!pending) {
      pending = (async () => {
        const response = await fetchImpl(
          `https://www.googleapis.com/webfonts/v1/webfonts?key=${apiKey}`
        );

        if (!response.ok) {
          throw new Error(`Google Fonts API вернул ${response.status}`);
        }

        const data = await response.json();
        return normalizeFonts(data.items);
      })();

      // Неудачу не кешируем — следующий вызов попробует снова
      pending.catch(() => { pending = null; });
    }

    loaded = await pending;
    return loaded;
  };

  return {
    load,
    search: async (searchQuery) => filterFonts(await load(), searchQuery)
  };
};
