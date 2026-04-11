export const MILLISECONDS_PER_YEAR = 365.2425 * 24 * 60 * 60 * 1000; // Gregorian year

export function calculateAge(dob, now = new Date()) {
  const duration = now - dob;
  const years = duration / MILLISECONDS_PER_YEAR;
  const [yearPart, decimalPart] = years.toFixed(9).split('.');
  return { yearPart, decimalPart };
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

    this.load();
    this.element.addEventListener('submit', this.handleSubmit.bind(this));

    if (this.dob) {
      this.renderAgeLoop();
    } else {
      this.renderChoose();
    }
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
  }

  renderAgeLoop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }

    this.element.innerHTML = this.getTemplate('age')({ year: '', milliseconds: '' });
    this.yearEl = this.element.querySelector('.year');
    this.msEl = this.element.querySelector('.milliseconds');

    const tick = () => {
      const { yearPart, decimalPart } = calculateAge(this.dob);
      if (this.yearEl) this.yearEl.textContent = yearPart;
      if (this.msEl) this.msEl.textContent = decimalPart;
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
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
