# Feature: Daily Quote of the Day

## Цель

Добавить под счётчик возраста блок с вдохновляющей цитатой дня. Цитата обновляется раз в сутки, имеет автора и (если известен) год. Фича управляется через настройку в localStorage и может быть отключена пользователем.

---

## Задачи

### Задача 1: Собрать ~1000 цитат → `app/quotes.js`

**Источники (открытые, рекомендуемые в порядке приоритета):**

| Источник | URL | Формат | Цитат | Лицензия |
|----------|-----|--------|-------|----------|
| Database-Quotes-JSON | https://github.com/JamesFT/Database-Quotes-JSON | JSON | 5000+ | не указана |
| dwyl/quotes | https://github.com/dwyl/quotes | JSON | 800+ | GPLv2 |
| English Quotes (HF) | https://huggingface.co/datasets/Abirate/english_quotes | JSON | 2500+ | CC-BY-4.0 |
| Quotes-500K | https://github.com/ShivaliGoel/Quotes-500K | CSV | 500K | Research |

**Стратегия:**
1. Взять `dwyl/quotes` как базу (~800 проверенных цитат, GPLv2)
2. Дополнить из `Database-Quotes-JSON` до ~1000 уникальных цитат
3. Отфильтровать: длина > 200 символов → убрать, без автора → убрать
4. Дедупликация по тексту

**Формат `app/quotes.js`:**
```js
// Sources: dwyl/quotes (GPLv2), JamesFT/Database-Quotes-JSON
export const QUOTES = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs", year: 2005 },
  { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
  // ...
];
```

- `text` — строка, обязательное
- `author` — строка, обязательное
- `year` — число (год речи/публикации/книги), опциональное

**Цель: 1000+ цитат.** При случайной выборке по дню за 365 дней в году теоретически можно получить ~30% повторений — но на практике хеш от даты делает выборку детерминированной и равномерной, поэтому при 1000 цитатах год без повторений гарантирован.

---

### Задача 2: Модуль `app/daily-quote.js`

Отвечает за выбор цитаты на основе текущей даты.

```js
/**
 * Простой детерминированный хеш строки (djb2).
 * Один день → одно число → один индекс в массиве цитат.
 */
export function hashDay(dateStr) {
  let hash = 5381;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 33) ^ dateStr.charCodeAt(i);
  }
  return Math.abs(hash);
}

/**
 * Возвращает цитату дня.
 * @param {Array} quotes - массив цитат
 * @param {Date} [date] - дата (по умолчанию сегодня)
 * @returns {{ text: string, author: string, year?: number }}
 */
export function getQuoteOfTheDay(quotes, date = new Date()) {
  const dateStr = date.toISOString().slice(0, 10); // "YYYY-MM-DD"
  const index = hashDay(dateStr) % quotes.length;
  return quotes[index];
}
```

**Почему хеш от даты, а не Math.random():**
- `Math.random()` даёт новую цитату при каждом открытии вкладки
- Хеш от "YYYY-MM-DD" → одна цитата на весь день, стабильная при перезагрузке

---

### Задача 3: Конфиг в `app/app.js`

**localStorage ключ:** `showQuote`
- `'1'` — показывать (значение по умолчанию)
- `'0'` — скрыть

```js
// Загрузка
loadConfig() {
  this.showQuote = localStorage.getItem('showQuote') !== '0';
}

// Сохранение
saveConfig() {
  localStorage.setItem('showQuote', this.showQuote ? '1' : '0');
}
```

**UI переключатель:**
- Маленькая кнопка `💬` / `—` в нижнем правом углу
- `position: fixed; bottom: 1rem; right: 1rem`
- Полупрозрачная (opacity 0.3), при hover → opacity 1
- При клике: `this.showQuote = !this.showQuote; this.saveConfig(); this.toggleQuote()`

---

### Задача 4: Рендеринг в `dashboard.html` + `app/app.js`

**Шаблон в `dashboard.html`:**
```html
<script type="text/template" id="quote-template">
  <figure class="daily-quote">
    <blockquote>
      <p class="quote-text">{{text}}</p>
    </blockquote>
    <figcaption class="quote-attribution">
      — <cite class="quote-author">{{author}}</cite><span class="quote-year">{{year}}</span>
    </figcaption>
  </figure>
</script>
```

`{{year}}` рендерится как `, 1984` — через форматирование перед вставкой в шаблон (если год есть).

**В `App.renderAgeLoop()`:**
```js
renderAgeLoop() {
  // ... существующий код ...
  if (this.showQuote) {
    this.renderQuote();
  }
}

renderQuote() {
  const quote = getQuoteOfTheDay(QUOTES);
  const yearStr = quote.year ? `, ${quote.year}` : '';
  const html = this.getTemplate('quote')({ text: quote.text, author: quote.author, year: yearStr });
  // вставить после счётчика в DOM
}

toggleQuote() {
  const el = this.element.querySelector('.daily-quote');
  if (el) {
    el.style.display = this.showQuote ? '' : 'none';
  } else if (this.showQuote) {
    this.renderQuote();
  }
}
```

---

### Задача 5: Стили в `css/style.css`

```css
/* Цитата дня */
.daily-quote {
  margin: 2.5rem auto 0;
  max-width: 600px;
  text-align: center;
  animation: fadeIn 0.5s ease;
}

.quote-text {
  font-style: italic;
  font-size: 1.1rem;
  color: #888;
  margin: 0 0 0.5rem;
  line-height: 1.5;
}

.quote-attribution {
  font-size: 0.9rem;
  color: #B0B5B9;
}

.quote-author {
  font-style: normal;
}

.quote-year {
  color: #C8CDD1;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Кнопка переключения цитаты */
.quote-toggle {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  opacity: 0.25;
  padding: 0.25rem;
  transition: opacity 0.2s;
  color: inherit;
}

.quote-toggle:hover {
  opacity: 0.8;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .quote-text { color: rgba(255,255,255,0.4); }
  .quote-attribution { color: rgba(255,255,255,0.3); }
  .quote-year { color: rgba(255,255,255,0.2); }
}
```

---

### Задача 6: Тесты в `app/app.test.js`

```js
describe('hashDay', () => {
  it('is deterministic', () => {
    expect(hashDay('2026-01-01')).toBe(hashDay('2026-01-01'));
  });
  it('differs for different days', () => {
    expect(hashDay('2026-01-01')).not.toBe(hashDay('2026-01-02'));
  });
  it('is non-negative', () => {
    expect(hashDay('2026-12-31')).toBeGreaterThanOrEqual(0);
  });
});

describe('getQuoteOfTheDay', () => {
  const quotes = [
    { text: 'A', author: 'X' },
    { text: 'B', author: 'Y', year: 2000 },
  ];

  it('returns a quote with text and author', () => {
    const q = getQuoteOfTheDay(quotes);
    expect(q).toHaveProperty('text');
    expect(q).toHaveProperty('author');
  });
  it('is stable for the same date', () => {
    const d = new Date('2026-04-14');
    expect(getQuoteOfTheDay(quotes, d)).toEqual(getQuoteOfTheDay(quotes, d));
  });
  it('varies across 365 days with 1000 quotes (no single quote > 5%)', () => {
    // checked via count distribution test
  });
});
```

---

## Ограничения и решения

| Проблема | Решение |
|----------|---------|
| CSP запрещает внешние запросы | Цитаты встроены статически в `app/quotes.js` |
| Нет года у многих цитат | `year` опциональный, скрывается если отсутствует |
| Повторения при малом числе цитат | Цель 1000+ цитат, хеш даёт равномерное распределение |
| Размер файла | ~1000 цитат × ~120 байт ≈ ~120 КБ, приемлемо для расширения |

---

## Порядок реализации

1. `app/quotes.js` — данные (самое трудоёмкое, ручная/скриптовая сборка)
2. `app/daily-quote.js` — логика выбора
3. Тесты для шага 2
4. `dashboard.html` — шаблон цитаты + кнопка
5. `app/app.js` — интеграция
6. `css/style.css` — стили