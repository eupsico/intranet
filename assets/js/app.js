// Arquivo: assets/js/app.js
// Versão: 2.1 (CORRIGIDO E ATUALIZADO)

import { auth, db, functions } from "./firebase-init.js";

// Função exportada para uso em outros módulos
export async function carregarProfissionais(db, funcao, selectElement) {
  if (!selectElement) return;
  try {
    const snapshot = await db
      .collection("usuarios")
      .where("funcoes", "array-contains", funcao)
      .orderBy("nome")
      .get();
    if (snapshot.empty) {
      selectElement.innerHTML =
        '<option value="">Nenhum profissional encontrado</option>';
      return;
    }
    let options = '<option value="">Selecione um profissional</option>';
    snapshot.forEach((doc) => {
      options += `<option value="${doc.id}">${doc.data().nome}</option>`;
    });
    selectElement.innerHTML = options;
  } catch (error) {
    console.error(
      `Erro ao carregar profissionais com a função ${funcao}:`,
      error
    );
    selectElement.innerHTML = '<option value="">Erro ao carregar</option>';
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const loginView = document.getElementById("login-view");
  const dashboardView = document.getElementById("dashboard-view");
  let inactivityTimer;

  function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      alert("Você foi desconectado por inatividade.");
      auth.signOut();
    }, 20 * 60 * 1000);
  }

  function setupInactivityListeners() {
    window.addEventListener("mousemove", resetInactivityTimer);
    window.addEventListener("mousedown", resetInactivityTimer);
    window.addEventListener("keypress", resetInactivityTimer);
    window.addEventListener("scroll", resetInactivityTimer);
    window.addEventListener("touchstart", resetInactivityTimer);
    resetInactivityTimer();
  }

  function handleAuth() {
    auth.onAuthStateChanged(async (user) => {
      try {
        if (user) {
          const userDoc = await db.collection("usuarios").doc(user.uid).get();
          if (userDoc.exists && userDoc.data().funcoes?.length > 0) {
            const userData = userDoc.data();
            await renderLayoutAndContent(user, userData);
            setupInactivityListeners();
          } else {
            renderAccessDenied();
          }
        } else {
          renderLogin();
        }
      } catch (error) {
        console.error("Erro de autenticação:", error);
        renderLogin(`Ocorreu um erro: ${error.message}`);
        auth.signOut();
      }
    });
  }

  function renderLogin(message = "Por favor, faça login para continuar.") {
    if (!loginView || !dashboardView) return;
    dashboardView.style.display = "none";
    loginView.style.display = "block";

    const isSubPage = window.location.pathname.includes("/modulos/");
    const pathPrefix = isSubPage ? "../../../" : "./";

    loginView.innerHTML = `
                    <div class="login-container">
                        <div class="login-card">
                            <img src="${pathPrefix}assets/img/logo-eupsico.png" alt="Logo EuPsico" class="login-logo">
                            <h2>Intranet EuPsico</h2>
                            <p>${message}</p>
                          <p class="login-email-info" style="font-size: 0.9em; font-weight: 500; color: var(--cor-primaria); background-color: var(--cor-fundo); padding: 10px; border-radius: 5px; margin-top: 20px; margin-bottom: 25px;">Utilize seu e-mail @eupsico.org.br para acessar.</p>
                          <button id="login-button" class="action-button login-button">Login EuPsico</button>
                        </div>
                    </div>`;
    document.getElementById("login-button").addEventListener("click", () => {
      loginView.innerHTML = `<p style="text-align:center; margin-top: 50px;">Aguarde...</p>`;
      const provider = new firebase.auth.GoogleAuthProvider();
      auth.signInWithPopup(provider).catch((error) => console.error(error));
    });
  }

  function renderAccessDenied() {
    if (!loginView || !dashboardView) return;
    dashboardView.style.display = "none";
    loginView.style.display = "block";
    loginView.innerHTML = `<div class="content-box" style="max-width: 800px; margin: 50px auto; text-align: center;"><h2>Acesso Negado</h2><p>Você está autenticado, mas seu usuário não tem permissões definidas. Contate o administrador.</p><button id="denied-logout">Sair</button></div>`;
    document
      .getElementById("denied-logout")
      .addEventListener("click", () => auth.signOut());
  }

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Bom dia";
    if (hour >= 12 && hour < 18) return "Boa tarde";
    return "Boa noite";
  }

  async function renderLayoutAndContent(user, userData) {
    if (!loginView || !dashboardView) return;
    loginView.style.display = "none";
    dashboardView.style.display = "block";

    const userPhoto = document.getElementById("user-photo-header");
    const userGreeting = document.getElementById("user-greeting");
    const logoutButton = document.getElementById("logout-button-dashboard");

    if (userGreeting) {
      try {
        if (userData && userData.nome) {
          const firstName = userData.nome.split(" ")[0];
          userGreeting.textContent = `${getGreeting()}, ${firstName}!`;
        } else {
          userGreeting.textContent = getGreeting();
        }
      } catch (e) {
        console.warn("Não foi possível montar a saudação completa:", e);
        userGreeting.textContent = "Olá!";
      }
    }
    if (userPhoto) {
      userPhoto.src =
        user.photoURL ||
        "https://www.eupsico.org.br/wp-content/uploads/2024/02/user-1.png";
    }
    if (logoutButton) {
      logoutButton.addEventListener("click", (e) => {
        e.preventDefault();
        auth.signOut();
      });
    }

    const modules = getVisibleModules(userData);
    setupSidebarToggle();
    renderSidebarMenu(modules);
    if (window.location.pathname.includes("painel-financeiro.html")) {
      const pageTitleContainer = document.getElementById(
        "page-title-container"
      );
      if (pageTitleContainer) {
        pageTitleContainer.innerHTML = `
                            <h1>Painel Financeiro</h1>
                            <p>Gestão de pagamentos, cobranças e relatórios.</p>
                        `;
      }
      try {
        const financeModule = await import(
          "../../modulos/financeiro/js/painel-financeiro.js"
        );
        financeModule.initFinancePanel(user, db, userData);
      } catch (error) {
        console.error("Erro ao carregar o módulo financeiro:", error);
        document.getElementById("content-area").innerHTML =
          "<h2>Falha ao carregar o painel financeiro.</h2>";
      }
    } else if (
      window.location.pathname.includes("administrativo-painel.html")
    ) {
      const pageTitleContainer = document.getElementById(
        "page-title-container"
      );
      if (pageTitleContainer) {
        pageTitleContainer.innerHTML = `
                            <h2>Painel Administrativo</h2>
                            <p>Gestão de configurações e dados dos usuários.</p>
                        `;
      }
      try {
        const administrativoModule = await import(
          "../../modulos/administrativo/js/administrativo-painel.js"
        );
        administrativoModule.initadministrativoPanel(user, db, userData);
      } catch (error) {
        console.error("Erro ao carregar o módulo administrativo:", error);
        document.getElementById("content-area").innerHTML =
          "<h2>Falha ao carregar o painel administrativo.</h2>";
      }
    } else if (
      window.location.pathname.includes("trilha-paciente-painel.html")
    ) {
      const pageTitleContainer = document.getElementById(
        "page-title-container"
      );
      if (pageTitleContainer) {
        pageTitleContainer.innerHTML = `
                            <h2>Trilha do Paciente</h2>
                            <p>Acompanhe o fluxo de pacientes desde a inscrição até o atendimento.</p>
                        `;
      }
      try {
        const trilhaModule = await import(
          "../../modulos/trilha-paciente/js/trilha-paciente-painel.js"
        );
        trilhaModule.init(db, user, userData);
      } catch (error) {
        console.error("Erro ao carregar o módulo Trilha do Paciente:", error);
        document.getElementById("content-area").innerHTML =
          "<h2>Falha ao carregar a Trilha do Paciente.</h2>";
      }
    } else if (
      window.location.pathname.includes("servico-social-painel.html")
    ) {
      const pageTitleContainer = document.getElementById(
        "page-title-container"
      );
      if (pageTitleContainer) {
        pageTitleContainer.innerHTML = `
                            <h2>Serviço Social</h2>
                            <p>Gestão de triagens, reavaliações.</p>
                        `;
      }
      try {
        const socialModule = await import(
          "../../modulos/servico-social/js/servico-social-painel.js"
        );
        socialModule.initsocialPanel(user, db, userData, functions);
      } catch (error) {
        console.error("Erro ao carregar o módulo Serviço Social:", error);
        document.getElementById("content-area").innerHTML =
          "<h2>Falha ao carregar o painel serviço social.</h2>";
      }
    } else if (window.location.pathname.includes("rh-painel.html")) {
      const pageTitleContainer = document.getElementById(
        "page-title-container"
      );
      if (pageTitleContainer) {
        pageTitleContainer.innerHTML = `
                            <h2>Recursos Humanos</h2>
                            <p>Gestão de profissionais, vagas e comunicados.</p>
                        `;
      }
      try {
        const rhModule = await import("../../modulos/rh/js/rh-painel.js");
        rhModule.initrhPanel(user, db, userData);
      } catch (error) {
        console.error("Erro ao carregar o módulo de Recursos Humanos:", error);
        document.getElementById("content-area").innerHTML =
          "<h2>Falha ao carregar o painel R.H.</h2>";
      }
    } else {
      const pageTitleContainer = document.getElementById(
        "page-title-container"
      );
      if (pageTitleContainer) {
        pageTitleContainer.innerHTML = "<h1>Intranet EuPsico</h1>";
      }
      renderSidebarMenu(modules);
    }
  }

  function setupSidebarToggle() {
    const layoutContainer = document.querySelector(".layout-container");
    const sidebar = document.querySelector(".sidebar");
    const toggleButton = document.getElementById("sidebar-toggle");
    const overlay = document.getElementById("menu-overlay");
    const sidebarMenu = document.getElementById("sidebar-menu");

    if (
      !layoutContainer ||
      !toggleButton ||
      !sidebar ||
      !overlay ||
      !sidebarMenu
    ) {
      return;
    }

    const handleToggle = () => {
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        sidebar.classList.toggle("is-visible");
        layoutContainer.classList.toggle("mobile-menu-open");
      } else {
        const currentlyCollapsed =
          layoutContainer.classList.toggle("sidebar-collapsed");
        localStorage.setItem("sidebarCollapsed", currentlyCollapsed);
        toggleButton.setAttribute(
          "title",
          currentlyCollapsed ? "Expandir menu" : "Recolher menu"
        );
      }
    };

    if (window.innerWidth > 768) {
      const isCollapsed = localStorage.getItem("sidebarCollapsed") === "true";
      if (isCollapsed) {
        layoutContainer.classList.add("sidebar-collapsed");
      }
      toggleButton.setAttribute(
        "title",
        isCollapsed ? "Expandir menu" : "Recolher menu"
      );
    }

    toggleButton.addEventListener("click", handleToggle);
    overlay.addEventListener("click", handleToggle);

    sidebarMenu.addEventListener("click", (e) => {
      if (window.innerWidth <= 768) {
        if (e.target.closest("a")) {
          handleToggle();
        }
      }
    });
  }

  function renderSidebarMenu(modules) {
    const menu = document.getElementById("sidebar-menu");
    if (!menu) return;
    menu.innerHTML = "";
    modules.forEach((config) => {
      const menuItem = document.createElement("li");
      const link = document.createElement("a");
      link.href = config.url;
      link.innerHTML = `${config.icon || ""}<span>${config.titulo}</span>`;
      menuItem.appendChild(link);
      menu.appendChild(menuItem);
    });
  }

  function getVisibleModules(userData) {
    const icons = {
      intranet: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 12c0-5.25-4.25-9.5-9.5-9.5S2.5 6.75 2.5 12s4.25 9.5 9.5 9.5s9.5-4.25 9.5-9.5Z"/><path d="M12 2.5v19"/><path d="M2.5 12h19"/></svg>`,
      administrativo: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>`,
      captacao: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>`,
      financeiro: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
      grupos: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
      marketing: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>`,
      rh: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>`,
      supervisao: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
      servico_social: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
      trilha_paciente: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>`,
    };

    const areas = {
      portal_voluntario: {
        titulo: "Portal do Voluntário",
        descricao: "Avisos, notícias e ferramentas para todos os voluntários.",
        url: "./modulos/voluntario/page/portal-voluntario.html",
        roles: ["todos"],
        icon: icons.intranet,
      },
      administrativo: {
        titulo: "Administrativo",
        descricao: "Acesso aos processos, documentos e organização da equipe.",
        url: "./modulos/administrativo/page/administrativo-painel.html",
        roles: ["admin", "gestor", "assistente"],
        icon: icons.administrativo,
      },
      trilha_paciente: {
        titulo: "Trilha do Paciente",
        descricao:
          "Acompanhe o fluxo de pacientes desde a inscrição até o atendimento.",
        url: "./modulos/trilha-paciente/page/trilha-paciente-painel.html",
        roles: ["admin", "assistente"],
        icon: icons.trilha_paciente,
      },
      captacao: {
        titulo: "Captação",
        descricao:
          "Ferramentas e informações para a equipe de captação de recursos.",
        url: "#",
        roles: ["admin", "captacao"],
        icon: icons.captacao,
      },
      financeiro: {
        titulo: "Financeiro",
        descricao: "Acesso ao painel de controle financeiro e relatórios.",
        url: "./modulos/financeiro/page/painel-financeiro.html",
        roles: ["admin", "financeiro"],
        icon: icons.financeiro,
      },
      grupos: {
        titulo: "Grupos",
        descricao:
          "Informações e materiais para a equipe de coordenação de grupos.",
        url: "#",
        roles: ["admin", "grupos"],
        icon: icons.grupos,
      },
      marketing: {
        titulo: "Marketing",
        descricao: "Acesso aos materiais de marketing e campanhas da EuPsico.",
        url: "#",
        roles: ["admin", "marketing"],
        icon: icons.marketing,
      },
      rh: {
        titulo: "Recursos Humanos",
        descricao:
          "Informações sobre vagas, comunicados e gestão de voluntários.",
        url: "./modulos/rh/page/rh-painel.html",
        roles: ["admin", "rh"],
        icon: icons.rh,
      },
      servico_social: {
        titulo: "Serviço Social",
        descricao: "Documentos, orientações e fichas para o serviço social.",
        url: "./modulos/servico-social/page/servico-social-painel.html",
        roles: ["admin", "servico_social"],
        icon: icons.servico_social,
      },
    };

    const userFuncoes = (userData.funcoes || []).map((f) => f.toLowerCase());
    let modulesToShow = [];
    for (const key in areas) {
      const area = areas[key];
      const rolesLowerCase = (area.roles || []).map((r) => r.toLowerCase());
      let hasPermission = false;
      if (userFuncoes.includes("admin") || rolesLowerCase.includes("todos")) {
        hasPermission = true;
      } else if (rolesLowerCase.some((role) => userFuncoes.includes(role))) {
        hasPermission = true;
      }
      if (hasPermission) {
        modulesToShow.push(area);
      }
    }
    modulesToShow.sort((a, b) => {
      if (a.titulo === "Portal do Voluntário") return -1;
      if (b.titulo === "Portal do Voluntário") return 1;
      return a.titulo.localeCompare(b.titulo);
    });
    return modulesToShow;
  }

  handleAuth();
});
