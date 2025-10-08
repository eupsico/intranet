// Arquivo: /modulos/voluntario/js/painel-supervisor.js
// Versão: 3.1 (Com Logs de Depuração)
// Descrição: Controla as abas do Painel do Supervisor, carregando dados e módulos dinamicamente.

import { auth, db, doc, getDoc } from "../../../assets/js/firebase-init.js";
import { init as initPerfil } from "./perfil-supervisor-view.js";
import { init as initSupervisionados } from "./meus-supervisionados-view.js";
import { init as initAgendamentos } from "./meus-agendamentos-view.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log(
    "[PAINEL SUPERVISOR] Passo 1: O DOM foi completamente carregado."
  );

  const tabsContainer = document.getElementById("painel-supervisor-tabs");
  const contentContainer = document.getElementById("painel-supervisor-content");
  let initialTabLoaded = false;
  let eventListenerAttached = false; // Flag para controlar o listener de clique

  /**
   * Busca os dados do usuário logado a partir do Firestore.
   */
  async function getUserData(uid) {
    console.log(
      `[PAINEL SUPERVISOR] Passo 3.1: Buscando dados do usuário (userData) para o UID: ${uid}`
    );
    if (!uid) {
      console.error(
        "[PAINEL SUPERVISOR] ERRO: UID não fornecido para getUserData."
      );
      return null;
    }
    try {
      // ATENÇÃO: Verifique se a coleção é "usuarios" ou "users" no seu Firestore.
      const userRef = doc(db, "usuarios", uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        console.log(
          "[PAINEL SUPERVISOR] Passo 3.2: Documento do usuário encontrado.",
          userSnap.data()
        );
        return userSnap.data();
      } else {
        console.error(
          "[PAINEL SUPERVISOR] ERRO: Documento do supervisor não encontrado na coleção 'usuarios'."
        );
        return null;
      }
    } catch (error) {
      console.error(
        "[PAINEL SUPERVISOR] ERRO ao buscar dados do supervisor:",
        error
      );
      return null;
    }
  }

  /**
   * Carrega o HTML e executa o script de uma aba específica.
   */
  async function loadTabContent(tabId, user, userData) {
    console.group(`[PAINEL SUPERVISOR] Carregando Aba: ${tabId}`);
    if (!contentContainer) {
      console.error(
        "[PAINEL SUPERVISOR] Container de conteúdo não encontrado. Abortando."
      );
      console.groupEnd();
      return;
    }
    contentContainer.innerHTML = '<div class="loading-spinner"></div>';
    console.log("[PAINEL SUPERVISOR] Spinner de carregamento exibido.");

    try {
      const htmlPath = `../page/${tabId}.html`;
      console.log(`[PAINEL SUPERVISOR] Buscando HTML em: ${htmlPath}`);
      const htmlResponse = await fetch(htmlPath);
      if (!htmlResponse.ok)
        throw new Error(`Arquivo HTML '${htmlPath}' não encontrado.`);

      contentContainer.innerHTML = await htmlResponse.text();
      console.log("[PAINEL SUPERVISOR] HTML carregado e inserido na página.");

      console.log(
        `[PAINEL SUPERVISOR] Chamando a função 'init' do módulo correspondente para '${tabId}'...`
      );
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
      console.log(
        `[PAINEL SUPERVISOR] Função 'init' para '${tabId}' finalizada.`
      );
    } catch (error) {
      console.error(
        `[PAINEL SUPERVISOR] ERRO CRÍTICO ao carregar a aba ${tabId}:`,
        error
      );
      contentContainer.innerHTML = `<p class="alert alert-error">Ocorreu um erro ao carregar o conteúdo desta aba.</p>`;
    } finally {
      console.groupEnd();
    }
  }

  /**
   * Gerencia a troca de abas.
   */
  function switchTab(tabId, user, userData) {
    console.log(`[PAINEL SUPERVISOR] Trocando para a aba: ${tabId}`);
    if (!tabsContainer) return;

    tabsContainer.querySelectorAll(".tab-link").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tabId);
    });

    loadTabContent(tabId, user, userData);
  }

  // Monitora o estado de autenticação para iniciar o painel
  auth.onAuthStateChanged(async (user) => {
    console.log(
      "[PAINEL SUPERVISOR] Passo 2: Verificando estado de autenticação..."
    );
    if (user) {
      console.log("[PAINEL SUPERVISOR] Passo 3: Usuário autenticado.", {
        uid: user.uid,
        email: user.email,
      });

      const userData = await getUserData(user.uid);
      if (!userData) {
        contentContainer.innerHTML = `<p class="alert alert-error">Falha crítica: Não foi possível carregar os dados do seu perfil do banco de dados.</p>`;
        return;
      }
      console.log(
        "[PAINEL SUPERVISOR] Passo 4: Dados do usuário (userData) carregados com sucesso."
      );

      if (!initialTabLoaded) {
        const initialTab = "perfil-supervisor-view";
        console.log(
          `[PAINEL SUPERVISOR] Passo 5: Carregando aba inicial: ${initialTab}`
        );
        switchTab(initialTab, user, userData);
        initialTabLoaded = true;
      }

      // Garante que o listener de clique seja adicionado apenas uma vez
      if (!eventListenerAttached) {
        tabsContainer.addEventListener("click", (event) => {
          if (event.target.matches(".tab-link")) {
            const tabId = event.target.getAttribute("data-tab");
            if (tabId) {
              switchTab(tabId, user, userData);
            }
          }
        });
        eventListenerAttached = true;
        console.log(
          "[PAINEL SUPERVISOR] Passo 6: Listener de clique nas abas foi configurado."
        );
      }
    } else {
      console.warn(
        "[PAINEL SUPERVISOR] Usuário não está logado. Redirecionando..."
      );
      contentContainer.innerHTML = `<p>Você precisa estar logado para acessar este painel.</p>`;
      // window.location.href = '/login.html'; // Descomente para redirecionar
    }
  });
});
