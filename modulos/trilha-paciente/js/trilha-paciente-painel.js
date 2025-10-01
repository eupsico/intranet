import { init as initKanban } from "./trilha-paciente.js";

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

let firestoreDb, authUser, authUserData;

export function init(db, user, userData) {
  firestoreDb = db;
  authUser = user;
  authUserData = userData;

  // **CORREÇÃO PRINCIPAL**: Altera os seletores para usar os elementos GLOBAIS da página
  const sidebarMenu = document.getElementById("sidebar-menu");
  const contentArea = document.getElementById("content-area");

  buildSubmenu(sidebarMenu);

  contentArea.innerHTML = `
        <div id="module-content-area" class="module-content" style="height: 100%;">
            <div class="loading-spinner"></div>
        </div>
    `;

  setupSubmenuListeners(sidebarMenu);
  loadView("entrada");
}

function buildSubmenu(sidebarMenu) {
  if (!sidebarMenu) return;

  // Constrói o HTML do novo menu e o insere no lugar do menu principal
  sidebarMenu.innerHTML = `
        <li>
            <a href="../../../index.html" class="back-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                <span>Voltar à Intranet</span>
            </a>
        </li>
        <li class="menu-separator"></li>
        <li><a href="#entrada" data-view="entrada" class="active">Entrada</a></li>
        <li><a href="#plantao" data-view="plantao">Plantão</a></li>
        <li><a href="#pb" data-view="pb">PB</a></li>
        <li><a href="#outros" data-view="outros">Outros</a></li>
        <li><a href="#encerramento" data-view="encerramento">Encerramento</a></li>
    `;
}

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

async function loadView(view) {
  const moduleContentArea = document.getElementById("module-content-area");
  if (!moduleContentArea) return;

  moduleContentArea.innerHTML = `<div class="loading-spinner"></div>`;

  try {
    const filter = menuFilters[view];
    if (!filter)
      throw new Error(`Filtro de visão não encontrado para: ${view}`);

    await initKanban(
      firestoreDb,
      authUser,
      authUserData,
      moduleContentArea,
      filter
    );
  } catch (error) {
    console.error(`Erro ao carregar a visão ${view}:`, error);
    moduleContentArea.innerHTML = `<div class="error-message">Ocorreu um erro.</div>`;
  }
}
