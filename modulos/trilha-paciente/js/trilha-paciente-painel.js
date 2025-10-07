// Arquivo: /modulos/trilha-paciente/js/trilha-paciente-painel.js
// Versão: 9.0 (Migração para a sintaxe modular do Firebase v9)

// 1. Importa o 'initKanban' do arquivo vizinho e o 'db' do nosso config central
import { init as initKanban } from "./trilha-paciente.js";
import { db } from "../../../assets/js/firebase-init.js";

// Mapeia os itens do submenu para os status do Firestore
const menuFilters = {
  entrada: ["inscricao_documentos", "triagem_agendada"],
  plantao: ["encaminhar_para_plantao", "em_atendimento_plantao"],
  pb: [
    "encaminhar_para_pb",
    "aguardando_info_horarios",
    "cadastrar_horario_psicomanager",
    "em_atendimento_pb",
  ],
  outros: ["pacientes_parcerias", "grupos"],
  encerramento: ["desistencia", "alta"],
};

// Variáveis para armazenar os dados do usuário logado
let authUser, authUserData;

/**
 * Inicializa o painel da Trilha do Paciente.
 * @param {object} user - O objeto do usuário autenticado do Firebase Auth.
 * @param {object} userData - Os dados do usuário do Firestore.
 */
export function init(user, userData) {
  authUser = user;
  authUserData = userData;

  const sidebarMenu = document.getElementById("sidebar-menu");
  const contentArea = document.getElementById("content-area");

  if (!sidebarMenu || !contentArea) {
    console.error("Elementos essenciais do layout não foram encontrados.");
    return;
  }

  buildSubmenu(sidebarMenu);

  contentArea.innerHTML = `
    <div id="module-content-area" class="module-content" style="height: 100%;">
        <div class="loading-spinner"></div>
    </div>
  `;

  setupSubmenuListeners(sidebarMenu);

  // Carrega a visão inicial baseada na URL ou o padrão 'entrada'
  const initialView = window.location.hash.replace("#", "") || "entrada";
  loadView(initialView);

  // Marca o item de menu correto na carga inicial
  sidebarMenu.querySelectorAll("a[data-view]").forEach((link) => {
    link.classList.toggle("active", link.dataset.view === initialView);
  });
}

/**
 * Constrói o submenu específico da Trilha do Paciente na barra lateral.
 * @param {HTMLElement} sidebarMenu - O elemento <ul> do menu.
 */
function buildSubmenu(sidebarMenu) {
  sidebarMenu.innerHTML = `
    <li>
        <a href="../../../index.html" class="back-link">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            <span>Voltar à Intranet</span>
        </a>
    </li>
    <li class="menu-separator"></li>
    <li><a href="#entrada" data-view="entrada">Entrada</a></li>
    <li><a href="#plantao" data-view="plantao">Plantão</a></li>
    <li><a href="#pb" data-view="pb">PB</a></li>
    <li><a href="#outros" data-view="outros">Outros</a></li>
    <li><a href="#encerramento" data-view="encerramento">Encerramento</a></li>
  `;
}

/**
 * Configura os eventos de clique para o submenu.
 * @param {HTMLElement} sidebarMenu - O elemento <ul> do menu.
 */
function setupSubmenuListeners(sidebarMenu) {
  sidebarMenu.addEventListener("click", (e) => {
    const link = e.target.closest("a[data-view]");
    if (link && !link.classList.contains("back-link")) {
      e.preventDefault();

      sidebarMenu
        .querySelectorAll("a[data-view]")
        .forEach((l) => l.classList.remove("active"));
      link.classList.add("active");

      const view = link.getAttribute("data-view");
      window.location.hash = view; // Atualiza a URL para manter o estado
      loadView(view);
    }
  });
}

/**
 * Carrega a visão do Kanban com base no filtro selecionado.
 * @param {string} view - O nome da visão a ser carregada (ex: 'entrada').
 */
async function loadView(view) {
  const moduleContentArea = document.getElementById("module-content-area");
  if (!moduleContentArea) return;

  moduleContentArea.innerHTML = `<div class="loading-spinner"></div>`;

  try {
    const filter = menuFilters[view];
    if (!filter) {
      throw new Error(`Filtro de visão não encontrado para: ${view}`);
    }

    // A instância 'db' agora é importada diretamente do firebase-init.js
    await initKanban(db, authUser, authUserData, moduleContentArea, filter);
  } catch (error) {
    console.error(`Erro ao carregar a visão ${view}:`, error);
    moduleContentArea.innerHTML = `<div class="error-message">Ocorreu um erro ao carregar esta visualização.</div>`;
  }
}
