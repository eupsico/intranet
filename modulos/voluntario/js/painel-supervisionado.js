// Arquivo: /modulos/voluntario/js/painel-supervisionado.js (CORRIGIDO)

export function init(db, user, userData) {
    const view = document.querySelector('.view-container');
    if (!view) return;

    const tabContainer = view.querySelector('#supervisionado-tabs');
    const contentSections = view.querySelectorAll('.tab-content');
    const loadedTabs = new Set();

    const loadTabModule = async (tabId) => {
        if (loadedTabs.has(tabId) && tabId !== 'ficha-supervisao') return;

        try {
            let module;
            const params = [db, user, userData];
            switch (tabId) {
                case 'ficha-supervisao':
                    // CORREÇÃO: Caminho do fetch ajustado para a pasta correta.
                    const response = await fetch('./ficha-supervisao-completa.html');
                    if (!response.ok) {
                        throw new Error(`Arquivo não encontrado: ${response.statusText}`);
                    }
                    const formHtml = await response.text();
                    document.getElementById('ficha-supervisao').innerHTML = formHtml;
                    
                    module = await import('./ficha-supervisao.js');
                    params.push('new'); // Indica que é uma nova ficha
                    break;
                case 'acompanhamentos':
                    module = await import('./fichas-supervisao.js');
                    break;
                case 'ver-supervisores': // Mantém o nome correto da view/módulo
                    module = await import('./ver-supervisores.js');
                    break;
                default: return;
            }

            if (module && typeof module.init === 'function') {
                await module.init(...params);
                loadedTabs.add(tabId);
            }
        } catch (error) {
            console.error(`Erro ao carregar o módulo da aba '${tabId}':`, error);
            const tabContent = view.querySelector(`#${tabId}`);
            if (tabContent) {
                tabContent.innerHTML = `<div class="info-card" style="border-left-color: var(--cor-erro);">Ocorreu um erro ao carregar este recurso.</div>`;
            }
        }
    };
    
    if (tabContainer) {
        tabContainer.addEventListener('click', (e) => {
            const target = e.target.closest('.tab-link');
            if (target) {
                const tabId = target.dataset.tab;
                tabContainer.querySelectorAll('.tab-link').forEach(btn => btn.classList.remove('active'));
                target.classList.add('active');
                contentSections.forEach(section => {
                    section.style.display = section.id === tabId ? 'block' : 'none';
                });
                loadTabModule(tabId);
            }
        });
    }

    const activeTab = tabContainer?.querySelector('.tab-link.active');
    if (activeTab) {
        loadTabModule(activeTab.dataset.tab);
    }
}