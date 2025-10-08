// Arquivo: /modulos/voluntario/js/painel-supervisor.js
// Versão: 3.0 (Corrigida e Refatorada)
// Descrição: Controla as abas do Painel do Supervisor, carregando dados e módulos dinamicamente.

import { auth, db, doc, getDoc } from "../../../assets/js/firebase-init.js";
import { init as initPerfil } from "./perfil-supervisor-view.js";
import { init as initSupervisionados } from "./meus-supervisionados-view.js";
import { init as initAgendamentos } from "./meus-agendamentos-view.js";

document.addEventListener("DOMContentLoaded", () => {
  const tabsContainer = document.getElementById("painel-supervisor-tabs");
  const contentContainer = document.getElementById("painel-supervisor-content");
  let initialTabLoaded = false;

  /**
   * Busca os dados do usuário logado a partir do Firestore.
   * @param {string} uid - O ID do usuário autenticado.
   * @returns {object|null} - Os dados do usuário ou null se não encontrado.
   */
  async function getUserData(uid) {
    if (!uid) return null;
    try {
      const userRef = doc(db, "usuarios", uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        return userSnap.data();
      } else {
        console.error(
          "Documento do supervisor não encontrado na coleção 'usuarios'."
        );
        return null;
      }
    } catch (error) {
      console.error("Erro ao buscar dados do supervisor:", error);
      return null;
    }
  }

  /**
   * Carrega o HTML e executa o script de uma aba específica.
   * @param {string} tabId - O ID da aba (ex: "perfil-supervisor-view").
   * @param {object} user - O objeto de usuário do Firebase Auth.
   * @param {object} userData - Os dados do Firestore do usuário.
   */
  async function loadTabContent(tabId, user, userData) {
    if (!contentContainer) return;
    contentContainer.innerHTML = '<div class="loading-spinner"></div>';

    try {
      // Carrega o arquivo HTML correspondente à aba
      const htmlResponse = await fetch(`../page/${tabId}.html`);
      if (!htmlResponse.ok) {
        throw new Error(
          `Arquivo HTML para a aba '${tabId}' não foi encontrado.`
        );
      }
      contentContainer.innerHTML = await htmlResponse.text();

      // Com base no ID da aba, chama a função 'init' do módulo correto
      switch (tabId) {
        case "perfil-supervisor-view":
          await initPerfil(user, userData);
          break;
        case "meus-supervisionados-view":
          await initSupervisionados(user, userData);
          break;
        case "meus-agendamentos-view":
          await initAgendamentos(user, userData);
          break;
        default:
          throw new Error(`Ação para a aba '${tabId}' não definida.`);
      }
    } catch (error) {
      console.error(`Erro ao carregar o conteúdo da aba ${tabId}:`, error);
      contentContainer.innerHTML = `<p class="alert alert-error">Ocorreu um erro ao carregar o conteúdo desta aba.</p>`;
    }
  }

  /**
   * Gerencia a troca de abas, atualizando a interface e iniciando o carregamento.
   * @param {string} tabId - O ID da aba de destino.
   * @param {object} user - O objeto do usuário autenticado.
   * @param {object} userData - Os dados do Firestore do usuário.
   */
  function switchTab(tabId, user, userData) {
    if (!tabsContainer) return;

    // Atualiza o estado 'active' dos botões
    tabsContainer.querySelectorAll(".tab-link").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tabId);
    });

    // Carrega o conteúdo da aba selecionada
    loadTabContent(tabId, user, userData);
  }

  // Monitora o estado de autenticação para iniciar o painel
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      const userData = await getUserData(user.uid);

      if (!userData) {
        contentContainer.innerHTML = `<p class="alert alert-error">Não foi possível carregar seus dados de perfil. Por favor, contate o suporte.</p>`;
        return;
      }

      // Garante que a aba inicial seja carregada apenas uma vez
      if (!initialTabLoaded) {
        const initialTab = "perfil-supervisor-view";
        switchTab(initialTab, user, userData);
        initialTabLoaded = true;
      }

      // Adiciona o listener de clique ao contêiner das abas (uma única vez)
      if (!tabsContainer.dataset.listenerAttached) {
        tabsContainer.addEventListener("click", (event) => {
          if (event.target.matches(".tab-link")) {
            const tabId = event.target.getAttribute("data-tab");
            if (tabId) {
              switchTab(tabId, user, userData);
            }
          }
        });
        tabsContainer.dataset.listenerAttached = "true";
      }
    } else {
      console.log("Usuário não está logado.");
      contentContainer.innerHTML = `<p>Você precisa estar logado para acessar este painel.</p>`;
    }
  });
});
