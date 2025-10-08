// Arquivo: /modulos/voluntario/js/painel-supervisor.js
// Versão 2.0 (Atualizado para a sintaxe modular do Firebase v9)
// Descrição: Controla a navegação por abas do Painel do Supervisor.

/**
 * Carrega dinamicamente o conteúdo de uma aba (HTML e JS).
 * @param {string} tabId - O ID da aba a ser carregada.
 * @param {object} user - Objeto do usuário autenticado.
 * @param {object} userData - Dados do perfil do usuário do Firestore.
 */
async function loadTabContent(tabId, user, userData) {
  const contentArea = document.getElementById("painel-supervisor-content");
  if (!contentArea) return;

  contentArea.innerHTML = '<div class="loading-spinner"></div>';

  try {
    // Carrega o arquivo HTML da aba
    const pageResponse = await fetch(`../page/${tabId}.html`);
    if (!pageResponse.ok)
      throw new Error(`Falha ao carregar o HTML da aba: ${tabId}`);
    contentArea.innerHTML = await pageResponse.text();

    // Carrega o arquivo JavaScript (módulo) da aba
    const module = await import(`./${tabId}.js`);
    if (module && typeof module.init === "function") {
      // Passa os parâmetros corretos para o módulo filho (sem 'db')
      module.init(user, userData);
    }
  } catch (error) {
    console.error(`Erro ao carregar a aba '${tabId}':`, error);
    contentArea.innerHTML =
      '<p class="alert alert-error">Ocorreu um erro ao carregar esta seção.</p>';
  }
}

/**
 * Função de inicialização do painel.
 * @param {object} user - Objeto do usuário autenticado.
 * @param {object} userData - Dados do perfil do usuário do Firestore.
 */
export function init(user, userData) {
  const tabs = document.getElementById("painel-supervisor-tabs");
  if (!tabs) return;

  // Lida com o clique nas abas
  const handleTabClick = (e) => {
    if (
      e.target.tagName === "BUTTON" &&
      e.target.classList.contains("tab-link")
    ) {
      const tabId = e.target.dataset.tab;

      // Atualiza a classe 'active'
      tabs
        .querySelectorAll(".tab-link")
        .forEach((btn) => btn.classList.remove("active"));
      e.target.classList.add("active");

      // Carrega o conteúdo da aba clicada
      loadTabContent(tabId, user, userData);
    }
  };

  // Garante que o listener seja adicionado apenas uma vez
  const newTabs = tabs.cloneNode(true);
  tabs.parentNode.replaceChild(newTabs, tabs);
  newTabs.addEventListener("click", handleTabClick);

  // Carrega o conteúdo da primeira aba (que está 'active' por padrão no HTML)
  const activeTab = newTabs.querySelector(".tab-link.active");
  if (activeTab) {
    loadTabContent(activeTab.dataset.tab, user, userData);
  }
}
