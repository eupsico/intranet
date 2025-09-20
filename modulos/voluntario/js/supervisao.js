// Arquivo: /modulos/voluntario/js/supervisao.js (Conteúdo Novo e Unificado)
// Versão: 3.0
// Descrição: Controla a nova interface de abas da Supervisão, exibindo conteúdo com base na função do usuário.

export function init(db, user, userData) {
    const view = document.querySelector('.view-container');
    if (!view) return;

    const tabContainer = view.querySelector('#supervisao-tabs');
    const contentSections = view.querySelectorAll('.tab-content');
    const loadedTabs = new Set();
    const userRoles = userData.funcoes || [];
    const isSupervisor = userRoles.includes('supervisor') || userRoles.includes('admin');

    /**
     * Configura a visibilidade das abas com base na função do usuário.
     */
    const setupTabsVisibility = () => {
        const defaultTabId = isSupervisor ? 'minhas-fichas' : 'meus-acompanhamentos';

        if (isSupervisor) {
            view.querySelector('#tab-minhas-fichas').style.display = 'block';
            view.querySelector('#tab-meus-agendamentos').style.display = 'block';
        }

        // Ativa a primeira aba visível como padrão
        const firstVisibleTab = view.querySelector(`.tab-link[data-tab="${defaultTabId}"]`);
        if (firstVisibleTab) {
            firstVisibleTab.classList.add('active');
            view.querySelector(`#${defaultTabId}`).style.display = 'block';
            loadTabModule(defaultTabId);
        }
    };

    /**
     * Carrega o módulo JS associado a uma aba específica.
     */
    const loadTabModule = async (tabId) => {
        if (loadedTabs.has(tabId)) return;

        try {
            let module;
            switch (tabId) {
                case 'meus-acompanhamentos':
                    module = await import('./fichas-supervisao.js');
                    break;
                case 'agendar-supervisao':
                    module = await import('./ver-supervisores.js');
                    break;
                case 'minhas-fichas':
                    // Este será o módulo para o supervisor ver as fichas dos seus supervisionados
                    module = await import('./view-meus-supervisionados.js');
                    break;
                case 'meus-agendamentos':
                    // Este será o módulo para o supervisor ver quem agendou com ele
                    module = await import('./view-meus-agendamentos.js'); // Vamos criar este
                    break;
                default:
                    return;
            }

            if (module && typeof module.init === 'function') {
                await module.init(db, user, userData);
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
    
    // Adiciona o event listener para a troca de abas
    if (tabContainer) {
        tabContainer.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' && e.target.classList.contains('tab-link')) {
                const tabId = e.target.dataset.tab;

                tabContainer.querySelectorAll('.tab-link').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');

                contentSections.forEach(section => {
                    section.style.display = section.id === tabId ? 'block' : 'none';
                });

                loadTabModule(tabId);
            }
        });
    }

    // Inicia o módulo
    setupTabsVisibility();
}