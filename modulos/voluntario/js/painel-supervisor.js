import { displaySupervisorProfile } from "./perfil-supervisor-view.js";
import { displaySupervised } from "./meus-supervisionados-view.js";
import { displayAppointments } from "./meus-agendamentos-view.js";
import { auth } from "../../../assets/js/firebase-init.js";

document.addEventListener("DOMContentLoaded", () => {
  const tabsContainer = document.getElementById("tabs-supervisor");
  const contentContainer = document.getElementById(
    "content-container-supervisor"
  );
  let initialTabLoaded = false;

  // Função para carregar o conteúdo da aba dinamicamente
  async function loadTabContent(tabId, user) {
    const contentDiv = document.getElementById(tabId);
    if (!contentDiv) return;

    // Remove o conteúdo existente para recarregar
    contentDiv.innerHTML = "";

    try {
      let module;
      switch (tabId) {
        case "meu-perfil-supervisor":
          await displaySupervisorProfile(user.uid);
          break;
        case "meus-supervisionados":
          await displaySupervised(user.uid);
          break;
        case "meus-agendamentos-supervisor":
          await displayAppointments(user.uid);
          break;
      }
    } catch (error) {
      console.error(`Erro ao carregar o conteúdo da aba ${tabId}:`, error);
      contentDiv.innerHTML = `<p>Ocorreu um erro ao carregar o conteúdo. Tente novamente.</p>`;
    }
  }

  // Função para trocar de abas
  function switchTab(tabId, user) {
    // Esconde todos os conteúdos
    contentContainer
      .querySelectorAll(".content-supervisor")
      .forEach((content) => {
        content.style.display = "none";
      });

    // Mostra o conteúdo da aba alvo
    const targetContent = document.getElementById(tabId);
    if (targetContent) {
      targetContent.style.display = "block";
      loadTabContent(tabId, user);
    }

    // --- INÍCIO DA CORREÇÃO ---
    // Atualiza o estado 'active' dos botões da aba.
    const targetButton = tabsContainer.querySelector(
      `.tab-link[data-tab="${tabId}"]`
    );
    if (targetButton) {
      // Garante que a busca por 'querySelectorAll' seja feita no container correto.
      tabsContainer
        .querySelectorAll(".tab-link")
        .forEach((btn) => btn.classList.remove("active"));
      targetButton.classList.add("active");
    }
    // --- FIM DA CORREÇÃO ---
  }

  // Monitora o estado de autenticação
  auth.onAuthStateChanged((user) => {
    if (user) {
      if (!initialTabLoaded) {
        const initialTab = "meu-perfil-supervisor";
        switchTab(initialTab, user); // Carrega a aba inicial
        initialTabLoaded = true;
      }

      tabsContainer.addEventListener("click", (event) => {
        if (event.target.matches(".tab-link")) {
          const tabId = event.target.getAttribute("data-tab");
          switchTab(tabId, user);
        }
      });
    } else {
      console.log("Usuário não está logado.");
      // Redirecionar para a página de login ou mostrar uma mensagem.
    }
  });
});
