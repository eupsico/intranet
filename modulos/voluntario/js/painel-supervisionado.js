// Arquivo: /modulos/voluntario/js/painel-supervisionado.js
// Versão: 3.0 (Lógica de abas simplificada para usar roteamento por hash)
// Descrição: Controla as abas "Acompanhamentos" e "Supervisores", e navega para a ficha.

export function init(db, user, userData) {
    const view = document.querySelector('.view-container');
    if (!view) return;

    const tabContainer = view.querySelector('#supervisionado-tabs');
    const contentSections = view.querySelectorAll('.tab-content');
    const loadedTabs = new Set();

    const loadTabModule = async (tabId) => {
        // Não carrega o mesmo módulo duas vezes
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
                    return; // Ignora a aba 'ficha-supervisao' que é tratada pela navegação
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
                e.preventDefault(); // Previne o comportamento padrão para controlar a navegação

                const tabId = target.dataset.tab;

                // Se for a aba da ficha, apenas muda a URL. O roteador principal cuidará do resto.
                if (tabId === 'ficha-supervisao') {
                    window.location.hash = '#ficha-supervisao/new';
                    return;
                }

                // Lógica para as outras abas
                tabContainer.querySelectorAll('.tab-link').forEach(btn => btn.classList.remove('active'));
                target.classList.add('active');

                contentSections.forEach(section => {
                    section.style.display = section.id === tabId ? 'block' : 'none';
                });

                loadTabModule(tabId);
            }
        });
    }

    // Ao carregar o painel, verifica se alguma aba já deveria estar ativa (exceto a ficha)
    const currentHash = window.location.hash.substring(1);
    const activeTabButton = tabContainer?.querySelector(`.tab-link[data-tab="${currentHash}"]`);
    
    if (activeTabButton && currentHash !== 'ficha-supervisao') {
         activeTabButton.click();
    } else {
        // Se nenhuma aba estiver ativa ou for a da ficha, garante que a primeira aba esteja visualmente ativa.
        const firstTab = tabContainer?.querySelector('.tab-link');
        if (firstTab) {
             tabContainer.querySelectorAll('.tab-link').forEach(btn => btn.classList.remove('active'));
             firstTab.classList.add('active');
             contentSections.forEach(section => {
                section.style.display = section.id === firstTab.dataset.tab ? 'block' : 'none';
             });
             // Carrega o módulo da primeira aba, se não for a ficha
             if(firstTab.dataset.tab !== 'ficha-supervisao'){
                loadTabModule(firstTab.dataset.tab);
             }
        }
    }
}