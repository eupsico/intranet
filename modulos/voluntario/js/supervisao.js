// /modulos/voluntario/js/supervisao.js (SUBSTITUIR)

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
// NOVO: Mapeamento de CSS para cada aba
const tabCSS = {
    'ficha-supervisao': '../css/ficha-supervisao.css',
    'meus-acompanhamentos': '../css/fichas-preenchidas.css',
    'ver-supervisores': '../css/supervisores.css'
};

let db, user, userData;

// Função auxiliar para carregar CSS dinamicamente
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

export function init(dbRef, userRef, userDataRef) {
    db = dbRef;
    user = userRef;
    userData = userDataRef;
    
    const tabsContainer = document.getElementById('supervisao-tabs');
    if (tabsContainer) {
        tabsContainer.addEventListener('click', handleTabClick);
        const initialTab = tabsContainer.querySelector('.tab-link.active');
        if (initialTab) {
            loadTabContent(initialTab.dataset.tab);
        }
    }
}

function handleTabClick(event) {
    const clickedTab = event.target.closest('.tab-link');
    if (!clickedTab) return;
    event.preventDefault();
    document.querySelectorAll('#supervisao-tabs .tab-link').forEach(tab => tab.classList.remove('active'));
    clickedTab.classList.add('active');
    loadTabContent(clickedTab.dataset.tab);
}

async function loadTabContent(tabName) {
    const contentArea = document.getElementById('supervisao-content');
    if (!contentArea) return;

    contentArea.innerHTML = '<div class="loading-spinner"></div>';
    
    // Carrega o CSS da aba antes de carregar o HTML
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
                module.init(db, user, userData);
            }
        }
    } catch (error) {
        console.error(`Erro ao carregar a aba ${tabName}:`, error);
        contentArea.innerHTML = '<p>Ocorreu um erro ao carregar este conteúdo.</p>';
    }
}