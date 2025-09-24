// Arquivo: /modulos/voluntario/js/plantao-psicologico.js
// Descrição: Controla a funcionalidade do acordeão na página do Plantão.

export function init(db, user, userData) {
    const container = document.querySelector('.view-container');
    if (!container) return;

    const accordionHeaders = container.querySelectorAll(".accordion-header");

    accordionHeaders.forEach(header => {
        header.addEventListener("click", () => {
            const accordionItem = header.closest('.accordion-item');
            if (!accordionItem) return;
            
            const accordionBody = header.nextElementSibling;
            const isActive = accordionItem.classList.contains("active");

            // Fecha todos os outros itens abertos
            container.querySelectorAll('.accordion-item').forEach(item => {
                if (item !== accordionItem) {
                    item.classList.remove('active');
                    item.querySelector('.accordion-header').classList.remove('active');
                    item.querySelector('.accordion-body').style.maxHeight = 0;
                }
            });

            // Abre ou fecha o item clicado
            if (!isActive) {
                accordionItem.classList.add("active");
                header.classList.add("active");
                accordionBody.style.maxHeight = accordionBody.scrollHeight + "px";
            } else {
                accordionItem.classList.remove("active");
                header.classList.remove("active");
                accordionBody.style.maxHeight = 0;
            }
        });
    });
}