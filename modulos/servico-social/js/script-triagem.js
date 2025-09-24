// Arquivo: /modulos/servico-social/js/script-triagem.js
// Descrição: Controla a interatividade do acordeão na página do Script de Triagem.

export function init(db, user, userData) {
    const container = document.querySelector('.view-container');
    if (!container) return;

    const accordionHeaders = container.querySelectorAll(".accordion-header");

    accordionHeaders.forEach(header => {
        header.addEventListener("click", () => {
            const accordionBody = header.nextElementSibling;
            
            // Alterna a classe 'active' no cabeçalho clicado
            header.classList.toggle("active");

            // Abre ou fecha o corpo do acordeão
            if (header.classList.contains("active")) {
                accordionBody.style.maxHeight = accordionBody.scrollHeight + "px";
            } else {
                accordionBody.style.maxHeight = 0;
            }
        });
    });
}