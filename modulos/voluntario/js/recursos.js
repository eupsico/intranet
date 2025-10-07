// Arquivo: /modulos/voluntario/js/recursos.js
// Versão 2.0 (Atualizado para a sintaxe modular do Firebase v9)

/**
 * Função Principal (INIT): Ponto de entrada do módulo de Recursos.
 * @param {object} user - Objeto do usuário autenticado.
 * @param {object} userData - Dados do perfil do usuário do Firestore.
 * @param {string} tabToOpen - (Opcional) ID da aba para abrir diretamente.
 */
export function init(user, userData, tabToOpen) {
  const view = document.querySelector(".view-container");
  if (!view) return;

  const tabContainer = view.querySelector(".tabs-container");
  const contentSections = view.querySelectorAll(".tab-content");

  // Conjunto para rastrear quais abas já foram inicializadas
  const loadedTabs = new Set();

  /**
   * Carrega dinamicamente o módulo JS de uma aba específica.
   * @param {string} tabId - O ID da aba a ser carregada (ex: 'mensagens').
   */
  const loadTabModule = async (tabId) => {
    // Não recarrega o módulo se ele já foi inicializado
    if (loadedTabs.has(tabId)) {
      return;
    }

    try {
      let module;
      // Parâmetros para a função init do módulo filho
      let initParams = [user, userData];

      switch (tabId) {
        case "mensagens":
          module = await import("./mensagens.js");
          break;
        case "disponibilidade":
          module = await import("./disponibilidade.js");
          break;
        case "grade-online":
          module = await import("./grade-view.js");
          initParams.push("online"); // Adiciona o tipo de grade como terceiro parâmetro
          break;
        case "grade-presencial":
          module = await import("./grade-view.js");
          initParams.push("presencial"); // Adiciona o tipo de grade como terceiro parâmetro
          break;
        default:
          return; // Nenhuma ação para abas sem módulo JS
      }

      if (module && typeof module.init === "function") {
        // Chama a função init do módulo filho com os parâmetros corretos
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

    // Atualiza a aparência dos botões
    tabContainer
      .querySelectorAll(".tab-link")
      .forEach((btn) => btn.classList.remove("active"));
    targetButton.classList.add("active");

    // Mostra o conteúdo da aba correta e esconde as outras
    contentSections.forEach((section) => {
      section.style.display = section.id === tabId ? "block" : "none";
    });

    // Carrega o módulo JS associado à aba
    loadTabModule(tabId);
  };

  // Adiciona o listener de clique ao container das abas
  if (tabContainer) {
    tabContainer.addEventListener("click", (e) => {
      if (
        e.target.tagName === "BUTTON" &&
        e.target.classList.contains("tab-link")
      ) {
        const tabId = e.target.dataset.tab;
        // Atualiza o hash da URL para refletir a aba ativa
        window.location.hash = `recursos/${tabId}`;
      }
    });
  }

  /**
   * Lê o hash da URL e abre a aba correspondente.
   */
  const handleHashChange = () => {
    // O hash pode ser #recursos/disponibilidade
    const hashParts = window.location.hash.substring(1).split("/");
    let activeTabId = "mensagens"; // Aba padrão

    if (hashParts[0] === "recursos" && hashParts[1]) {
      activeTabId = hashParts[1];
    }

    switchTab(activeTabId);
  };

  // Listener para quando o hash da URL mudar
  window.addEventListener("hashchange", handleHashChange);

  // Inicialização: abre a aba especificada ou a padrão
  handleHashChange();
}
