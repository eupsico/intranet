// Arquivo: /modulos/voluntario/js/painel-supervisor.js
// Descrição: Controla a navegação por abas do Painel do Supervisor.

let db, user, userData;
const loadedTabs = new Map(); // Armazena os módulos já carregados

// Função para carregar o conteúdo de uma aba (HTML e JS)
async function loadTabContent(tabId) {
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
      module.init(db, user, userData);
      loadedTabs.set(tabId, { module }); // Salva o módulo para referência futura
    }
  } catch (error) {
    console.error(`Erro ao carregar a aba '${tabId}':`, error);
    contentArea.innerHTML =
      '<p class="alert alert-error">Ocorreu um erro ao carregar esta seção.</p>';
  }
}

// Lida com o clique nas abas
function handleTabClick(e) {
  if (
    e.target.tagName === "BUTTON" &&
    e.target.classList.contains("tab-link")
  ) {
    const tabId = e.target.dataset.tab;

    // Atualiza a classe 'active'
    document
      .querySelectorAll("#painel-supervisor-tabs .tab-link")
      .forEach((btn) => btn.classList.remove("active"));
    e.target.classList.add("active");

    loadTabContent(tabId);
  }
}

// Função de inicialização do painel
export function init(dbRef, userRef, userDataRef) {
  db = dbRef;
  user = userRef;
  userData = userDataRef;

  const tabs = document.getElementById("painel-supervisor-tabs");
  if (tabs) {
    tabs.addEventListener("click", handleTabClick);

    // Carrega o conteúdo da primeira aba (que está 'active' por padrão no HTML)
    const activeTab = tabs.querySelector(".tab-link.active");
    if (activeTab) {
      loadTabContent(activeTab.dataset.tab);
    }
  }
}
