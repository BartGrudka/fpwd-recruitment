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
    this.modal?.setAttribute('aria-hidden', true);
  }

  open() {
    const openModal = (countryCode) => {
      const option = this.select.querySelector(`option[value="${countryCode}"]`);

      if (!option) {
        const firstOption = this.select.querySelector('option').value;
        this.updateCountry(firstOption);
      } else {
        this.updateCountry(countryCode);
      }

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

  getCurrencySymbol(code) {
    return (0)
      .toLocaleString(code === 'PLN' ? 'pl-PL' : 'en-GB', { style: 'currency', currency: code })
      .replace(/\d|[,. ]/g, '')
      .trim();
  }

  updateOptions() {
    const options = Array.from(this.select.options);

    const fragment = document.createDocumentFragment();

    options.forEach((option) => {
      const newOption = option.cloneNode(true);
      newOption.innerHTML = `${this.regions.of(option.value)} (${newOption.dataset.currency} - ${this.getCurrencySymbol(
        newOption.dataset.currency
      )})`;
      fragment.appendChild(newOption);
    });

    this.select.innerHTML = '';
    this.select.appendChild(fragment);
  }

  updateCountry(code) {
    const flagSrc = `https://cdn.shopify.com/static/images/flags/${code.toLowerCase()}.svg`;

    const img = new Image();
    img.src = flagSrc;

    img.onload = () => {
      this.flag.src = flagSrc;
      this.flag.style.opacity = '1';
    };

    const currencyCode = window.geo.currencies[code];

    requestAnimationFrame(() => {
      this.countryName.forEach((element) => (element.textContent = this.regions.of(code)));
      this.currency.textContent = `${currencyCode} - ${this.getCurrencySymbol(currencyCode)}`;

      this.updateOptions();

      this.select.value = code;
      this.selectDefaultOption = code;
      this.select.dispatchEvent(new Event('change'));
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
      const redirectUrl = 'https://' + this.select.options[this.select.selectedIndex].dataset.url;
      window.location.href = redirectUrl;
    } else {
      const formData = new FormData(this.form);

      event.submitter.disabled = true;
      event.submitter.classList.add('loading');

      const activeCurrency = this.select.options[this.select.selectedIndex].dataset.currency;

      if (window.Shopify.currency.active === activeCurrency) {
        this.close();
      } else {
        fetch(window.Shopify.routes.root + 'localization', { method: 'POST', body: formData })
          .then(() => {
            window.location.reload();
          })
          .catch(() => {
            event.submitter.disabled = false;
            event.submitter.classList.remove('loading');

            alert('Something went wrong');
          });
      }
    }
  }
}

customElements.define('geo-dialog', GeoDialog);
