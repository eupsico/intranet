// Nenhuma importação aqui
let db, user, userData; // Variáveis globais para o módulo

// Mapeamento de abas para os arquivos HTML
const tabContent = {
    'ficha-supervisao': 'ficha-supervisao.html',
    'meus-acompanhamentos': 'fichas-supervisao.html',
    'ver-supervisores': 'ver-supervisores.html'
};

// Mapeamento de abas para os arquivos JS (COM O CAMINHO CORRIGIDO)
const tabScripts = {
    // AQUI ESTAVA O ERRO: O caminho foi corrigido de '../js/...' para './...'
    // Isso diz ao navegador para procurar o arquivo na mesma pasta (js), e não na pasta acima.
    'ficha-supervisao': './ficha-supervisao.js',
    'meus-acompanhamentos': './fichas-supervisao.js',
    'ver-supervisores': './ver-supervisores.js'
};

// A função de inicialização que é chamada pelo portal-voluntario.js
export function init(dbRef, userRef, userDataRef) {
    db = dbRef;
    user = userRef;
    userData = userDataRef;
    
    console.log("Módulo de Supervisão (com abas) inicializado.");

    const tabsContainer = document.getElementById('supervisao-tabs');
    if (tabsContainer) {
        tabsContainer.addEventListener('click', handleTabClick);
        // Carrega o conteúdo da primeira aba assim que o módulo é iniciado
        const initialTab = tabsContainer.querySelector('.tab-link.active');
        if (initialTab) {
            loadTabContent(initialTab.dataset.tab);
        }
    }
}

// Função para lidar com o clique na aba
function handleTabClick(event) {
    const clickedTab = event.target.closest('.tab-link');
    if (!clickedTab) return;
    event.preventDefault();

    // Remove a classe 'active' de todas as abas e a adiciona à clicada
    document.querySelectorAll('#supervisao-tabs .tab-link').forEach(tab => tab.classList.remove('active'));
    clickedTab.classList.add('active');

    // Carrega o conteúdo da aba selecionada
    const tabName = clickedTab.dataset.tab;
    loadTabContent(tabName);
}

// Função para carregar o HTML e o JS de uma aba específica
async function loadTabContent(tabName) {
    const contentArea = document.getElementById('supervisao-content');
    if (!contentArea) {
        console.error('Área de conteúdo #supervisao-content não encontrada.');
        return;
    }

    contentArea.innerHTML = '<div class="loading-spinner"></div>';
    const htmlFile = `../page/${tabContent[tabName]}`; // Caminho para o arquivo HTML
    const scriptFile = tabScripts[tabName]; // Caminho para o arquivo JS

    try {
        // Carrega o HTML
        const response = await fetch(htmlFile);
        if (!response.ok) throw new Error(`Arquivo HTML não encontrado: ${htmlFile}`);
        contentArea.innerHTML = await response.text();

        // Se houver um script associado, importa e o inicializa
        if (scriptFile) {
            const module = await import(scriptFile);
            if (module.init) {
                // Passa as referências do Firebase para o script da aba
                module.init(db, user, userData);
            }
        }
    } catch (error) {
        console.error(`Erro ao carregar a aba ${tabName}:`, error);
        contentArea.innerHTML = '<p>Ocorreu um erro ao carregar este conteúdo.</p>';
    }
}