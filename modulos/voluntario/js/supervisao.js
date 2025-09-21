// AQUI ESTÁ A MUDANÇA: Importa do novo arquivo 'utils.js'
import { loadHTML } from './utils.js';

// Mapeamento de abas para arquivos
const tabContent = {
    'ficha-supervisao': 'ficha-supervisao.html',
    'meus-acompanhamentos': 'fichas-supervisao.html',
    'ver-supervisores': 'ver-supervisores.html'
};

// Mapeamento de abas para scripts
const tabScripts = {
    'ficha-supervisao': '../js/ficha-supervisao.js',
    'meus-acompanhamentos': '../js/fichas-supervisao.js',
    'ver-supervisores': '../js/ver-supervisores.js'
};

let db, user, userData;

export function init(dbRef, userRef, userDataRef) {
    db = dbRef;
    user = userRef;
    userData = userDataRef;

    console.log("Módulo de Supervisão (com abas) inicializado.");

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

    const tabs = document.querySelectorAll('#supervisao-tabs .tab-link');
    tabs.forEach(tab => tab.classList.remove('active'));
    clickedTab.classList.add('active');

    const tabName = clickedTab.dataset.tab;
    loadTabContent(tabName);
}

async function loadTabContent(tabName) {
    const contentArea = document.getElementById('supervisao-content');
    if (!contentArea) {
        console.error('Área de conteúdo #supervisao-content não encontrada.');
        return;
    }

    const oldScript = document.querySelector('script[data-module-script]');
    if (oldScript) {
        oldScript.remove();
    }
    
    contentArea.innerHTML = '<div class="loading-spinner"></div>';

    const htmlFile = tabContent[tabName];
    if (!htmlFile) {
        contentArea.innerHTML = '<p>Conteúdo não encontrado.</p>';
        return;
    }

    try {
        // Agora usa o loadHTML importado de utils.js
        const html = await loadHTML(htmlFile);
        contentArea.innerHTML = html;

        const scriptFile = tabScripts[tabName];
        if (scriptFile) {
            const module = await import(scriptFile);
            if (module.init) {
                // Adiciona um data-attribute para identificar o script do módulo carregado
                const scriptElement = document.createElement('script');
                scriptElement.type = 'module';
                scriptElement.dataset.moduleScript = tabName;
                scriptElement.innerHTML = `
                    import * as currentModule from '${scriptFile}';
                    // Você pode chamar a função init aqui se precisar de um escopo isolado
                `;
                document.body.appendChild(scriptElement);

                // Inicializa o módulo
                module.init(db, user, userData);
            }
        }
    } catch (error) {
        console.error(`Erro ao carregar a aba ${tabName}:`, error);
        contentArea.innerHTML = '<p>Ocorreu um erro ao carregar o conteúdo. Tente novamente.</p>';
    }
}