// Arquivo: /modulos/voluntario/js/painel-supervisor.js (Novo)
// Versão: 1.0
// Descrição: Controla as abas do Painel do Supervisor.

export function init(db, user, userData) {
    const view = document.querySelector('.view-container');
    if (!view) return;

    const tabContainer = view.querySelector('#supervisor-tabs');
    const contentSections = view.querySelectorAll('.tab-content');
    const loadedTabs = new Set();

    const loadTabModule = async (tabId) => {
        if (loadedTabs.has(tabId)) return;

        try {
            let module;
            const params = [db, user, userData];
            switch (tabId) {
                case 'meu-perfil':
                    module = await import('./perfil-supervisor.js');
                    break;
                case 'meus-supervisionados':
                    module = await import('./view-meus-supervisionados.js');
                    break;
                case 'meus-agendamentos':
                    module = await import('./view-meus-agendamentos.js');
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

    // Carrega o conteúdo da primeira aba ("Meu Perfil") ao entrar na página
    const activeTab = tabContainer?.querySelector('.tab-link.active');
    if (activeTab) {
        loadTabModule(activeTab.dataset.tab);
    }
}