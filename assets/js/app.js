// Arquivo: assets/js/app.js
// Versão: 3.1.0 (Corrigido e Funcional com Roteador Dinâmico)

import { auth, db, functions } from "./firebase-init.js";

document.addEventListener("DOMContentLoaded", function () {
  const loginView = document.getElementById("login-view");
  const dashboardView = document.getElementById("dashboard-view");
  let inactivityTimer;

  function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      alert("Você foi desconectado por inatividade.");
      auth.signOut();
    }, 20 * 60 * 1000); // 20 minutos
  }

  function setupInactivityListeners() {
    const events = [
      "mousemove",
      "mousedown",
      "keypress",
      "scroll",
      "touchstart",
    ];
    events.forEach((event) =>
      window.addEventListener(event, resetInactivityTimer, { passive: true })
    );
    resetInactivityTimer();
  }

  function handleAuth() {
    auth.onAuthStateChanged(async (user) => {
      try {
        if (user) {
          const userDoc = await db.collection("usuarios").doc(user.uid).get();
          // CORREÇÃO DEFINITIVA: Verifica se 'funcoes' é um ARRAY com itens.
          if (
            userDoc.exists &&
            Array.isArray(userDoc.data().funcoes) &&
            userDoc.data().funcoes.length > 0
          ) {
            const userData = userDoc.data();
            await setupDashboard(user, userData);
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

    const pathPrefix = "./";

    loginView.innerHTML = `
            <div class="login-container">
                <div class="login-card">
                    <img src="${pathPrefix}assets/img/logo-eupsico.png" alt="Logo EuPsico" class="login-logo">
                    <h2>Intranet EuPsico</h2>
                    <p>${message}</p>
                    <p class="login-email-info">Utilize seu e-mail @eupsico.org.br para acessar.</p>
                    <button id="login-button" class="login-button">Login com Google</button>
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

  async function setupDashboard(user, userData) {
    if (!loginView || !dashboardView) return;
    loginView.style.display = "none";
    dashboardView.style.display = "block";

    const userPhoto = document.getElementById("user-photo-header");
    const userGreeting = document.getElementById("user-greeting");
    const logoutButton = document.getElementById("logout-button-dashboard");

    if (userGreeting && userData.nome) {
      userGreeting.textContent = `${getGreeting()}, ${
        userData.nome.split(" ")[0]
      }!`;
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

    const visibleModules = getVisibleModules(userData);
    renderSidebarMenu(visibleModules);
    setupSidebarToggle();

    router(user, userData);
    window.addEventListener("hashchange", () => router(user, userData));
  }

  const modulesConfig = {
    admin: {
      id: "admin",
      titulo: "Painel do Admin",
      descricao: "Gestão central de usuários, permissões e sistema.",
      url: "#!/admin",
      roles: ["admin"],
      icon: `<i class="fas fa-user-shield"></i>`,
      modulePath: "./modulos/admin/js/painel-admin.js",
      pagePath: "./modulos/admin/page/painel-admin.html",
    },
    portal_voluntario: {
      id: "portal_voluntario",
      titulo: "Portal do Voluntário",
      descricao: "Avisos, notícias e ferramentas para todos os voluntários.",
      url: "#!/portal_voluntario",
      roles: ["todos"],
      icon: `<i class="fas fa-home"></i>`,
      modulePath: "./modulos/voluntario/js/portal-voluntario.js",
      pagePath: "./modulos/voluntario/page/portal-voluntario.html",
    },
    financeiro: {
      id: "financeiro",
      titulo: "Financeiro",
      descricao: "Acesso ao painel de controle financeiro e relatórios.",
      url: "#!/financeiro",
      roles: ["admin", "financeiro"],
      icon: `<i class="fas fa-dollar-sign"></i>`,
      modulePath: "./modulos/financeiro/js/painel-financeiro.js",
      pagePath: "./modulos/financeiro/page/painel-financeiro.html",
    },
    servico_social: {
      id: "servico_social",
      titulo: "Serviço Social",
      descricao: "Documentos, orientações e fichas para o serviço social.",
      url: "#!/servico_social",
      roles: ["admin", "servico_social"],
      icon: `<i class="fas fa-hands-helping"></i>`,
      modulePath: "./modulos/servico-social/js/servico-social-painel.js",
      pagePath: "./modulos/servico-social/page/servico-social-painel.html",
    },
    rh: {
      id: "rh",
      titulo: "Recursos Humanos",
      descricao:
        "Informações sobre vagas, comunicados e gestão de voluntários.",
      url: "#!/rh",
      roles: ["admin", "rh"],
      icon: `<i class="fas fa-users"></i>`,
      modulePath: "./modulos/rh/js/rh-painel.js",
      pagePath: "./modulos/rh/page/rh-painel.html",
    },
    trilha_paciente: {
      id: "trilha_paciente",
      titulo: "Trilha do Paciente",
      descricao:
        "Acompanhe o fluxo de pacientes desde a inscrição até o atendimento.",
      url: "#!/trilha_paciente",
      roles: ["admin", "assistente"],
      icon: `<i class="fas fa-route"></i>`,
      modulePath: "./modulos/trilha-paciente/js/trilha-paciente-painel.js",
      pagePath: "./modulos/trilha-paciente/page/trilha-paciente-painel.html",
    },
    captacao: {
      id: "captacao",
      titulo: "Captação",
      url: "#",
      roles: ["admin", "captacao"],
      icon: `<i class="fas fa-hand-holding-usd"></i>`,
    },
    grupos: {
      id: "grupos",
      titulo: "Grupos",
      url: "#",
      roles: ["admin", "grupos"],
      icon: `<i class="fas fa-users-cog"></i>`,
    },
    marketing: {
      id: "marketing",
      titulo: "Marketing",
      url: "#",
      roles: ["admin", "marketing"],
      icon: `<i class="fas fa-bullhorn"></i>`,
    },
  };

  async function router(user, userData) {
    const contentArea = document.getElementById("content-area");
    const pageTitleContainer = document.getElementById("page-title-container");
    if (!contentArea || !pageTitleContainer) return;

    const path = window.location.hash.slice(2) || "portal_voluntario";
    const module = modulesConfig[path];

    if (module) {
      // CORREÇÃO DEFINITIVA: Verificação de permissão baseada em ARRAY
      const userFuncoes = (userData.funcoes || []).map((f) => f.toLowerCase());
      const rolesLowerCase = (module.roles || []).map((r) => r.toLowerCase());
      const hasPermission =
        rolesLowerCase.includes("todos") ||
        userFuncoes.includes("admin") ||
        rolesLowerCase.some((role) => userFuncoes.includes(role));

      if (hasPermission) {
        pageTitleContainer.innerHTML = `<h1>${module.titulo}</h1>${
          module.descricao ? `<p>${module.descricao}</p>` : ""
        }`;
        contentArea.innerHTML =
          '<div class="text-center mt-5"><div class="spinner-border" role="status"><span class="sr-only">Carregando...</span></div></div>';

        // Carrega apenas módulos que tem um pagePath definido
        if (module.pagePath && module.modulePath) {
          try {
            const response = await fetch(module.pagePath);
            if (!response.ok)
              throw new Error(`Página não encontrada: ${module.pagePath}`);
            contentArea.innerHTML = await response.text();

            const jsModule = await import(module.modulePath);
            if (jsModule.init) {
              jsModule.init(db, user, userData, functions);
            } else {
              console.warn(
                `O módulo ${module.id} não possui uma função 'init' exportada.`
              );
            }
          } catch (error) {
            console.error(`Erro ao carregar o módulo ${module.id}:`, error);
            contentArea.innerHTML = `<h2>Falha ao carregar o módulo.</h2><p>${error.message}</p>`;
          }
        } else {
          contentArea.innerHTML = `<p>Este módulo está em desenvolvimento.</p>`;
        }
      } else {
        pageTitleContainer.innerHTML = "<h1>Acesso Negado</h1>";
        contentArea.innerHTML =
          "<p>Você não tem permissão para acessar esta área.</p>";
      }
    } else {
      pageTitleContainer.innerHTML = "<h1>Página não encontrada</h1>";
      contentArea.innerHTML =
        "<p>O recurso que você procurou não foi encontrado.</p>";
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
    )
      return;

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
      if (isCollapsed) layoutContainer.classList.add("sidebar-collapsed");
      toggleButton.setAttribute(
        "title",
        isCollapsed ? "Expandir menu" : "Recolher menu"
      );
    }

    toggleButton.addEventListener("click", handleToggle);
    overlay.addEventListener("click", handleToggle);

    sidebarMenu.addEventListener("click", (e) => {
      if (window.innerWidth <= 768 && e.target.closest("a")) {
        handleToggle();
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
    // CORREÇÃO DEFINITIVA: Lógica de visibilidade baseada em ARRAY
    const userFuncoes = (userData.funcoes || []).map((f) => f.toLowerCase());
    let modulesToShow = [];

    for (const key in modulesConfig) {
      const module = modulesConfig[key];
      const rolesLowerCase = (module.roles || []).map((r) => r.toLowerCase());

      let hasPermission = false;
      if (rolesLowerCase.includes("todos") || userFuncoes.includes("admin")) {
        hasPermission = true;
      } else if (rolesLowerCase.some((role) => userFuncoes.includes(role))) {
        hasPermission = true;
      }

      if (hasPermission) {
        modulesToShow.push(module);
      }
    }

    modulesToShow.sort((a, b) => {
      if (a.titulo === "Portal do Voluntário") return -1;
      if (b.titulo === "Portal do Voluntário") return 1;
      if (a.titulo === "Painel do Admin") return -1;
      if (b.titulo === "Painel do Admin") return 1;
      return a.titulo.localeCompare(b.titulo);
    });

    return modulesToShow;
  }

  handleAuth();
});
