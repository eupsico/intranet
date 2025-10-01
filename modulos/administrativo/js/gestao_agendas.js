import { functions } from "../../../assets/js/firebase-init.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-functions.js";

let db, user, userData;
let currentAgendaConfig = null; // Armazena os dados da agenda que está sendo configurada

// Função de inicialização do módulo
export function init(dbRef, userRef, userDataRef) {
  db = dbRef;
  user = userRef;
  userData = userDataRef;

  console.log("Módulo de Gestão de Agendas iniciado.");
  carregarDisponibilidades();

  // Adiciona o listener de evento para o botão de salvar no modal
  const saveButton = document.getElementById("saveConfigButton");
  if (saveButton) {
    saveButton.addEventListener("click", salvarConfiguracaoAgenda);
  }
}

// Função para carregar e renderizar as disponibilidades
async function carregarDisponibilidades() {
  const spinner = document.getElementById("loading-spinner");
  const table = document.getElementById("disponibilidades-table");
  const noDataMessage = document.getElementById("no-data-message");
  const tableBody = document.getElementById("disponibilidades-body");

  // Garante que o estado inicial esteja correto
  spinner.style.display = "block";
  table.style.display = "none";
  noDataMessage.style.display = "none";
  tableBody.innerHTML = "";

  try {
    // CORREÇÃO: Usando a Cloud Function correta que criamos
    const getDisponibilidades = httpsCallable(
      functions,
      "getTodasDisponibilidadesAssistentes"
    );
    const result = await getDisponibilidades();
    const disponibilidades = result.data;

    if (!disponibilidades || disponibilidades.length === 0) {
      noDataMessage.style.display = "block";
    } else {
      disponibilidades.forEach((item) => {
        const diasOrdenados = item.dias.sort();
        // Formata os dias para exibição
        const diasFormatados = diasOrdenados
          .map((dia) => {
            const [year, month, day] = dia.split("-");
            return `${day}/${month}`;
          })
          .join(", ");

        const row = `
                    <tr>
                        <td>${item.assistenteNome}</td>
                        <td>${item.mes}</td>
                        <td>${item.modalidade}</td>
                        <td class="text-wrap" style="max-width: 300px;">${diasFormatados}</td>
                        <td>${item.inicio} - ${item.fim}</td>
                        <td>
                            <button class="btn btn-primary btn-sm config-btn" 
                               data-bs-toggle="modal" 
                               data-bs-target="#configurarAgendaModal"
                               data-assistente-id="${item.assistenteId}"
                               data-assistente-nome="${item.assistenteNome}"
                               data-mes="${item.mes}"
                               data-modalidade="${item.modalidade}"
                               data-dias='${JSON.stringify(diasOrdenados)}'>
                               <i class="fas fa-cog me-1"></i> Configurar
                            </button>
                        </td>
                    </tr>
                `;
        tableBody.innerHTML += row;
      });

      // Adiciona listener aos botões recém-criados
      document.querySelectorAll(".config-btn").forEach((button) => {
        button.addEventListener("click", (event) => {
          const data = event.currentTarget.dataset;
          abrirModalConfiguracao(
            data.assistenteId,
            data.assistenteNome,
            data.mes,
            data.modalidade,
            JSON.parse(data.dias)
          );
        });
      });

      table.style.display = "table";
    }
  } catch (error) {
    console.error("Erro ao carregar disponibilidades:", error);
    noDataMessage.textContent =
      "Erro ao carregar dados. Por favor, tente novamente.";
    noDataMessage.classList.replace("alert-info", "alert-danger");
    noDataMessage.style.display = "block";
  } finally {
    spinner.style.display = "none";
  }
}

// Abre e popula o modal com os dados do dia a ser configurado
function abrirModalConfiguracao(
  assistenteId,
  assistenteNome,
  mes,
  modalidade,
  dias
) {
  currentAgendaConfig = { assistenteId, mes, modalidade };

  const modalTitle = document.getElementById("configurarAgendaModalLabel");
  const modalContent = document.getElementById("agenda-config-content");

  modalTitle.textContent = `Configurar Agenda de ${assistenteNome} (${modalidade} - ${mes})`;

  let contentHTML = '<div class="row g-3">';
  dias.forEach((dia) => {
    const dataFormatada = new Date(dia + "T03:00:00").toLocaleDateString(
      "pt-BR",
      { weekday: "long", day: "2-digit", month: "2-digit" }
    );
    contentHTML += `
            <div class="col-md-6 col-lg-4">
                <div class="card h-100">
                    <div class="card-body">
                        <h6 class="card-title">${dataFormatada}</h6>
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="tipo-${dia}" id="triagem-${dia}" value="triagem" checked>
                            <label class="form-check-label" for="triagem-${dia}">Triagem</label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="tipo-${dia}" id="reavaliacao-${dia}" value="reavaliacao">
                            <label class="form-check-label" for="reavaliacao-${dia}">Reavaliação</label>
                        </div>
                    </div>
                </div>
            </div>
        `;
  });
  contentHTML += "</div>";
  modalContent.innerHTML = contentHTML;
}

// Salva a configuração feita no modal
async function salvarConfiguracaoAgenda() {
  const button = document.getElementById("saveConfigButton");
  button.disabled = true;
  button.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Salvando...`;

  const diasConfig = Array.from(
    document.querySelectorAll(
      '#agenda-config-content input[type="radio"]:checked'
    )
  ).map((input) => ({
    dia: input.name.replace("tipo-", ""),
    tipo: input.value,
  }));

  if (diasConfig.length === 0) {
    alert("Nenhum dia foi configurado.");
    button.disabled = false;
    button.innerHTML = '<i class="fas fa-save me-2"></i>Salvar Configuração';
    return;
  }

  const payload = { ...currentAgendaConfig, dias: diasConfig };

  try {
    const definirTipoAgenda = httpsCallable(functions, "definirTipoAgenda");
    const result = await definirTipoAgenda(payload);

    const modalInstance = bootstrap.Modal.getInstance(
      document.getElementById("configurarAgendaModal")
    );
    modalInstance.hide();

    alert(result.data.message);
  } catch (error) {
    console.error("Erro ao definir tipo da agenda:", error);
    alert(`Não foi possível salvar a configuração: ${error.message}`);
  } finally {
    button.disabled = false;
    button.innerHTML = '<i class="fas fa-save me-2"></i>Salvar Configuração';
  }
}
