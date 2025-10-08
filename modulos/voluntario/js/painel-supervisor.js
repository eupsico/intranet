// Arquivo: /modulos/voluntario/js/painel-supervisor.js
// Versão Corrigida

// Importa a função 'init' de cada módulo de visualização, usando um apelido (alias) para evitar conflitos.
// Ex: A função 'init' de 'perfil-supervisor-view.js' será chamada como 'initPerfil'.
import { init as initPerfil } from "./perfil-supervisor-view.js";
import { init as initSupervisionados } from "./meus-supervisionados-view.js";
import { init as initAgendamentos } from "./meus-agendamentos-view.js";

// Importa o serviço de autenticação do Firebase.
import { auth } from "../../../assets/js/firebase-init.js";

document.addEventListener("DOMContentLoaded", () => {
  const tabsContainer = document.getElementById("tabs-supervisor");
  const contentContainer = document.getElementById(
    "content-container-supervisor"
  );
  let initialTabLoaded = false;
  let currentUserData = null; // Armazena os dados do usuário para não recarregar a cada clique

  /**
   * Carrega o conteúdo da aba dinamicamente, chamando a função 'init' do módulo correspondente.
   * @param {string} tabId - O ID da aba a ser carregada.
   * @param {object} user - O objeto do usuário autenticado pelo Firebase.
   */
  async function loadTabContent(tabId, user) {
    const contentDiv = document.getElementById(tabId);
    if (!contentDiv) {
      console.error(
        `Elemento de conteúdo para a aba #${tabId} não encontrado.`
      );
      return;
    }

    // Mostra um spinner de carregamento enquanto o conteúdo é buscado.
    contentDiv.innerHTML = '<div class="loading-spinner"></div>';

    try {
      // O 'switch' direciona para a função de inicialização correta com base na aba clicada.
      // Todos os módulos agora são chamados da mesma forma, passando o objeto 'user'.
      switch (tabId) {
        case "meu-perfil-supervisor":
          // O módulo 'perfil-supervisor-view.js' é responsável por buscar seus próprios dados.
          await initPerfil(user);
          break;
        case "meus-supervisionados":
          await initSupervisionados(user);
          break;
        case "meus-agendamentos-supervisor":
          // A função init de 'meus-agendamentos-view.js' é chamada aqui.
          await initAgendamentos(user);
          break;
        default:
          console.warn(`Nenhuma ação definida para a aba: ${tabId}`);
          contentDiv.innerHTML = ""; // Limpa o spinner se a aba não for reconhecida
      }
    } catch (error) {
      console.error(`Erro ao carregar o conteúdo da aba ${tabId}:`, error);
      contentDiv.innerHTML = `<p class="alert alert-error">Ocorreu um erro ao carregar o conteúdo. Tente novamente.</p>`;
    }
  }

  /**
   * Gerencia a troca de abas, atualizando a interface e chamando o carregamento de conteúdo.
   * @param {string} tabId - O ID da aba de destino.
   * @param {object} user - O objeto do usuário autenticado.
   */
  function switchTab(tabId, user) {
    // Esconde todos os painéis de conteúdo.
    contentContainer
      .querySelectorAll(".content-supervisor")
      .forEach((content) => {
        content.style.display = "none";
      });

    // Remove a classe 'active' de todos os botões de aba.
    tabsContainer
      .querySelectorAll(".tab-link")
      .forEach((btn) => btn.classList.remove("active"));

    // Mostra o painel de conteúdo da aba selecionada.
    const targetContent = document.getElementById(tabId);
    if (targetContent) {
      targetContent.style.display = "block";
      // Carrega ou recarrega o conteúdo da aba.
      loadTabContent(tabId, user);
    }

    // Adiciona a classe 'active' ao botão da aba clicada.
    const targetButton = tabsContainer.querySelector(
      `.tab-link[data-tab="${tabId}"]`
    );
    if (targetButton) {
      targetButton.classList.add("active");
    }
  }

  // Monitora o estado de autenticação para configurar o painel assim que o usuário logar.
  auth.onAuthStateChanged((user) => {
    if (user) {
      // Garante que a aba inicial seja carregada apenas uma vez.
      if (!initialTabLoaded) {
        const initialTab = "meu-perfil-supervisor";
        switchTab(initialTab, user); // Carrega a aba inicial.
        initialTabLoaded = true;
      }

      // Adiciona o listener de clique ao contêiner das abas.
      tabsContainer.addEventListener("click", (event) => {
        if (event.target.matches(".tab-link")) {
          const tabId = event.target.getAttribute("data-tab");
          if (tabId) {
            switchTab(tabId, user);
          }
        }
      });
    } else {
      console.log("Usuário não está logado. Redirecionando...");
      // Idealmente, redirecionar para a página de login.
      contentContainer.innerHTML = `<p>Você precisa estar logado para ver este conteúdo.</p>`;
    }
  });
});
