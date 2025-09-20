// Arquivo: /modulos/voluntario/js/supervisao.js
// Versão: 3.1 (Corrige loop, adiciona abas e refatora a lógica de visibilidade)
// Descrição: Controla a interface de abas da Supervisão, agora com lógica robusta para cada perfil de usuário.

export function init(db, user, userData) {
    const view = document.querySelector('.view-container');
    if (!view) return;

    const tabContainer = view.querySelector('#supervisao-tabs');
    const contentSections = view.querySelectorAll('.tab-content');
    const loadedTabs = new Set();
    const userRoles = userData.funcoes || [];
    const isSupervisor = userRoles.includes('supervisor') || userRoles.includes('admin');

    const setupTabsVisibility = () => {
        // Esconde todas as abas e conteúdos primeiro para garantir um estado limpo
        tabContainer.querySelectorAll('.tab-link').forEach(tab => tab.style.display = 'none');
        contentSections.forEach(content => content.style.display = 'none');
        
        let defaultTabId = '';

        if (isSupervisor) {
            // Define as abas visíveis para o SUPERVISOR
            view.querySelector('#tab-meu-perfil-supervisor').style.display = 'block';
            view.querySelector('#tab-minhas-fichas').style.display = 'block';
            view.querySelector('#tab-meus-agendamentos').style.display = 'block';
            defaultTabId = 'tab-meu-perfil-supervisor';
        } else {
            // Define as abas visíveis para o PSICÓLOGO
            view.querySelector('#tab-preencher-ficha').style.display = 'block';
            view.querySelector('#tab-meus-acompanhamentos').style.display = 'block';
            view.querySelector('#tab-agendar-supervisao').style.display = 'block';
            defaultTabId = 'tab-preencher-ficha';
        }

        // Ativa a primeira aba visível como padrão
        const firstVisibleTab = view.querySelector(`#${defaultTabId}`);
        if (firstVisibleTab) {
            firstVisibleTab.classList.add('active');
            const contentId = firstVisibleTab.dataset.tab;
            view.querySelector(`#${contentId}`).style.display = 'block';
            loadTabModule(contentId);
        }
    };

    const loadTabModule = async (tabId) => {
        if (loadedTabs.has(tabId)) return;

        try {
            let module;
            const params = [db, user, userData];
            switch (tabId) {
                case 'preencher-ficha': // Link direto para a criação de nova ficha
                    window.location.hash = '#ficha-supervisao/new';
                    return; // Navega e não carrega módulo aqui
                case 'meus-acompanhamentos':
                    module = await import('./fichas-supervisao.js');
                    break;
                case 'agendar-supervisao':
                    module = await import('./ver-supervisores.js');
                    break;
                case 'meu-perfil-supervisor':
                    module = await import('./perfil-supervisor.js'); // Vamos criar este
                    break;
                case 'minhas-fichas':
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

    setupTabsVisibility();
}