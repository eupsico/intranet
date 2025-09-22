const tabContent = {
    'ficha-supervisao': 'ficha-supervisao.html',
    'meus-acompanhamentos': 'fichas-preenchidas.html',
    'ver-supervisores': 'ver-supervisores.html'
};
const tabScripts = {
    'ficha-supervisao': './ficha-supervisao.js',
    'meus-acompanhamentos': './fichas-preenchidas.js',
    'ver-supervisores': './ver-supervisores.js'
};
const tabCSS = {
    'ficha-supervisao': '../css/ficha-supervisao.css',
    'meus-acompanhamentos': '../css/fichas-preenchidas.css',
    'ver-supervisores': '../css/supervisores.css'
};

let db, user, userData;

function loadCSS(path) {
    if (!path) return;
    const cssId = `css-${path.split('/').pop().replace('.css', '')}`;
    if (!document.getElementById(cssId)) {
        const link = document.createElement('link');
        link.id = cssId;
        link.rel = 'stylesheet';
        link.href = path;
        document.head.appendChild(link);
    }
}

// ===== NOVA FUNÇÃO =====
// Esta função permite que um módulo filho (como a lista) navegue para outra aba
function navigateToTab(tabName, param = null) {
    const tabButton = document.querySelector(`.tab-link[data-tab="${tabName}"]`);
    if (tabButton) {
        document.querySelectorAll('#supervisao-tabs .tab-link').forEach(tab => tab.classList.remove('active'));
        tabButton.classList.add('active');
        loadTabContent(tabName, param);
    }
}

export function init(dbRef, userRef, userDataRef) {
    db = dbRef;
    user = userRef;
    userData = userDataRef;
    
    const tabsContainer = document.getElementById('supervisao-tabs');
    if (tabsContainer) {
        tabsContainer.addEventListener('click', (event) => {
            const clickedTab = event.target.closest('.tab-link');
            if (!clickedTab) return;
            event.preventDefault();
            navigateToTab(clickedTab.dataset.tab);
        });
        const initialTab = tabsContainer.querySelector('.tab-link.active');
        if (initialTab) {
            loadTabContent(initialTab.dataset.tab);
        }
    }
}

// A função agora aceita um parâmetro (o ID da ficha)
async function loadTabContent(tabName, param = null) {
    const contentArea = document.getElementById('supervisao-content');
    if (!contentArea) return;

    contentArea.innerHTML = '<div class="loading-spinner"></div>';
    loadCSS(tabCSS[tabName]);

    const htmlFile = `../page/${tabContent[tabName]}`;
    const scriptFile = tabScripts[tabName];

    try {
        const response = await fetch(htmlFile);
        if (!response.ok) throw new Error(`Arquivo HTML não encontrado: ${htmlFile}`);
        contentArea.innerHTML = await response.text();

        if (scriptFile) {
            const module = await import(scriptFile);
            if (module.init) {
                // Passa o db, user, o parâmetro e a função de navegação para o módulo filho
                module.init(db, user, userData, param, navigateToTab);
            }
        }
    } catch (error) {
        console.error(`Erro ao carregar a aba ${tabName}:`, error);
        contentArea.innerHTML = '<p>Ocorreu um erro ao carregar este conteúdo.</p>';
    }
}