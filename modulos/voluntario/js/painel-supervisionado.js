// Arquivo: /modulos/voluntario/js/painel-supervisionado.js (Novo)
// Versão: 1.0
// Descrição: Controla as abas do Painel do Supervisionado (Psicólogo).

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

        // CORREÇÃO: Tratamento especial para a ficha
        if (tabId === 'ficha-supervisao') {
            const response = await fetch('./page/ficha-supervisao-completa.html');
            if (!response.ok) throw new Error('HTML da ficha não encontrado');
            document.getElementById('ficha-supervisao').innerHTML = await response.text();

            module = await import('./ficha-supervisao.js');
            params.push('new'); // Indica que é uma nova ficha

        } else {
            switch (tabId) {
                case 'acompanhamentos':
                    module = await import('./fichas-supervisao.js');
                    break;
                case 'supervisores':
                    module = await import('./ver-supervisores.js');
                    break;
                default: return;
            }
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