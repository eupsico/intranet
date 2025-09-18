// Arquivo: /modulos/voluntario/js/recursos.js
// Versão: 4.3 (DEBUG AVANÇADO)
// Descrição: Adiciona logs detalhados para investigar qual módulo está sendo importado.

export function init(db, user, userData) {
    const view = document.querySelector('.view-container');
    if (!view) return;

    const tabContainer = view.querySelector('.tabs-container');
    const contentSections = view.querySelectorAll('.tab-content');
    const loadedTabs = new Set();

    const loadTabModule = async (tabId) => {
        console.log(`[RECURSOS.JS] Tentando carregar módulo para a aba: "${tabId}"`);

        if (loadedTabs.has(tabId)) {
            console.log(`[RECURSOS.JS] Módulo para "${tabId}" já foi carregado. Ignorando.`);
            return;
        }

        try {
            let module;
            let initParams = [db, user, userData];

            switch (tabId) {
                case 'mensagens':
                    console.log(`[RECURSOS.JS] Entrou no case 'mensagens'. Importando './mensagens.js'...`);
                    module = await import('./mensagens.js');
                    break;
                case 'disponibilidade':
                    console.log(`[RECURSOS.JS] Entrou no case 'disponibilidade'. Importando './disponibilidade.js'...`);
                    module = await import('./disponibilidade.js');
                    break;
                case 'grade-online':
                    console.log(`[RECURSOS.JS] Entrou no case 'grade-online'. Importando './grade-view.js'...`);
                    module = await import('./grade-view.js'); 
                    initParams.push('online');
                    break;
                case 'grade-presencial':
                    console.log(`[RECURSOS.JS] Entrou no case 'grade-presencial'. Importando './grade-view.js'...`);
                    module = await import('./grade-view.js');
                    initParams.push('presencial');
                    break;
                default:
                    console.log(`[RECURSOS.JS] O tabId "${tabId}" não correspondeu a nenhum case.`);
                    return;
            }

            console.log(`[RECURSOS.JS] Módulo para "${tabId}" importado com sucesso. Verificando a função init...`);
            if (module && typeof module.init === 'function') {
                await module.init(...initParams);
                console.log(`[RECURSOS.JS] Função init() do módulo "${tabId}" executada com sucesso.`);
                loadedTabs.add(tabId);
            } else {
                console.warn(`[RECURSOS.JS] O módulo para "${tabId}" foi carregado, mas não possui uma função init().`);
            }
        } catch (error) {
            console.error(`❌ [RECURSOS.JS] ERRO CRÍTICO ao carregar o módulo da aba '${tabId}':`, error);
            const tabContent = view.querySelector(`#${tabId}`);
            if(tabContent) {
                tabContent.innerHTML = `<p class="alert alert-error">Ocorreu um erro ao carregar este recurso.</p>`;
            }
        }
    };

    if (tabContainer) {
        tabContainer.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' && e.target.classList.contains('tab-link')) {
                const tabId = e.target.dataset.tab;
                console.log(`[RECURSOS.JS] Clique detectado na aba: ${tabId}`);
                
                tabContainer.querySelectorAll('.tab-link').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');

                contentSections.forEach(section => {
                    section.style.display = section.id === tabId ? 'block' : 'none';
                });
                
                loadTabModule(tabId);
            }
        });
    }

    const activeTab = tabContainer.querySelector('.tab-link.active');
    if (activeTab) {
        console.log(`[RECURSOS.JS] Carregando módulo inicial para a aba ativa: "${activeTab.dataset.tab}"`);
        loadTabModule(activeTab.dataset.tab);
    }
}