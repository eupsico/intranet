// Arquivo: /modulos/voluntario/js/painel-supervisor.js
// Versão 2.2 (Lógica de abas corrigida para destacar corretamente)

async function loadTabContent(tabId, user, userData) {
  // ... (nenhuma mudança nesta função interna)
  const contentArea = document.getElementById("painel-supervisor-content");
  if (!contentArea) return;
  contentArea.innerHTML = '<div class="loading-spinner"></div>';
  try {
    const pageResponse = await fetch(`../page/${tabId}.html`);
    if (!pageResponse.ok)
      throw new Error(`Falha ao carregar o HTML da aba: ${tabId}`);
    contentArea.innerHTML = await pageResponse.text();
    const module = await import(`./${tabId}.js`);
    if (module && typeof module.init === "function") {
      module.init(user, userData);
    }
  } catch (error) {
    console.error(`Erro ao carregar a aba '${tabId}':`, error);
    contentArea.innerHTML =
      '<p class="alert alert-error">Ocorreu um erro ao carregar esta seção.</p>';
  }
}

export function init(user, userData) {
  const tabsContainer = document.getElementById("painel-supervisor-tabs");
  if (!tabsContainer) return;

  const handleTabClick = (e) => {
    const targetButton = e.target.closest(".tab-link");
    if (targetButton) {
      const tabId = targetButton.dataset.tab;

      // *** INÍCIO DA CORREÇÃO ***
      // Garante que a busca por 'querySelectorAll' seja feita no container correto.
      tabsContainer
        .querySelectorAll(".tab-link")
        .forEach((btn) => btn.classList.remove("active"));
      targetButton.classList.add("active");
      // *** FIM DA CORREÇÃO ***

      loadTabContent(tabId, user, userData);
    }
  };

  // Garante que o listener seja adicionado apenas uma vez
  const newTabsContainer = tabsContainer.cloneNode(true);
  tabsContainer.parentNode.replaceChild(newTabsContainer, tabsContainer);
  newTabsContainer.addEventListener("click", handleTabClick);

  const activeTab = newTabsContainer.querySelector(".tab-link.active");
  if (activeTab) {
    loadTabContent(activeTab.dataset.tab, user, userData);
  }
}
