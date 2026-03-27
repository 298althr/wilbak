document.addEventListener('alpine:init', () => {
    const defaultLocale = localStorage.getItem('o8_locale') || 'en';
    
    Alpine.store('i18n', {
        locale: defaultLocale,
        content: {},
        loaded: false,
        loading: false,
        
        async init() {
            // Load content for the current page and locale
            await this.loadContent();
        },
        
        async setLocale(lang) {
            console.log('i18n: Setting locale to', lang);
            if (this.locale === lang && this.loaded) return;
            this.loading = true;
            this.locale = lang;
            localStorage.setItem('o8_locale', lang);
            await this.loadContent();
            this.loading = false;
            console.log('i18n: Locale updated to', lang);
            window.dispatchEvent(new CustomEvent('locale-changed', { detail: lang }));
        },
        
        async loadContent() {
            let path = window.location.pathname;
            if (path.endsWith('.html')) path = path.substring(0, path.lastIndexOf('/') + 1);
            if (!path.endsWith('/')) path += '/';
            
            this.loading = true;
            try {
                const filename = (this.locale === 'en') ? 'content.json' : `data.${this.locale}.json`;
                
                // Try fetching from current directory, then parent, up to root
                let currentDir = path;
                let success = false;
                
                while (currentDir !== '') {
                    const fullUrl = `${window.location.origin}${currentDir}${filename}`;
                    console.log('i18n: Attempting fetch from', fullUrl);
                    
                    const response = await fetch(fullUrl);
                    if (response.ok) {
                        this.content = await response.json();
                        console.log('i18n: Content loaded successfully from', currentDir);
                        success = true;
                        break;
                    }
                    
                    if (currentDir === '/') break;
                    // Move up one directory
                    const parts = currentDir.split('/').filter(p => p);
                    parts.pop();
                    currentDir = '/' + parts.join('/') + (parts.length > 0 ? '/' : '');
                }
                
                if (!success && this.locale !== 'en') {
                    console.log('i18n: Falling back to English at root...');
                    const fbResponse = await fetch(`${window.location.origin}/content.json`);
                    if (fbResponse.ok) this.content = await fbResponse.json();
                }
            } catch (e) {
                console.error('i18n: Translation error:', e);
            }
            this.loaded = true;
            this.loading = false;
        },
        
        t(key) {
            if (!this.content || Object.keys(this.content).length === 0) return '';
            const val = key.split('.').reduce((o, i) => (o ? o[i] : null), this.content);
            return val || '';
        }
    });
});
