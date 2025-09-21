// Arquivo: /modulos/voluntario/js/painel-supervisionado.js
// Versão: 2.0 (Lógica de abas simplificada para usar roteamento por hash)

export function init(db, user, userData) {
    const view = document.querySelector('.view-container');
    if (!view) return;

    const tabContainer = view.querySelector('#supervisionado-tabs');
    const contentSections = view.querySelectorAll('.tab-content');
    const loadedTabs = new Set();

    const loadTabModule = async (tabId) => {
        if (loadedTabs.has(tabId)) return;

        try {
            let module;
            const params = [db, user, userData];
            switch (tabId) {
                case 'acompanhamentos':
                    module = await import('./fichas-supervisao.js');
                    break;
                case 'ver-supervisores':
                    module = await import('./ver-supervisores.js');
                    break;
                default:
                    return; // A aba 'ficha-supervisao' agora é tratada por navegação de hash
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
                e.preventDefault(); // Previne o comportamento padrão do link/botão

                const tabId = target.dataset.tab;

                // Se a aba for 'ficha-supervisao', navega para a rota de criação de nova ficha
                if (tabId === 'ficha-supervisao') {
                    window.location.hash = '#ficha-supervisao/new';
                    return; // Interrompe a execução para o roteador principal assumir
                }

                tabContainer.querySelectorAll('.tab-link').forEach(btn => btn.classList.remove('active'));
                target.classList.add('active');

                contentSections.forEach(section => {
                    section.style.display = section.id === tabId ? 'block' : 'none';
                });

                loadTabModule(tabId);
            }
        });
    }

    // Carrega a primeira aba visível ao entrar na página, se não for a ficha
    const activeTab = tabContainer?.querySelector('.tab-link.active');
    if (activeTab && activeTab.dataset.tab !== 'ficha-supervisao') {
        loadTabModule(activeTab.dataset.tab);
    } else {
        // Garante que a primeira aba (Ficha de Supervisão) seja ativada visualmente
        const firstTab = tabContainer?.querySelector('[data-tab="ficha-supervisao"]');
        if (firstTab) {
            tabContainer.querySelectorAll('.tab-link').forEach(btn => btn.classList.remove('active'));
            firstTab.classList.add('active');
            contentSections.forEach(section => {
                section.style.display = section.id === 'ficha-supervisao' ? 'block' : 'none';
            });
            // Carrega o módulo da ficha pela primeira vez
            loadTabModule('ficha-supervisao');
        }
    }
}