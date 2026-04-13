import { getQuoteOfTheDay } from './daily-quote.js';
import { QUOTES } from './quotes.js';

export const MILLISECONDS_PER_YEAR = 365.2425 * 24 * 60 * 60 * 1000; // Gregorian year

export function calculateAge(dob, now = new Date()) {
  const duration = now - dob;
  const years = duration / MILLISECONDS_PER_YEAR;
  const [yearPart, decimalPart] = years.toFixed(9).split('.');
  return { yearPart, decimalPart };
}

export function calculateCountdown(target, now = new Date()) {
  const duration = target - now;
  if (duration <= 0) return { yearPart: '0', decimalPart: '000000000' };
  const years = duration / MILLISECONDS_PER_YEAR;
  const [yearPart, decimalPart] = years.toFixed(9).split('.');
  return { yearPart, decimalPart };
}

export function endOfYear(now = new Date()) {
  return new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
}

export class TemplateEngine {
  static compile(template) {
    return (data = {}) => template.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] ?? '');
  }
}

export class App {
  constructor(element) {
    this.element = element;
    this.rafId = null;
    this.dob = null;
    this.yearEl = null;
    this.msEl = null;
    this.showQuote = true;
    this.mode = 'age'; // 'age' | 'countdown-year' | 'countdown-date'
    this.countdownDate = null; // Date object for countdown-date mode
    this.counterSize = 'medium'; // 'small' | 'medium' | 'large'

    this.load();
    this.loadConfig();
    this.element.addEventListener('submit', this.handleSubmit.bind(this));

    if (this.dob) {
      this.renderAgeLoop();
    } else {
      this.renderChoose();
    }

    this.setupSettings();
  }

  load() {
    const storedDob = localStorage.getItem('dob');
    if (storedDob) {
      const timestamp = parseInt(storedDob, 10);
      if (!isNaN(timestamp)) {
        this.dob = new Date(timestamp);
      }
    }
  }

  loadConfig() {
    this.showQuote = localStorage.getItem('showQuote') !== '0';
    this.mode = localStorage.getItem('mode') || 'age';
    this.counterSize = localStorage.getItem('counterSize') || 'medium';
    this.applyCounterSize();
    const cdTs = localStorage.getItem('countdownDate');
    if (cdTs) {
      const d = new Date(parseInt(cdTs, 10));
      if (!isNaN(d)) this.countdownDate = d;
    }
  }

  saveConfig() {
    localStorage.setItem('showQuote', this.showQuote ? '1' : '0');
    localStorage.setItem('mode', this.mode);
    localStorage.setItem('counterSize', this.counterSize);
    if (this.countdownDate) {
      localStorage.setItem('countdownDate', this.countdownDate.getTime().toString());
    }
  }

  save() {
    if (this.dob) {
      localStorage.setItem('dob', this.dob.getTime().toString());
    }
  }

  handleSubmit(event) {
    event.preventDefault();

    const input = this.element.querySelector('input[type="date"]');
    if (!input?.valueAsDate) return;

    this.dob = input.valueAsDate;
    this.save();
    this.renderAgeLoop();
  }

  renderChoose() {
    this.element.innerHTML = this.getTemplate('dob')();
    const input = this.element.querySelector('input[type="date"]');
    if (input) {
      input.max = new Date().toISOString().slice(0, 10);
    }
  }

  getLabel() {
    if (this.mode === 'countdown-year') {
      return `UNTIL DEC 31, ${new Date().getFullYear()}`;
    }
    if (this.mode === 'countdown-date' && this.countdownDate) {
      return `UNTIL ${this.countdownDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}`;
    }
    return 'AGE';
  }

  renderAgeLoop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }

    this.element.innerHTML = this.getTemplate('age')({ label: this.getLabel(), year: '', milliseconds: '' });
    this.yearEl = this.element.querySelector('.year');
    this.msEl = this.element.querySelector('.milliseconds');

    if (this.showQuote) {
      this.renderQuote();
    }

    this.updateSettingsUI();

    const tick = () => {
      let result;
      if (this.mode === 'countdown-year') {
        result = calculateCountdown(endOfYear());
      } else if (this.mode === 'countdown-date' && this.countdownDate) {
        result = calculateCountdown(this.countdownDate);
      } else {
        result = calculateAge(this.dob);
      }
      if (this.yearEl) this.yearEl.textContent = result.yearPart;
      if (this.msEl) this.msEl.textContent = result.decimalPart;
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  renderQuote() {
    const quote = getQuoteOfTheDay(QUOTES);
    const yearStr = quote.year ? `, ${quote.year}` : '';
    const html = this.getTemplate('quote')({
      text: quote.text,
      author: quote.author,
      year: yearStr,
    });
    this.element.insertAdjacentHTML('beforeend', html);
  }

  applyCounterSize() {
    document.body.classList.remove('size-small', 'size-medium', 'size-large');
    document.body.classList.add(`size-${this.counterSize}`);
  }

  updateSettingsUI() {
    const checkbox = document.getElementById('settings-quote-toggle');
    if (checkbox) checkbox.checked = this.showQuote;

    const radios = document.querySelectorAll('input[name="mode"]');
    radios.forEach(r => { r.checked = r.value === this.mode; });

    const cdInput2 = document.getElementById('settings-countdown-date');
    if (cdInput2) cdInput2.hidden = this.mode !== 'countdown-date';

    const cdInput = document.getElementById('settings-countdown-date');
    if (cdInput && this.countdownDate) {
      cdInput.value = this.countdownDate.toISOString().slice(0, 10);
    }
  }

  setupSettings() {
    const btn = document.getElementById('settings-btn');
    const overlay = document.getElementById('settings-overlay');
    const closeBtn = document.getElementById('settings-close');
    const doneBtn = document.getElementById('settings-done');
    const saveBtn = document.getElementById('settings-save');
    const dobInput = document.getElementById('settings-dob');
    const quoteCheckbox = document.getElementById('settings-quote-toggle');
    const cdInput = document.getElementById('settings-countdown-date');
    const sizeOptions = document.querySelectorAll('.size-option');

    if (!btn || !overlay) return;

    // Populate current dob
    if (dobInput && this.dob) {
      dobInput.value = this.dob.toISOString().slice(0, 10);
    }
    if (dobInput) {
      dobInput.max = new Date().toISOString().slice(0, 10);
    }
    if (cdInput) {
      cdInput.min = new Date().toISOString().slice(0, 10);
    }
    this.updateSettingsUI();

    btn.addEventListener('click', () => {
      overlay.hidden = false;
    });

    const closePanel = () => { overlay.hidden = true; };
    closeBtn?.addEventListener('click', closePanel);
    doneBtn?.addEventListener('click', closePanel);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.hidden = true;
    });

    // DOB save
    saveBtn?.addEventListener('click', () => {
      if (!dobInput?.value) return;
      const newDob = new Date(dobInput.value);
      if (isNaN(newDob) || newDob > new Date()) return;
      this.dob = newDob;
      this.save();
      closePanel();
      this.renderAgeLoop();
    });

    // Quote toggle
    quoteCheckbox?.addEventListener('change', () => {
      this.showQuote = quoteCheckbox.checked;
      this.saveConfig();
      const existing = this.element.querySelector('.daily-quote');
      if (this.showQuote && !existing && this.dob) {
        this.renderQuote();
      } else if (!this.showQuote && existing) {
        existing.remove();
      }
    });

    // Mode radio buttons
    document.querySelectorAll('input[name="mode"]').forEach(radio => {
      radio.addEventListener('change', () => {
        this.mode = radio.value;

        if (cdInput) cdInput.hidden = this.mode !== 'countdown-date';

        // For countdown-date, require a date before applying
        if (this.mode === 'countdown-date') {
          if (!this.countdownDate && !cdInput?.value) return;
          if (cdInput?.value) {
            this.countdownDate = new Date(cdInput.value);
          }
        }

        this.saveConfig();
        if (this.dob || this.mode !== 'age') this.renderAgeLoop();
      });
    });

    // Counter size buttons
    const updateSizeButtons = () => {
      sizeOptions.forEach(btn => {
        btn.classList.toggle('size-option--active', btn.dataset.size === this.counterSize);
      });
    };
    updateSizeButtons();

    sizeOptions.forEach(btn => {
      btn.addEventListener('click', () => {
        this.counterSize = btn.dataset.size;
        this.saveConfig();
        this.applyCounterSize();
        updateSizeButtons();
      });
    });

    // Countdown date input change
    cdInput?.addEventListener('change', () => {
      if (!cdInput.value) return;
      this.countdownDate = new Date(cdInput.value);
      this.saveConfig();
      if (this.mode === 'countdown-date') this.renderAgeLoop();
    });
  }

  getTemplate(name) {
    const templateElement = document.getElementById(`${name}-template`);
    return TemplateEngine.compile(templateElement.innerHTML);
  }

  destroy() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}

// Self-initialize in browser (module scripts are deferred, DOM is ready)
if (typeof document !== 'undefined') {
  const appElement = document.getElementById('app');
  if (appElement) new App(appElement);
}
