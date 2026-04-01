document.addEventListener('alpine:init', () => {
    const defaultLocale = localStorage.getItem('o8_locale') || 'en';

    Alpine.store('i18n', {
        locale: defaultLocale,
        content: {},
        loaded: false,
        loading: false,
        _v: 0, // version counter — incrementing this forces Alpine to re-evaluate all t() calls

        async init() {
            await this.loadContent();
        },

        async setLocale(lang) {
            if (this.locale === lang && this.loaded) return;
            this.loading = true;
            this.locale = lang;
            localStorage.setItem('o8_locale', lang);
            await this.loadContent();
            this.loading = false;
            window.dispatchEvent(new CustomEvent('locale-changed', { detail: lang }));
        },

        async loadContent() {
            let path = window.location.pathname;
            if (path.endsWith('.html')) path = path.substring(0, path.lastIndexOf('/') + 1);
            if (!path.endsWith('/')) path += '/';

            this.loading = true;
            try {
                const filename = (this.locale === 'en') ? 'content.json' : `data.${this.locale}.json`;

                let currentDir = path;
                let success = false;
                let newContent = null;

                while (currentDir !== '') {
                    const fullUrl = `${window.location.origin}${currentDir}${filename}`;
                    const response = await fetch(fullUrl);
                    if (response.ok) {
                        newContent = await response.json();
                        success = true;
                        break;
                    }
                    if (currentDir === '/') break;
                    const parts = currentDir.split('/').filter(p => p);
                    parts.pop();
                    currentDir = '/' + parts.join('/') + (parts.length > 0 ? '/' : '');
                }

                if (!success && this.locale !== 'en') {
                    const fbResponse = await fetch(`${window.location.origin}/content.json`);
                    if (fbResponse.ok) newContent = await fbResponse.json();
                }

                if (newContent) {
                    // Mutate the existing reactive object rather than replacing the reference.
                    // This guarantees Alpine detects the change and re-evaluates all t() bindings.
                    Object.keys(this.content).forEach(k => delete this.content[k]);
                    Object.assign(this.content, newContent);
                    // Also bump the version counter so any t() expression that reads _v re-evaluates.
                    this._v++;
                }
            } catch (e) {
                console.error('i18n: Translation error:', e);
            }
            this.loaded = true;
            this.loading = false;
        },

        t(key) {
            void this._v; // declare dependency on version so Alpine re-runs this when content changes
            if (!this.content || Object.keys(this.content).length === 0) return '';
            const val = key.split('.').reduce((o, i) => (o ? o[i] : null), this.content);
            return val || '';
        }
    });
});
