// Arquivo: /modulos/voluntario/js/recursos.js
// Versão 2.1 (Atualizado para a sintaxe modular do Firebase v9 e navegação por hash)

/**
 * Função Principal (INIT): Ponto de entrada do módulo de Recursos.
 * @param {object} user - Objeto do usuário autenticado.
 * @param {object} userData - Dados do perfil do usuário do Firestore.
 */
export function init(user, userData) {
  const view = document.querySelector(".view-container");
  if (!view) return;

  const tabContainer = view.querySelector(".tabs-container");
  const contentSections = view.querySelectorAll(".tab-content");

  // Conjunto para rastrear quais abas já foram inicializadas e evitar recarregamentos
  const loadedTabs = new Set();

  /**
   * Carrega dinamicamente o módulo JS de uma aba específica.
   * @param {string} tabId - O ID da aba a ser carregada (ex: 'mensagens').
   */
  const loadTabModule = async (tabId) => {
    if (loadedTabs.has(tabId)) return;

    try {
      let module;
      let initParams = [user, userData]; // Parâmetros para os módulos filhos

      switch (tabId) {
        case "mensagens":
          module = await import("./mensagens.js");
          break;
        case "disponibilidade":
          module = await import("./disponibilidade.js");
          break;
        case "grade-online":
          module = await import("./grade-view.js");
          initParams.push("online"); // Adiciona o tipo de grade
          break;
        case "grade-presencial":
          module = await import("./grade-view.js");
          initParams.push("presencial"); // Adiciona o tipo de grade
          break;
        default:
          return; // Nenhuma ação para abas sem módulo JS
      }

      if (module && typeof module.init === "function") {
        await module.init(...initParams);
        loadedTabs.add(tabId); // Marca a aba como carregada
      }
    } catch (error) {
      console.error(`Erro ao carregar o módulo da aba '${tabId}':`, error);
      const tabContent = view.querySelector(`#${tabId}`);
      if (tabContent) {
        tabContent.innerHTML = `<p class="alert alert-error">Ocorreu um erro ao carregar este recurso.</p>`;
      }
    }
  };

  /**
   * Alterna a visibilidade das abas e dispara o carregamento do módulo.
   * @param {string} tabId - O ID da aba a ser mostrada.
   */
  const switchTab = (tabId) => {
    const targetButton = tabContainer.querySelector(
      `.tab-link[data-tab="${tabId}"]`
    );
    if (!targetButton) return;

    tabContainer
      .querySelectorAll(".tab-link")
      .forEach((btn) => btn.classList.remove("active"));
    targetButton.classList.add("active");

    contentSections.forEach((section) => {
      section.style.display = section.id === tabId ? "block" : "none";
    });

    loadTabModule(tabId);
  };

  /**
   * Lê o hash da URL (ex: #recursos/disponibilidade) e abre a aba correspondente.
   */
  const handleHashChange = () => {
    const hashParts = window.location.hash.substring(1).split("/");
    let activeTabId = "mensagens"; // Aba padrão

    if (hashParts[0] === "recursos" && hashParts[1]) {
      activeTabId = hashParts[1];
    }

    switchTab(activeTabId);
  };

  // Adiciona o listener de clique ao container das abas para atualizar a URL
  if (tabContainer) {
    // Usa cloneNode para garantir que não haja múltiplos listeners
    const newTabContainer = tabContainer.cloneNode(true);
    tabContainer.parentNode.replaceChild(newTabContainer, tabContainer);

    newTabContainer.addEventListener("click", (e) => {
      if (
        e.target.tagName === "BUTTON" &&
        e.target.classList.contains("tab-link")
      ) {
        const tabId = e.target.dataset.tab;
        // Apenas muda o hash, a lógica de troca de aba será tratada pelo 'handleHashChange'
        window.location.hash = `recursos/${tabId}`;
      }
    });
  }

  // Listener para quando o hash da URL mudar (seja por clique ou link direto)
  window.addEventListener("hashchange", handleHashChange);

  // Inicialização: chama a função uma vez para carregar a aba correta com base na URL atual
  handleHashChange();
}
