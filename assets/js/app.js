// Arquivo: assets/js/app.js
// Versão: 4.0.0 (Arquitetura Híbrida - Base Sólida)

import { auth, db, functions } from "./firebase-init.js";

document.addEventListener("DOMContentLoaded", function () {
  const loginView = document.getElementById("login-view");
  const dashboardView = document.getElementById("dashboard-view");

  // Configuração central de todos os módulos da intranet
  const modulesConfig = {
    home: {
      id: "home",
      titulo: "Página Inicial",
      descricao: "Visão geral da intranet, com notícias e acesso rápido.",
      url: "#!/home",
      roles: ["todos"],
      icon: `<i class="fas fa-home"></i>`,
      // O conteúdo da home é parte do index.html, mas seu JS controla partes dinâmicas
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
      roles: ["admin", "administrativo"], // Defina as roles corretas
      icon: `<i class="fas fa-file-alt"></i>`,
      modulePath: "./modulos/administrativo/js/administrativo-painel.js",
      pagePath: "./modulos/administrativo/page/administrativo-painel.html",
    },
    financeiro: {
      id: "financeiro",
      titulo: "Financeiro",
      url: "#!/financeiro",
      roles: ["admin", "financeiro"],
      icon: `<i class="fas fa-dollar-sign"></i>`,
      modulePath: "./modulos/financeiro/js/painel-financeiro.js",
      pagePath: "./modulos/financeiro/page/painel-financeiro.html",
    },
    // Adicione outros módulos aqui...
  };

  function handleAuth() {
    auth.onAuthStateChanged(async (user) => {
      try {
        if (user) {
          const userDoc = await db.collection("usuarios").doc(user.uid).get();
          if (
            userDoc.exists &&
            Array.isArray(userDoc.data().funcoes) &&
            userDoc.data().funcoes.length > 0
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

    // Configura header e sidebar
    const userGreeting = document.getElementById("user-greeting");
    if (userGreeting)
      userGreeting.textContent = `Olá, ${userData.nome.split(" ")[0]}!`;
    document.getElementById("user-photo-header").src =
      user.photoURL || "./assets/img/avatar-padrao.png";
    document
      .getElementById("logout-button-dashboard")
      .addEventListener("click", () => auth.signOut());

    const visibleModules = getVisibleModules(userData);
    renderSidebarMenu(visibleModules);
    setupSidebarToggle();

    // Inicia o roteador e escuta por mudanças na URL
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
      return;
    }

    // Atualiza o título do header
    pageTitleContainer.innerHTML = `<h1>${module.titulo}</h1><p>${
      module.descricao || ""
    }</p>`;

    if (path === "home") {
      // Se for a página inicial, mostra o conteúdo institucional e esconde o palco
      institutionalContent.style.display = "block";
      contentArea.style.display = "none";
      // Carrega o JS da home para popular áreas dinâmicas como "Acesso Rápido"
      try {
        const jsModule = await import(module.modulePath);
        if (jsModule.init) {
          jsModule.init(db, user, userData, functions, modulesConfig);
        }
      } catch (error) {
        console.error("Erro ao carregar JS da home:", error);
      }
    } else {
      // Para todos os outros módulos, esconde o institucional e mostra o palco
      institutionalContent.style.display = "none";
      contentArea.style.display = "block";
      contentArea.innerHTML = `<div class="loading-spinner"></div>`;

      try {
        const response = await fetch(module.pagePath);
        if (!response.ok)
          throw new Error(`Arquivo HTML do módulo não encontrado.`);
        contentArea.innerHTML = await response.text();

        const jsModule = await import(module.modulePath);
        if (jsModule.init) {
          jsModule.init(db, user, userData, functions);
        }
      } catch (error) {
        console.error(`Erro ao carregar módulo ${path}:`, error);
        contentArea.innerHTML = `<h2>Falha ao carregar o módulo.</h2><p>${error.message}</p>`;
      }
    }
    updateActiveMenuLink();
  }

  function getVisibleModules(userData) {
    return Object.values(modulesConfig)
      .filter((module) => hasPermission(module, userData))
      .sort((a, b) => a.titulo.localeCompare(b.titulo));
  }

  function hasPermission(module, userData) {
    const userFuncoes = (userData.funcoes || []).map((f) => f.toLowerCase());
    const roles = (module.roles || []).map((r) => r.toLowerCase());
    return (
      roles.includes("todos") ||
      userFuncoes.includes("admin") ||
      roles.some((role) => userFuncoes.includes(role))
    );
  }

  function renderSidebarMenu(modules) {
    const menu = document.getElementById("sidebar-menu");
    menu.innerHTML = modules
      .map(
        (m) =>
          `<li><a href="${m.url}">${m.icon}<span>${m.titulo}</span></a></li>`
      )
      .join("");
  }

  function updateActiveMenuLink() {
    const path = window.location.hash || "#!/home";
    document.querySelectorAll("#sidebar-menu a").forEach((link) => {
      if (link.getAttribute("href") === path) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });
  }

  // Funções auxiliares (login, access denied, sidebar toggle, etc.)
  function renderLogin(message = "Por favor, faça login.") {
    dashboardView.style.display = "none";
    loginView.style.display = "block";
    loginView.innerHTML = `<div class="login-container"><div class="login-card">
            <img src="./assets/img/logo-eupsico.png" alt="Logo" class="login-logo">
            <h2>Intranet EuPsico</h2><p>${message}</p>
            <button id="login-button" class="action-button login-button">Login com Google</button>
        </div></div>`;
    document.getElementById("login-button").addEventListener("click", () => {
      auth
        .signInWithPopup(new firebase.auth.GoogleAuthProvider())
        .catch(console.error);
    });
  }
  function renderAccessDenied() {
    /* ... */
  }
  function setupSidebarToggle() {
    /* ... */
  }

  // Inicia a aplicação
  handleAuth();
});
