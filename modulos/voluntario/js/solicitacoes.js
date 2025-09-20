// Arquivo: /modulos/voluntario/js/solicitacoes.js
// Versão: 2.0 (Revisado e padronizado)
// Descrição: Controla as abas e a funcionalidade do modal do Pipefy na página de Solicitações.

export function init(db, user, userData) {
    const view = document.querySelector('.view-container');
    if (!view) return;

    // --- Lógica das Abas ---
    const tabContainer = view.querySelector('.tabs-container');
    const contentSections = view.querySelectorAll('.tab-content');

    if (tabContainer) {
        tabContainer.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' && e.target.classList.contains('tab-link')) {
                const tabId = e.target.dataset.tab;

                tabContainer.querySelectorAll('.tab-link').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');

                contentSections.forEach(section => {
                    section.style.display = section.id === tabId ? 'block' : 'none';
                });
            }
        });
    }

    // --- Lógica do Modal do Pipefy ---
    const modal = document.getElementById("pipefyModal");
    const btn = document.getElementById("openPipefyModalBtn");
    const span = document.getElementById("closePipefyModalBtn");

    if (modal && btn && span) {
        btn.onclick = function() {
            modal.style.display = "block";
        }
        span.onclick = function() {
            modal.style.display = "none";
        }
        window.addEventListener('click', function(event) {
            if (event.target == modal) {
                modal.style.display = "none";
            }
        });
    }
}