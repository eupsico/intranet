// /modulos/gestao/js/painel-gestao.js

// Mapeia os IDs das views (do hash da URL) para os arquivos HTML correspondentes.
// Garanta que esses arquivos HTML existam na mesma pasta do painel-gestao.html
const views = {
  "dashboard-reunioes": { html: "dashboard-reunioes.html" },
  "ata-de-reuniao": { html: "ata-de-reuniao.html" },
  "plano-de-acao": { html: "plano-de-acao.html" },
  "relatorio-feedback": { html: "relatorio-feedback.html" },
};

/**
 * Função de inicialização do Módulo de Gestão.
 * Esta função é EXPORTADA para ser chamada pelo app.js principal após o login.
 * @param {object} user - Objeto do usuário autenticado do Firebase.
 * @param {object} userData - Dados do perfil do usuário do Firestore.
 */
export function init(user, userData) {
  console.log("🚀 Módulo de Gestão iniciado com sucesso para:", userData.nome);

  buildGestaoSidebarMenu();

  // Adiciona um listener para o evento de mudança de hash na URL (navegação)
  window.addEventListener("hashchange", handleNavigation);

  // Carrega a view inicial assim que o módulo é iniciado
  handleNavigation();
}

/**
 * Constrói e insere o menu específico de Gestão na barra lateral principal.
 */
function buildGestaoSidebarMenu() {
  const sidebarMenu = document.getElementById("sidebar-menu");
  if (!sidebarMenu) {
    console.error(
      "Elemento #sidebar-menu não encontrado. O menu não pode ser construído."
    );
    return;
  }

  const menuItems = [
    { id: "dashboard-reunioes", name: "Dashboard", icon: "dashboard" },
    { id: "ata-de-reuniao", name: "Registrar Ata", icon: "edit_document" },
    { id: "plano-de-acao", name: "Plano de Ação", icon: "task_alt" },
    { id: "relatorio-feedback", name: "Relatórios", icon: "analytics" },
  ];

  let menuHtml = `
    <li>
        <a href="../../../index.html" class="back-link">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Voltar à Intranet</span>
        </a>
    </li>
    <li class="menu-separator"></li>
    `;

  menuItems.forEach((item) => {
    menuHtml += `
      <li>
          <a href="#${item.id}" data-view="${item.id}">
              <span class="material-symbols-outlined">${item.icon}</span>
              <span>${item.name}</span>
          </a>
      </li>
    `;
  });

  sidebarMenu.innerHTML = menuHtml;
}

/**
 * Gerencia qual view carregar com base no hash da URL.
 */
function handleNavigation() {
  // Pega o ID da view do hash da URL (ex: #dashboard-reunioes -> "dashboard-reunioes")
  // Se não houver hash, o padrão é "dashboard-reunioes".
  const viewId = window.location.hash.substring(1) || "dashboard-reunioes";
  loadView(viewId);
}

/**
 * Carrega o conteúdo HTML de uma sub-página na área de conteúdo principal.
 * @param {string} viewId - O ID da view a ser carregada.
 */
async function loadView(viewId) {
  const contentArea = document.getElementById("content-area");
  const sidebarMenu = document.getElementById("sidebar-menu");

  if (!contentArea || !sidebarMenu || !views[viewId]) {
    console.error(
      `Erro: View '${viewId}' ou elementos essenciais não encontrados.`
    );
    if (contentArea)
      contentArea.innerHTML = `<div class="alert alert-danger">Página não encontrada ou erro de configuração. Verifique o console.</div>`;
    return;
  }

  // Mostra o spinner de carregamento
  contentArea.innerHTML = '<div class="loading-spinner"></div>';

  // Atualiza a classe 'active' no link do menu correspondente à view atual
  sidebarMenu.querySelectorAll("a[data-view]").forEach((link) => {
    link.classList.toggle("active", link.dataset.view === viewId);
  });

  // Atualiza o título principal da página
  const pageTitle = document.querySelector("#page-title-container");
  if (pageTitle) {
    const menuItem = sidebarMenu.querySelector(
      `a[data-view="${viewId}"] span:not(.material-symbols-outlined)`
    );
    if (menuItem) {
      pageTitle.textContent = menuItem.textContent;
    }
  }

  try {
    const viewConfig = views[viewId];
    // O path é relativo à localização de painel-gestao.html
    const response = await fetch(`./${viewConfig.html}`);

    if (!response.ok) {
      throw new Error(
        `Falha ao carregar o arquivo '${viewConfig.html}'. Status: ${response.status}`
      );
    }

    contentArea.innerHTML = await response.text();
    console.log(`✅ View '${viewId}' carregada com sucesso.`);
  } catch (error) {
    console.error("Erro ao carregar a view:", error);
    contentArea.innerHTML = `<div class="alert alert-danger">Ocorreu um erro ao carregar esta seção. Por favor, tente novamente.</div>`;
  }
}
