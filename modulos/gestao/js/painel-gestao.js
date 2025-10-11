// /modulos/gestao/js/painel-gestao.js

// Importa as funções necessárias do Firebase (v9) e do app.js
import { db } from "../../../assets/js/firebase-init.js";
import {
  onValue,
  ref,
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

// Mapeia os IDs das views para os arquivos HTML e JS correspondentes
const views = {
  "dashboard-reunioes": { html: "dashboard-reunioes.html", js: null },
  "ata-de-reuniao": { html: "ata-de-reuniao.html", js: null },
  "plano-de-acao": { html: "plano-de-acao.html", js: null },
  "relatorio-feedback": { html: "relatorio-feedback.html", js: null },
};

/**
 * Função de inicialização do Painel de Gestão, chamada pelo app.js principal.
 * @param {object} user - Objeto do usuário autenticado do Firebase.
 * @param {object} userData - Dados do perfil do usuário do Firestore.
 */
export function init(user, userData) {
  console.log("🔹 Painel de Gestão iniciado para:", userData.nome);

  // Constrói o menu lateral específico para este painel
  buildGestaoSidebarMenu();

  // Configura o listener de navegação
  window.addEventListener("hashchange", handleNavigation);

  // Carrega a view inicial (ou a view definida no hash da URL)
  handleNavigation();
}

/**
 * Constrói o menu na barra lateral principal.
 */
function buildGestaoSidebarMenu() {
  const sidebarMenu = document.getElementById("sidebar-menu");
  if (!sidebarMenu) return;

  // Define os itens do menu para o Painel de Gestão
  const menuItems = [
    { id: "dashboard-reunioes", name: "Dashboard", icon: "dashboard" },
    { id: "ata-de-reuniao", name: "Registrar Ata", icon: "edit_document" },
    { id: "plano-de-acao", name: "Plano de Ação", icon: "task_alt" },
    { id: "relatorio-feedback", name: "Relatórios", icon: "analytics" },
  ];

  let menuHtml = `
        <li>
            <a href="../../../index.html" class="back-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
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
 * Gerencia a navegação e o carregamento da view com base no hash da URL.
 */
function handleNavigation() {
  const viewId = window.location.hash.substring(1) || "dashboard-reunioes";
  loadView(viewId);
}

/**
 * Carrega o conteúdo HTML e executa o JS de uma sub-página.
 * @param {string} viewId O ID da view a ser carregada.
 */
async function loadView(viewId) {
  const contentArea = document.getElementById("content-area");
  const sidebarMenu = document.getElementById("sidebar-menu");
  if (!contentArea || !sidebarMenu || !views[viewId]) {
    console.error(`Área de conteúdo ou view '${viewId}' não encontrada.`);
    contentArea.innerHTML = `<p class="alert alert-danger">Página não encontrada.</p>`;
    return;
  }

  // Atualiza o item ativo no menu lateral
  sidebarMenu.querySelectorAll("a[data-view]").forEach((link) => {
    link.classList.toggle("active", link.dataset.view === viewId);
  });

  contentArea.innerHTML = '<div class="loading-spinner"></div>';

  try {
    const viewConfig = views[viewId];
    const response = await fetch(`./${viewConfig.html}`);
    if (!response.ok) {
      throw new Error(`Não foi possível carregar ${viewConfig.html}`);
    }
    contentArea.innerHTML = await response.text();

    // Se houver um script associado, ele será executado a partir do HTML carregado
    // (Isso é feito automaticamente pelo navegador ao inserir o <script> no innerHTML)
    console.log(`View '${viewId}' carregada com sucesso.`);
  } catch (error) {
    console.error("Erro ao carregar a view:", error);
    contentArea.innerHTML = `<div class="alert alert-danger">Ocorreu um erro ao carregar esta seção.</div>`;
  }
}
