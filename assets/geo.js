class GeoDialog extends HTMLElement {
  constructor() {
    super();

    const geoData = JSON.parse(localStorage.getItem('geolocation'));

    if (!geoData || Date.now() > geoData.expires) {
      localStorage.removeItem('geolocation');
      this.open();
    } else {
      this.close();
    }

    this.modal = this.querySelector('#modal--geo');

    this.flag = this.querySelector('.geo-flag');
    this.select = this.querySelector('form select');
    this.selectFlag = this.querySelector('.geo-select-flag');
    this.selectDefaultOption = this.select.options[0].value;

    this.currency = this.querySelector('.geo-currency span');
    this.countryName = this.querySelectorAll('.geo-country-name span');
    this.info = this.querySelector('.geo-info');
    this.geoSelect = this.querySelector('.geo-select');
    this.buttonSwitch = this.querySelectorAll('.button-switch');

    this.querySelector('.backdrop').addEventListener('click', this.close.bind(this));
    this.querySelector('.button-close').addEventListener('click', this.close.bind(this));

    this.buttonSwitch.forEach((button) => button.addEventListener('click', this.toggleSwitch.bind(this)));

    this.select.addEventListener('change', this.selectChange.bind(this));

    this.form = this.querySelector('form');
    this.form.addEventListener('submit', this.submit.bind(this));

    this.regions = new Intl.DisplayNames(['en'], { type: 'region' });
  }

  toggleSwitch() {
    this.info.classList.toggle('active');
    this.geoSelect.classList.toggle('active');

    this.select.value = this.selectDefaultOption;
    this.selectFlag.src = `https://cdn.shopify.com/static/images/flags/${this.selectDefaultOption.toLowerCase()}.svg`;
  }

  close() {
    this.classList.remove('active');
    this.modal.setAttribute('aria-hidden', true);
  }

  open() {
    const openModal = (countryCode) => {
      this.updateCountry(countryCode || 'PL');
      this.classList.add('active');
      this.modal.setAttribute('aria-hidden', false);

      setTimeout(() => {
        const firstInput = this.querySelector('form input, form select, form button');
        if (firstInput) firstInput.focus();
      }, 100);
    };

    fetch(window.Shopify.routes.root + 'browsing_context_suggestions.json?...')
      .then((response) => {
        if (!response.ok) throw new Error('Error fetching geo information');
        return response.json();
      })
      .then((r) => {
        const countryCode = r?.detected_values?.country?.handle;
        if (!countryCode) throw new Error('Invalid response format');

        openModal(countryCode);
      })
      .catch((error) => {
        console.error('GeoDialog Error:', error);

        openModal();
      });
  }

  selectChange() {
    const option = this.select.querySelector(`option[value="${this.select.value}"]`);
    if (!option) return;
    this.selectFlag.src = `https://cdn.shopify.com/static/images/flags/${option.value.toLowerCase()}.svg`;
  }

  updateOptions() {
    const options = Array.from(this.select.options);

    const getSymbol = (c) =>
      (0).toLocaleString(c === 'PLN' ? 'pl-PL' : 'en-GB', { style: 'currency', currency: c }).replace(/\d|[,. ]/g, '');

    const fragment = document.createDocumentFragment();
    options.forEach((option) => {
      const newOption = option.cloneNode(true);
      newOption.innerHTML = `${this.regions.of(option.value)} (${newOption.dataset.currency} - ${getSymbol(
        newOption.dataset.currency
      )})`;
      fragment.appendChild(newOption);
    });

    this.select.innerHTML = '';
    this.select.appendChild(fragment);
  }

  updateCountry(code) {
    const flagSrc = `https://cdn.shopify.com/static/images/flags/${code.toLowerCase()}.svg`;
    this.flag.src = flagSrc;
    this.selectFlag.src = flagSrc;
    this.flag.style.opacity = '1';

    requestAnimationFrame(() => {
      this.countryName.forEach((element) => (element.textContent = this.regions.of(code)));
      this.currency.textContent = window.geo.currencies[code];
      this.select.value = code;
      this.selectDefaultOption = code;
      this.updateOptions();
    });
  }

  submit(event) {
    event.preventDefault();

    localStorage.setItem(
      'geolocation',
      JSON.stringify({
        country: this.select.value,
        expires: Date.now() + 24 * 60 * 60 * 1000,
      })
    );

    if (this.form.dataset.mode === 'redirect') {
      //redirect logic goes here
    } else {
      //currency change logic goes here
    }

    //just for preview, can be deleted after redirect/currency change logic is implemented
    this.close();
  }
}

customElements.define('geo-dialog', GeoDialog);
