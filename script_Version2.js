// ============================================================================
// SERVICE WORKER REGISTRATION & PWA INSTALL
// ============================================================================

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker. register('service-worker.js')
            .then(registration => {
                console.log('[SillyBrowser] Service Worker registered successfully');
                
                // Check for updates periodically
                setInterval(() => {
                    registration.update();
                }, 60000); // Check every minute
            })
            .catch(error => {
                console.log('[SillyBrowser] Service Worker registration failed:', error);
            });
    });

    // Handle install prompt
    let deferredPrompt;
    const installBtn = document.getElementById('installBtn');

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (installBtn) {
            installBtn.style.display = 'block';
        }
    });

    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console. log(`User response to the install prompt: ${outcome}`);
                deferredPrompt = null;
                installBtn.style.display = 'none';
            }
        });
    }

    window.addEventListener('appinstalled', () => {
        console.log('[SillyBrowser] App installed successfully');
        deferredPrompt = null;
    });
}

// ============================================================================
// STORAGE MANAGER
// ============================================================================

class StorageManager {
    constructor() {
        this. HISTORY_KEY = 'sillybrowser_history';
        this.BOOKMARKS_KEY = 'sillybrowser_bookmarks';
        this.SETTINGS_KEY = 'sillybrowser_settings';
        this. CACHE_KEY = 'sillybrowser_cache';
    }

    // History Management
    addToHistory(url, title, timestamp = Date.now()) {
        const history = this.getHistory();
        history.unshift({ url, title, timestamp });
        if (history.length > 1000) {
            history.pop();
        }
        localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
    }

    getHistory() {
        try {
            return JSON.parse(localStorage.getItem(this.HISTORY_KEY)) || [];
        } catch {
            return [];
        }
    }

    clearHistory() {
        localStorage.removeItem(this.HISTORY_KEY);
    }

    searchHistory(query) {
        const history = this.getHistory();
        return history.filter(item =>
            item.url.toLowerCase().includes(query.toLowerCase()) ||
            item.title.toLowerCase().includes(query.toLowerCase())
        );
    }

    // Bookmarks Management
    addBookmark(url, title, favicon) {
        const bookmarks = this.getBookmarks();
        bookmarks.unshift({ url, title, favicon, id: Date.now() });
        localStorage.setItem(this.BOOKMARKS_KEY, JSON.stringify(bookmarks));
    }

    getBookmarks() {
        try {
            return JSON.parse(localStorage.getItem(this. BOOKMARKS_KEY)) || [];
        } catch {
            return [];
        }
    }

    removeBookmark(id) {
        let bookmarks = this.getBookmarks();
        bookmarks = bookmarks.filter(b => b.id !== id);
        localStorage.setItem(this. BOOKMARKS_KEY, JSON. stringify(bookmarks));
    }

    clearBookmarks() {
        localStorage.removeItem(this. BOOKMARKS_KEY);
    }

    searchBookmarks(query) {
        const bookmarks = this.getBookmarks();
        return bookmarks. filter(item =>
            item.url.toLowerCase().includes(query.toLowerCase()) ||
            item.title.toLowerCase().includes(query.toLowerCase())
        );
    }

    isBookmarked(url) {
        return this.getBookmarks().some(b => b.url === url);
    }

    // Settings Management
    getSettings() {
        try {
            return JSON.parse(localStorage. getItem(this.SETTINGS_KEY)) || {
                homepage: 'https://www.google.com',
                searchEngine: 'google',
                enableJS: true,
                enableCookies: true
            };
        } catch {
            return {
                homepage: 'https://www.google.com',
                searchEngine: 'google',
                enableJS: true,
                enableCookies: true
            };
        }
    }

    updateSettings(settings) {
        const current = this.getSettings();
        const updated = { ...current, ... settings };
        localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(updated));
    }

    // Cache Management
    addToCache(key, value, ttl = 3600000) {
        const cache = this.getCache();
        cache[key] = {
            value,
            expires: Date.now() + ttl
        };
        localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
    }

    getFromCache(key) {
        const cache = this.getCache();
        if (cache[key]) {
            if (cache[key].expires > Date.now()) {
                return cache[key].value;
            } else {
                delete cache[key];
                this.saveCache(cache);
            }
        }
        return null;
    }

    getCache() {
        try {
            return JSON.parse(localStorage. getItem(this.CACHE_KEY)) || {};
        } catch {
            return {};
        }
    }

    saveCache(cache) {
        localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
    }

    clearCache() {
        localStorage.removeItem(this.CACHE_KEY);
    }

    getCookies() {
        return document.cookie.split(';').map(c => c.trim()).filter(c => c);
    }

    clearCookies() {
        document.cookie. split(";").forEach(c => {
            const eqPos = c.indexOf("=");
            const name = eqPos > -1 ? c.substr(0, eqPos) : c;
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        });
    }
}

const storageManager = new StorageManager();

// ============================================================================
// DEVELOPER TOOLS
// ============================================================================

class DeveloperTools {
    constructor() {
        this.isOpen = false;
        this.console = [];
        this.network = [];
        this.init();
    }

    init() {
        this.setupConsole();
        this.setupEventListeners();
        this.setupNetworkMonitoring();
    }

    setupConsole() {
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;
        const originalInfo = console.info;

        console.log = (...args) => {
            originalLog(... args);
            this.logConsole('log', args);
        };

        console.error = (...args) => {
            originalError(...args);
            this.logConsole('error', args);
        };

        console.warn = (... args) => {
            originalWarn(...args);
            this.logConsole('warn', args);
        };

        console.info = (...args) => {
            originalInfo(...args);
            this.logConsole('info', args);
        };
    }

    logConsole(type, args) {
        const message = args.map(arg => {
            if (typeof arg === 'object') {
                return JSON.stringify(arg, null, 2);
            }
            return String(arg);
        }).join(' ');

        this.console.push({
            type,
            message,
            timestamp: new Date().toLocaleTimeString()
        });

        this.updateConsoleDisplay();
    }

    updateConsoleDisplay() {
        const output = document.getElementById('consoleOutput');
        if (output) {
            output. innerHTML = this.console.map(log =>
                `<div class="console-line console-${log.type}">
                    <span class="console-time">[${log.timestamp}]</span>
                    ${log.message}
                </div>`
            ).join('');
            output.scrollTop = output.scrollHeight;
        }
    }

    setupNetworkMonitoring() {
        const originalFetch = window.fetch;
        window.fetch = (...args) => {
            const startTime = performance.now();
            const request = {
                url: args[0],
                method: (args[1]?.method) || 'GET',
                status: '.. .',
                time: 0,
                timestamp: new Date().toLocaleTimeString()
            };

            this.network.push(request);
            this.updateNetworkDisplay();

            return originalFetch. apply(window, args)
                .then(response => {
                    request.status = response.status;
                    request.time = Math.round(performance.now() - startTime);
                    this.updateNetworkDisplay();
                    return response;
                })
                .catch(error => {
                    request.status = 'Error';
                    request.time = Math.round(performance.now() - startTime);
                    this.updateNetworkDisplay();
                    throw error;
                });
        };
    }

    updateNetworkDisplay() {
        const log = document.getElementById('networkLog');
        if (log) {
            log.innerHTML = this.network.map(entry =>
                `<div class="network-entry ${entry.status === 'Error' ? 'error' : ''}">
                    <strong>${entry.method}</strong> ${entry.url} - 
                    <span>${entry.status}</span> ${entry.time}ms
                    <span class="console-time">[${entry.timestamp}]</span>
                </div>`
            ).join('');
        }
    }

    toggle() {
        this.isOpen = !this.isOpen;
        const panel = document.getElementById('devtoolsPanel');
        panel.classList.toggle('active', this.isOpen);
    }

    setupEventListeners() {
        // This will be called after DOM loads
    }

    executeJavaScript(code) {
        try {
            const result = eval(code);
            this.logConsole('log', [result]);
            return result;
        } catch (error) {
            this.logConsole('error', [error. message]);
        }
    }

    updateStorageDisplay() {
        const display = document.getElementById('storageDisplay');
        if (display) {
            let html = '';

            html += '<h3>Local Storage</h3>';
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const value = localStorage. getItem(key);
                html += `<div class="storage-item"><strong>${key}:</strong> ${value}</div>`;
            }

            html += '<h3>Session Storage</h3>';
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                const value = sessionStorage.getItem(key);
                html += `<div class="storage-item"><strong>${key}:</strong> ${value}</div>`;
            }

            html += '<h3>Cookies</h3>';
            const cookies = storageManager.getCookies();
            if (cookies.length === 0) {
                html += '<div class="storage-item">No cookies</div>';
            } else {
                cookies.forEach(cookie => {
                    html += `<div class="storage-item">${cookie}</div>`;
                });
            }

            display.innerHTML = html;
        }
    }
}

const devTools = new DeveloperTools();

// ============================================================================
// HISTORY MANAGER
// ============================================================================

class HistoryManager {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const search = document.getElementById('historySearch');
        if (search) {
            search. addEventListener('input', (e) => this.displayHistory(e.target.value));
        }

        const closeBtn = document.getElementById('closeHistorySidebar');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeSidebar());
        }
    }

    displayHistory(query = '') {
        const content = document.getElementById('historyContent');
        let items = storageManager.getHistory();

        if (query) {
            items = items.filter(item =>
                item.url.toLowerCase().includes(query.toLowerCase()) ||
                item.title.toLowerCase().includes(query.toLowerCase())
            );
        }

        content.innerHTML = items.map((item) => `
            <div class="history-item" data-url="${item.url}">
                <div>${item.title || item.url}</div>
                <div class="history-time">${new Date(item.timestamp).toLocaleString()}</div>
            </div>
        `).join('');

        content.querySelectorAll('.history-item').forEach(el => {
            el.addEventListener('click', () => {
                const url = el.dataset.url;
                tabManager.navigateCurrentTab(url);
                this.closeSidebar();
            });
        });
    }

    closeSidebar() {
        const sidebar = document.getElementById('historySidebar');
        sidebar.classList.remove('active');
    }

    openSidebar() {
        const sidebar = document.getElementById('historySidebar');
        sidebar.classList.add('active');
        this.displayHistory();
    }
}

const historyManager = new HistoryManager();

// ============================================================================
// BOOKMARKS MANAGER
// ============================================================================

class BookmarksManager {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const search = document.getElementById('bookmarksSearch');
        if (search) {
            search.addEventListener('input', (e) => this.displayBookmarks(e.target.value));
        }

        const closeBtn = document. getElementById('closeBookmarksSidebar');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeSidebar());
        }
    }

    displayBookmarks(query = '') {
        const content = document.getElementById('bookmarksContent');
        const bookmarkBar = document.getElementById('bookmarksBar');
        let items = storageManager.getBookmarks();

        if (query) {
            items = items.filter(item =>
                item.url.toLowerCase().includes(query.toLowerCase()) ||
                item.title. toLowerCase().includes(query.toLowerCase())
            );
        }

        content.innerHTML = items.map(item => `
            <div class="bookmarks-item" data-id="${item.id}" data-url="${item.url}">
                <div>${item.title}</div>
                <div style="font-size: 11px; color: #999; margin-top: 4px;">${item.url}</div>
                <button class="remove-bookmark" data-id="${item.id}" style="
                    background:  #ff4444;
                    color: white;
                    border:  none;
                    padding: 4px 8px;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size:  11px;
                    margin-top: 4px;
                ">Remove</button>
            </div>
        `).join('');

        bookmarkBar.innerHTML = items.slice(0, 6).map(item => `
            <div class="bookmark-item" data-url="${item.url}" title="${item.title}">
                ${item.title. substring(0, 20)}${item.title.length > 20 ? '...' : ''}
            </div>
        `).join('');

        content.querySelectorAll('.bookmarks-item').forEach(el => {
            el.addEventListener('click', (e) => {
                if (! e.target.classList.contains('remove-bookmark')) {
                    const url = el.dataset.url;
                    tabManager.navigateCurrentTab(url);
                    this.closeSidebar();
                }
            });
        });

        content.querySelectorAll('.remove-bookmark').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.id);
                storageManager.removeBookmark(id);
                this.displayBookmarks(query);
            });
        });

        bookmarkBar.querySelectorAll('.bookmark-item').forEach(el => {
            el.addEventListener('click', () => {
                tabManager.navigateCurrentTab(el.dataset.url);
            });
        });
    }

    addBookmark(url, title, favicon = '📄') {
        storageManager.addBookmark(url, title, favicon);
        this.displayBookmarks();
        this.updateFavoriteButton(url);
    }

    removeBookmark(url) {
        const bookmarks = storageManager.getBookmarks();
        const bookmark = bookmarks.find(b => b.url === url);
        if (bookmark) {
            storageManager.removeBookmark(bookmark.id);
            this.displayBookmarks();
            this.updateFavoriteButton(url);
        }
    }

    updateFavoriteButton(url) {
        const btn = document.getElementById('favoriteBtn');
        if (storageManager.isBookmarked(url)) {
            btn.textContent = '★';
            btn.style.color = '#FFD700';
        } else {
            btn.textContent = '☆';
            btn.style.color = 'inherit';
        }
    }

    closeSidebar() {
        const sidebar = document.getElementById('bookmarksSidebar');
        sidebar.classList.remove('active');
    }

    openSidebar() {
        const sidebar = document.getElementById('bookmarksSidebar');
        sidebar.classList. add('active');
        this.displayBookmarks();
    }
}

const bookmarksManager = new BookmarksManager();

// ============================================================================
// TAB MANAGER
// ============================================================================

class TabManager {
    constructor() {
        this.tabs = [];
        this.currentTabId = null;
        this.nextTabId = 1;
        this.setupEventListeners();
        this.createTab('https://www.google.com');
    }

    setupEventListeners() {
        document.getElementById('newTabBtn').addEventListener('click', () => this.createTab());
        
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 't') {
                    e.preventDefault();
                    this.createTab();
                }
                if (e.key === 'w') {
                    e.preventDefault();
                    this.closeCurrentTab();
                }
                if (e.key === 'n') {
                    e. preventDefault();
                    this.openNewWindow();
                }
            }
        });
    }

    createTab(url = null) {
        const tabId = this.nextTabId++;
        const tab = {
            id: tabId,
            url: url || 'about:blank',
            title: 'New Tab',
            history: [],
            historyIndex: -1,
            favicon: '📄'
        };

        this.tabs.push(tab);
        this.selectTab(tabId);
        this.renderTabs();

        if (url) {
            this.navigateTab(tabId, url);
        }

        return tabId;
    }

    selectTab(tabId) {
        this.currentTabId = tabId;
        this.renderTabs();
        this.updateNavigation();
    }

    closeTab(tabId) {
        const index = this.tabs.findIndex(t => t.id === tabId);
        if (index > -1) {
            this.tabs. splice(index, 1);
        }

        if (this.currentTabId === tabId) {
            if (this.tabs.length > 0) {
                this.selectTab(this.tabs[Math.max(0, index - 1)].id);
            }
        }

        if (this.tabs.length === 0) {
            this.createTab();
        }

        this.renderTabs();
    }

    closeCurrentTab() {
        if (this.currentTabId !== null) {
            this.closeTab(this.currentTabId);
        }
    }

    navigateTab(tabId, url) {
        const tab = this. tabs.find(t => t. id === tabId);
        if (tab) {
            tab.url = this.normalizeUrl(url);
            tab.history.push(tab.url);
            tab.historyIndex = tab.history.length - 1;
            
            if (tabId === this.currentTabId) {
                this.loadPage(tab.url);
            }
        }
    }

    navigateCurrentTab(url) {
        if (this.currentTabId !== null) {
            this.navigateTab(this.currentTabId, url);
        }
    }

    normalizeUrl(url) {
        if (! url) return 'about:blank';
        
        if (! url.includes('. ') && !url.includes('://')) {
            const settings = storageManager.getSettings();
            const searchEngines = {
                'google': 'https://www.google.com/search?q=',
                'bing': 'https://www.bing.com/search?q=',
                'duckduckgo': 'https://duckduckgo.com/? q='
            };
            const engine = searchEngines[settings.searchEngine] || searchEngines.google;
            return engine + encodeURIComponent(url);
        }
        
        if (! url.includes('://')) {
            return 'https://' + url;
        }
        
        return url;
    }

    goBack(tabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (tab && tab.historyIndex > 0) {
            tab.historyIndex--;
            if (tabId === this.currentTabId) {
                this.loadPage(tab.history[tab.historyIndex]);
            }
        }
    }

    goForward(tabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (tab && tab.historyIndex < tab.history.length - 1) {
            tab.historyIndex++;
            if (tabId === this.currentTabId) {
                this.loadPage(tab.history[tab.historyIndex]);
            }
        }
    }

    reload(tabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (tab && tabId === this.currentTabId) {
            this.loadPage(tab. url);
        }
    }

    loadPage(url) {
        const input = document.getElementById('addressInput');
        input.value = url;

        const currentTab = this.tabs.find(t => t.id === this. currentTabId);
        if (currentTab) {
            currentTab.url = url;
            storageManager.addToHistory(url, url);
        }

        const browserView = document.getElementById('browserView');
        
        if (url === 'about:blank') {
            browserView.innerHTML = '<div style="padding: 40px; text-align: center; color: #999;"><h2>New Tab</h2></div>';
        } else {
            const loadingBar = document.getElementById('loadingBar');
            loadingBar.classList.add('loading');

            browserView.innerHTML = `
                <iframe src="${url}" style="width: 100%; height:  100%; border: none;" 
                        onload="document.getElementById('loadingBar').classList.remove('loading');
                                document.getElementById('loadingBar').classList.add('complete');
                                setTimeout(() => document.getElementById('loadingBar').classList.remove('complete'), 1000);"
                        onerror="document.getElementById('loadingBar').classList.remove('loading');
                                 document.getElementById('browserView').innerHTML = '<div style=\"padding: 40px; color: #999;\"><h2>Error</h2><p>Could not load page.  Make sure the URL is correct.</p></div>';">
                </iframe>
            `;
        }
    }

    renderTabs() {
        const container = document.getElementById('tabsContainer');
        container.innerHTML = this.tabs.map(tab => `
            <div class="tab ${tab.id === this.currentTabId ? 'active' : ''}" data-tab-id="${tab.id}">
                <span class="tab-title">${tab.title || 'New Tab'}</span>
                <button class="tab-close" data-tab-id="${tab.id}">×</button>
            </div>
        `).join('');

        container.querySelectorAll('.tab').forEach(el => {
            el.addEventListener('click', () => {
                this.selectTab(parseInt(el.dataset.tabId));
            });
        });

        container.querySelectorAll('.tab-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e. stopPropagation();
                this.closeTab(parseInt(btn.dataset.tabId));
            });
        });
    }

    updateNavigation() {
        const currentTab = this.tabs. find(t => t.id === this.currentTabId);
        const backBtn = document.getElementById('backBtn');
        const forwardBtn = document.getElementById('forwardBtn');

        if (currentTab) {
            backBtn.disabled = currentTab.historyIndex <= 0;
            forwardBtn.disabled = currentTab.historyIndex >= currentTab.history.length - 1;
            document.getElementById('addressInput').value = currentTab.url;
        }
    }

    openNewWindow() {
        this.createTab();
    }

    getCurrentTab() {
        return this. tabs.find(t => t. id === this.currentTabId);
    }
}

const tabManager = new TabManager();

// ============================================================================
// MAIN BROWSER APPLICATION
// ============================================================================

class SillyBrowser {
    constructor() {
        this.setupEventListeners();
        this.loadSettings();
    }

    setupEventListeners() {
        // Navigation buttons
        document.getElementById('backBtn').addEventListener('click', () => {
            tabManager.goBack(tabManager. currentTabId);
            tabManager.updateNavigation();
        });

        document.getElementById('forwardBtn').addEventListener('click', () => {
            tabManager.goForward(tabManager.currentTabId);
            tabManager.updateNavigation();
        });

        document.getElementById('reloadBtn').addEventListener('click', () => {
            tabManager.reload(tabManager.currentTabId);
        });

        document.getElementById('stopBtn').addEventListener('click', () => {
            const loadingBar = document.getElementById('loadingBar');
            loadingBar.classList.remove('loading');
        });

        // Address bar
        const addressInput = document.getElementById('addressInput');
        addressInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                tabManager.navigateCurrentTab(addressInput.value);
            }
        });

        // Favorite button
        document.getElementById('favoriteBtn').addEventListener('click', () => {
            const tab = tabManager.getCurrentTab();
            if (tab) {
                if (storageManager.isBookmarked(tab.url)) {
                    bookmarksManager.removeBookmark(tab.url);
                } else {
                    bookmarksManager.addBookmark(tab.url, tab.title);
                }
            }
        });

        // Settings
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.openSettings();
        });

        document.getElementById('closeSettings').addEventListener('click', () => {
            this.closeSettings();
        });

        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target. id === 'settingsModal') {
                this.closeSettings();
            }
        });

        // Settings buttons
        document.getElementById('clearHistoryBtn').addEventListener('click', () => {
            if (confirm('Clear all history?')) {
                storageManager.clearHistory();
                alert('History cleared');
            }
        });

        document.getElementById('clearCacheBtn').addEventListener('click', () => {
            if (confirm('Clear cache?')) {
                storageManager.clearCache();
                alert('Cache cleared');
            }
        });

        document.getElementById('clearCookiesBtn').addEventListener('click', () => {
            if (confirm('Clear all cookies?')) {
                storageManager.clearCookies();
                alert('Cookies cleared');
            }
        });

        // Developer Tools
        document.getElementById('devToolsBtn').addEventListener('click', () => {
            devTools.toggle();
        });

        document.getElementById('closeDevtools').addEventListener('click', () => {
            devTools.toggle();
        });

        // Developer tools tabs
        document.querySelectorAll('.devtools-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.devtools-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.devtools-tab-content').forEach(c => c.classList.remove('active'));
                
                e.target.classList.add('active');
                const tabName = e.target.dataset.tab;
                document.getElementById(tabName + 'Tab').classList.add('active');

                if (tabName === 'storage') {
                    devTools.updateStorageDisplay();
                }
            });
        });

        // Console input
        const consoleInput = document.getElementById('consoleInput');
        if (consoleInput) {
            consoleInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const code = consoleInput.value;
                    consoleInput.value = '';
                    devTools.executeJavaScript(code);
                }
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F12') {
                e.preventDefault();
                devTools.toggle();
            }
            
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'r') {
                    e.preventDefault();
                    tabManager.reload(tabManager.currentTabId);
                }
            }

            if (e.altKey) {
                if (e.key === 'ArrowLeft') {
                    tabManager.goBack(tabManager. currentTabId);
                }
                if (e.key === 'ArrowRight') {
                    tabManager.goForward(tabManager.currentTabId);
                }
            }
        });
    }

    loadSettings() {
        const settings = storageManager.getSettings();
        document.getElementById('homepageInput').value = settings.homepage;
        document.getElementById('searchEngineSelect').value = settings.searchEngine;
        document.getElementById('enableJsCheckbox').checked = settings.enableJS;
        document.getElementById('enableCookiesCheckbox').checked = settings.enableCookies;

        document.getElementById('homepageInput').addEventListener('change', (e) => {
            storageManager.updateSettings({ homepage: e.target.value });
        });

        document.getElementById('searchEngineSelect').addEventListener('change', (e) => {
            storageManager.updateSettings({ searchEngine: e.target.value });
        });

        document.getElementById('enableJsCheckbox').addEventListener('change', (e) => {
            storageManager.updateSettings({ enableJS: e.target.checked });
        });

        document. getElementById('enableCookiesCheckbox').addEventListener('change', (e) => {
            storageManager. updateSettings({ enableCookies:  e.target.checked });
        });
    }

    openSettings() {
        const modal = document.getElementById('settingsModal');
        modal.classList.add('active');
    }

    closeSettings() {
        const modal = document.getElementById('settingsModal');
        modal.classList.remove('active');
    }
}

// Initialize the browser when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const browser = new SillyBrowser();
    tabManager.loadPage('https://www.google.com');
    bookmarksManager.displayBookmarks();
});