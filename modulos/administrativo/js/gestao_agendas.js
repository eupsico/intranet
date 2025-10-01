import { functions } from "../../../assets/js/firebase-init.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-functions.js";

let db, user, userData;
let currentAgendaConfig = null;

export function init(dbRef, userRef, userDataRef) {
  db = dbRef;
  user = userRef;
  userData = userDataRef;

  console.log("Módulo de Gestão de Agendas iniciado.");
  carregarDisponibilidades();

  const saveButton = document.getElementById("saveConfigButton");
  if (saveButton) {
    saveButton.addEventListener("click", salvarConfiguracaoAgenda);
  }
}

async function carregarDisponibilidades() {
  const spinner = document.getElementById("loading-spinner");
  const table = document.getElementById("disponibilidades-table");
  const noDataMessage = document.getElementById("no-data-message");
  const tableBody = document.getElementById("disponibilidades-body");

  spinner.style.display = "block";
  table.style.display = "none";
  noDataMessage.style.display = "none";
  tableBody.innerHTML = "";

  try {
    const getDisponibilidades = httpsCallable(
      functions,
      "getTodasDisponibilidadesAssistentes"
    );
    const result = await getDisponibilidades();
    const disponibilidades = result.data;

    // Log para depuração: veja no console do navegador os dados exatos que o servidor retornou
    console.log(
      "Dados recebidos da Cloud Function:",
      JSON.stringify(disponibilidades, null, 2)
    );

    if (!disponibilidades || disponibilidades.length === 0) {
      noDataMessage.style.display = "block";
    } else {
      disponibilidades.forEach((item) => {
        // *** CORREÇÃO PRINCIPAL AQUI ***
        // Se o item não tiver o campo 'dias' ou se 'dias' não for uma lista, pula este item
        if (!item.dias || !Array.isArray(item.dias)) {
          console.warn(
            "Item de disponibilidade ignorado por não conter uma lista de dias:",
            item
          );
          return; // Pula para o próximo item do loop
        }

        const diasOrdenados = item.dias.sort();
        const diasFormatados = diasOrdenados
          .map((dia) => {
            const [year, month, day] = dia.split("-");
            return `${day}/${month}`;
          })
          .join(", ");

        const row = `
                    <tr>
                        <td>${item.assistenteNome || "Nome não informado"}</td>
                        <td>${item.mes || "N/A"}</td>
                        <td>${item.modalidade || "N/A"}</td>
                        <td class="text-wrap" style="max-width: 300px;">${diasFormatados}</td>
                        <td>${item.inicio || "N/A"} - ${item.fim || "N/A"}</td>
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
                    </tr>`;
        tableBody.innerHTML += row;
      });

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
    console.error("Erro detalhado ao carregar disponibilidades:", error);
    noDataMessage.textContent =
      "Erro ao carregar dados. Verifique o console para mais detalhes.";
    noDataMessage.classList.replace("alert-info", "alert-danger");
    noDataMessage.style.display = "block";
  } finally {
    spinner.style.display = "none";
  }
}

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
      {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
      }
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
            </div>`;
  });
  contentHTML += "</div>";
  modalContent.innerHTML = contentHTML;
}

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
    const modalEl = document.getElementById("configurarAgendaModal");
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) {
      modalInstance.hide();
    }
    alert(result.data.message);
  } catch (error) {
    console.error("Erro ao definir tipo da agenda:", error);
    alert(`Não foi possível salvar a configuração: ${error.message}`);
  } finally {
    button.disabled = false;
    button.innerHTML = '<i class="fas fa-save me-2"></i>Salvar Configuração';
  }
}
