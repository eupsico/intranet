// Arquivo: assets/js/app.js
// Versão: 4.2.1 (Final, Completo e Funcional)

import { auth, db, functions } from "./firebase-init.js";

document.addEventListener("DOMContentLoaded", function () {
  const loginView = document.getElementById("login-view");
  const dashboardView = document.getElementById("dashboard-view");

  // --- CONFIGURAÇÃO CENTRAL DE MÓDULOS ---
  // Todos os módulos da intranet são definidos aqui.
  const modulesConfig = {
    home: {
      id: "home",
      titulo: "Página Inicial",
      descricao: "Visão geral da intranet, com notícias e acesso rápido.",
      url: "#!/home",
      roles: ["todos"],
      icon: `<i class="fas fa-home"></i>`,
      modulePath: "./modulos/voluntario/js/portal-voluntario.js",
    },
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
    administrativo: {
      id: "administrativo",
      titulo: "Administrativo",
      descricao: "Processos, documentos e organização da equipe.",
      url: "#!/administrativo",
      roles: ["admin", "gestor", "assistente"],
      icon: `<i class="fas fa-file-alt"></i>`,
      modulePath: "./modulos/administrativo/js/administrativo-painel.js",
      pagePath: "./modulos/administrativo/page/administrativo-painel.html",
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
    supervisao: {
      id: "supervisao",
      titulo: "Supervisão",
      url: "#",
      roles: ["admin", "supervisao"],
      icon: `<i class="fas fa-eye"></i>`,
    },
  };

  function handleAuth() {
    auth.onAuthStateChanged(async (user) => {
      try {
        if (user) {
          const userDoc = await db.collection("usuarios").doc(user.uid).get();
          if (
            userDoc.exists &&
            typeof userDoc.data().funcoes === "object" &&
            Object.keys(userDoc.data().funcoes).length > 0
          ) {
            const userData = userDoc.data();
            setupDashboard(user, userData);
          } else {
            renderAccessDenied();
          }
        } else {
          renderLogin();
        }
      } catch (error) {
        console.error("Erro de autenticação:", error);
        renderLogin(`Ocorreu um erro: ${error.message}`);
      }
    });
  }

  function setupDashboard(user, userData) {
    loginView.style.display = "none";
    dashboardView.style.display = "block";

    const userGreeting = document.getElementById("user-greeting");
    if (userGreeting)
      userGreeting.textContent = `Olá, ${userData.nome.split(" ")[0]}!`;
    document.getElementById("user-photo-header").src =
      user.photoURL || "./assets/img/avatar-padrao.png";
    document
      .getElementById("logout-button-dashboard")
      .addEventListener("click", (e) => {
        e.preventDefault();
        auth.signOut();
      });

    const visibleModules = getVisibleModules(userData);
    renderSidebarMenu(visibleModules);
    setupSidebarToggle();

    router(user, userData);
    window.addEventListener("hashchange", () => router(user, userData));
  }

  async function router(user, userData) {
    const institutionalContent = document.getElementById(
      "institutional-content"
    );
    const contentArea = document.getElementById("content-area");
    const pageTitleContainer = document.getElementById("page-title-container");

    const path = window.location.hash.slice(2) || "home";
    const module = modulesConfig[path];

    if (!module || !hasPermission(module, userData)) {
      pageTitleContainer.innerHTML = `<h1>Acesso Negado</h1><p>Você não tem permissão ou a página não existe.</p>`;
      institutionalContent.style.display = "none";
      contentArea.style.display = "block";
      contentArea.innerHTML = `<p class="text-center">Por favor, selecione uma opção válida no menu.</p>`;
      updateActiveMenuLink();
      return;
    }

    pageTitleContainer.innerHTML = `<h1>${module.titulo}</h1><p>${
      module.descricao || ""
    }</p>`;

    if (path === "home") {
      institutionalContent.style.display = "block";
      contentArea.style.display = "none";
      try {
        const dynamicHomeContent = document.getElementById(
          "dynamic-home-content"
        );
        if (!dynamicHomeContent.querySelector("#nav-links")) {
          dynamicHomeContent.innerHTML = `
                        <section id="quick-access-modules" class="dashboard-section" style="background: transparent; box-shadow: none; padding: 0;">
                            <div class="section-header"><h2>Acesso Rápido</h2></div>
                            <div id="nav-links" class="modules-grid"><div class="loading-spinner"></div></div>
                        </section>`;
        }
        const jsModule = await import(module.modulePath);
        if (jsModule.init) {
          jsModule.init(db, user, userData, functions, modulesConfig);
        }
      } catch (error) {
        console.error("Erro ao carregar JS da home:", error);
        const dynamicHomeContent = document.getElementById(
          "dynamic-home-content"
        );
        if (dynamicHomeContent)
          dynamicHomeContent.innerHTML =
            "<p>Erro ao carregar conteúdo dinâmico.</p>";
      }
    } else {
      institutionalContent.style.display = "none";
      contentArea.style.display = "block";
      contentArea.innerHTML = `<div class="loading-spinner"></div>`;

      if (module.pagePath && module.modulePath) {
        try {
          const response = await fetch(module.pagePath);
          if (!response.ok)
            throw new Error(
              `Arquivo HTML do módulo não encontrado: ${module.pagePath}`
            );
          contentArea.innerHTML = await response.text();

          const jsModule = await import(module.modulePath);
          if (jsModule.init) {
            jsModule.init(db, user, userData, functions);
          }
        } catch (error) {
          console.error(`Erro ao carregar módulo ${path}:`, error);
          contentArea.innerHTML = `<h2>Falha ao carregar o módulo.</h2><p>${error.message}</p>`;
        }
      } else {
        contentArea.innerHTML = `<div class="info-card"><h3 style="text-align: center;">Módulo em Desenvolvimento</h3><p style="text-align: center;">Este módulo ainda não está disponível.</p></div>`;
      }
    }
    updateActiveMenuLink();
  }

  function getVisibleModules(userData) {
    return Object.values(modulesConfig)
      .filter((module) => hasPermission(module, userData))
      .sort((a, b) => {
        if (a.id === "home") return -1;
        if (b.id === "home") return 1;
        if (a.id === "admin") return -1;
        if (b.id === "admin") return 1;
        return a.titulo.localeCompare(b.titulo);
      });
  }

  function hasPermission(module, userData) {
    const userFuncoes = userData.funcoes || {};
    if (userFuncoes.admin === true) return true;

    const roles = module.roles || [];
    if (roles.includes("todos")) return true;

    return roles.some((role) => userFuncoes[role] === true);
  }

  function renderSidebarMenu(modules) {
    const menu = document.getElementById("sidebar-menu");
    if (!menu) return;
    menu.innerHTML = modules
      .map(
        (m) =>
          `<li><a href="${m.url}" data-view-id="${m.id}">${m.icon}<span>${m.titulo}</span></a></li>`
      )
      .join("");
  }

  function updateActiveMenuLink() {
    const pathId = window.location.hash.slice(2) || "home";
    document.querySelectorAll("#sidebar-menu a").forEach((link) => {
      link.classList.toggle("active", link.dataset.viewId === pathId);
    });
  }

  function renderLogin(message = "Por favor, faça login para continuar.") {
    if (!loginView || !dashboardView) return;
    dashboardView.style.display = "none";
    loginView.style.display = "block";
    loginView.innerHTML = `
            <div class="login-container">
                <div class="login-card">
                    <img src="./assets/img/logo-eupsico.png" alt="Logo EuPsico" class="login-logo">
                    <h2>Intranet EuPsico</h2>
                    <p>${message}</p>
                    <p class="login-email-info" style="font-size: 0.9em; font-weight: 500; color: var(--cor-primaria); background-color: var(--cor-fundo); padding: 10px; border-radius: 5px; margin-top: 20px; margin-bottom: 25px;">Utilize seu e-mail @eupsico.org.br para acessar.</p>
                    <button id="login-button" class="action-button login-button">Login com Google</button>
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
    loginView.innerHTML = `
            <div class="login-container">
                <div class="login-card">
                    <h2>Acesso Negado</h2>
                    <p>Você está autenticado, mas seu usuário não tem permissões definidas. Contate o administrador.</p>
                    <button id="denied-logout" class="action-button btn-secondary" style="margin-top: 20px;">Sair</button>
                </div>
            </div>`;
    document
      .getElementById("denied-logout")
      .addEventListener("click", () => auth.signOut());
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

  handleAuth();
});
