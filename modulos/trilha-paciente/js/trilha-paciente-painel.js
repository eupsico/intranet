import { init as initKanban } from "./trilha-paciente.js";

// Mapeamento dos menus para os status das colunas
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

let db, user, userData;

export function initTrilhaPacientePanel(firestoreDb, authUser, authUserData) {
  db = firestoreDb;
  user = authUser;
  userData = authUserData;

  const contentArea = document.getElementById("content-area");
  contentArea.innerHTML = `
        <div class="module-panel-container">
            <nav class="module-submenu">
                <ul>
                    <li><a href="#" data-view="entrada" class="active">Entrada</a></li>
                    <li><a href="#" data-view="plantao">Plantão</a></li>
                    <li><a href="#" data-view="pb">PB</a></li>
                    <li><a href="#" data-view="outros">Outros</a></li>
                    <li><a href="#" data-view="encerramento">Encerramento</a></li>
                </ul>
            </nav>
            <div id="module-content-area" class="module-content">
                <div class="loading-spinner"></div>
            </div>
        </div>
    `;

  setupSubmenuListeners();
  // Carrega a visão inicial (Entrada)
  loadView("entrada");
}

function setupSubmenuListeners() {
  const submenuLinks = document.querySelectorAll(".module-submenu a");
  submenuLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();

      submenuLinks.forEach((l) => l.classList.remove("active"));
      e.target.classList.add("active");

      const view = e.target.getAttribute("data-view");
      loadView(view);
    });
  });
}

async function loadView(view) {
  const moduleContentArea = document.getElementById("module-content-area");
  moduleContentArea.innerHTML = `<div class="loading-spinner"></div>`;

  try {
    const filter = menuFilters[view];
    if (!filter) {
      throw new Error(`Filtro de visão não encontrado para: ${view}`);
    }
    // Chama a inicialização do Kanban, passando o filtro de colunas
    await initKanban(db, user, userData, moduleContentArea, filter);
  } catch (error) {
    console.error(`Erro ao carregar a visão ${view}:`, error);
    moduleContentArea.innerHTML = `<div class="error-message">Ocorreu um erro ao carregar esta visão.</div>`;
  }
}
