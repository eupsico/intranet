// Arquivo: /modulos/voluntario/js/recursos.js
// Versão: 4.2 (Lógica de acordeão adicionada e estrutura revisada)
// Descrição: Controla as abas de recursos e a interatividade da página.

export function init(db, user, userData) {
    const view = document.querySelector('.view-container');
    if (!view) return;

    const tabContainer = view.querySelector('.tabs-container');
    const contentSections = view.querySelectorAll('.tab-content');
    const loadedTabs = new Set();

    /**
     * Adiciona a funcionalidade de abrir/fechar para todos os acordeões na página.
     */
    const setupAccordions = () => {
        const accordions = view.querySelectorAll('.accordion');
        accordions.forEach(accordion => {
            const trigger = accordion.querySelector('.accordion-trigger');
            const content = accordion.querySelector('.accordion-content');
            if (trigger && content) {
                trigger.addEventListener('click', () => {
                    const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
                    trigger.setAttribute('aria-expanded', !isExpanded);
                    trigger.classList.toggle('active');
                    content.classList.toggle('active');
                    if (!isExpanded) {
                        // Expande o conteúdo
                        content.style.maxHeight = content.scrollHeight + 'px';
                    } else {
                        // Retrai o conteúdo
                        content.style.maxHeight = '0px';
                    }
                });
            }
        });
    };
    
    /**
     * Carrega o módulo JS associado a uma aba específica.
     * @param {string} tabId - O ID da aba (ex: 'mensagens', 'disponibilidade').
     */
    const loadTabModule = async (tabId) => {
        if (loadedTabs.has(tabId)) {
            return;
        }

        try {
            let module;
            const initParams = [db, user, userData];

            switch (tabId) {
                case 'mensagens':
                    module = await import('./mensagens.js');
                    break;
                case 'disponibilidade':
                    module = await import('./disponibilidade.js');
                    break;
                case 'grade-online':
                    module = await import('./grade-view.js');
                    initParams.push('online'); // Passa 'online' como parâmetro
                    break;
                case 'grade-presencial':
                    module = await import('./grade-view.js');
                    initParams.push('presencial'); // Passa 'presencial' como parâmetro
                    break;
                default:
                    return;
            }

            if (module && typeof module.init === 'function') {
                await module.init(...initParams);
                loadedTabs.add(tabId);
            }
        } catch (error) {
            console.error(`Erro ao carregar o módulo da aba '${tabId}':`, error);
            const tabContent = view.querySelector(`#${tabId}`);
            if (tabContent && !tabId.startsWith('grade')) { // Grades já têm spinner
                 tabContent.innerHTML = `<div class="info-card" style="border-left-color: var(--cor-erro);">Ocorreu um erro ao carregar este recurso.</div>`;
            }
        }
    };

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

    // Inicializa a funcionalidade de acordeão assim que a view de recursos é carregada
    setupAccordions();

    // Carrega o conteúdo da primeira aba ativa ao entrar na página
    const activeTab = tabContainer?.querySelector('.tab-link.active');
    if (activeTab) {
        loadTabModule(activeTab.dataset.tab);
    }
}