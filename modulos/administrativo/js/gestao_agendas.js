let db, functions, httpsCallable;
let currentAgendaConfig = null; // Armazena os dados da agenda que está sendo configurada

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const firebaseApp = await firebaseInitializer.getFirebaseApp();
    db = getFirestore(firebaseApp);
    functions = getFunctions(firebaseApp, "southamerica-east1");
    httpsCallable = httpsCallable;

    await carregarDisponibilidades();

    // Adiciona o listener de evento para o botão de salvar no modal
    const saveButton = document.getElementById("saveConfigButton");
    if (saveButton) {
      saveButton.addEventListener("click", salvarConfiguracaoAgenda);
    }
  } catch (error) {
    console.error("Erro ao inicializar a página de gestão de agendas:", error);
    const spinner = document.getElementById("loading-spinner");
    spinner.innerHTML = `<p class="text-danger">Erro ao carregar dados. Tente recarregar a página.</p>`;
  }
});

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
    const getDisponibilidadesAdmin = httpsCallable(
      functions,
      "getDisponibilidadesParaAdmin"
    );
    const result = await getDisponibilidadesAdmin();
    const disponibilidades = result.data.disponibilidades;

    if (disponibilidades.length === 0) {
      noDataMessage.style.display = "block";
    } else {
      disponibilidades.forEach((item) => {
        const diasOrdenados = item.dias.sort();
        const diasFormatados = diasOrdenados
          .map((dia) => new Date(dia + "T00:00:00").toLocaleDateString("pt-BR"))
          .join(", ");

        const row = `
                    <tr>
                        <td>${item.assistenteNome}</td>
                        <td>${item.mes}</td>
                        <td>${item.modalidade}</td>
                        <td class="text-wrap" style="max-width: 300px;">${diasFormatados}</td>
                        <td>${item.inicio} - ${item.fim}</td>
                        <td>
                            <a href="#" class="btn btn-primary btn-sm config-btn" 
                               data-bs-toggle="modal" 
                               data-bs-target="#configurarAgendaModal"
                               data-assistente-id="${item.assistenteId}"
                               data-assistente-nome="${item.assistenteNome}"
                               data-mes="${item.mes}"
                               data-modalidade="${item.modalidade}"
                               data-dias='${JSON.stringify(diasOrdenados)}'>
                               <i class="fas fa-cog me-2"></i>Clique para configurar
                            </a>
                        </td>
                    </tr>
                `;
        tableBody.innerHTML += row;
      });

      // Adiciona o listener para os botões de configurar recém-criados
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

function abrirModalConfiguracao(
  assistenteId,
  assistenteNome,
  mes,
  modalidade,
  dias
) {
  // Armazena os dados atuais para serem usados na função de salvar
  currentAgendaConfig = { assistenteId, mes, modalidade };

  const modalTitle = document.getElementById("configurarAgendaModalLabel");
  const modalContent = document.getElementById("agenda-config-content");

  modalTitle.textContent = `Configurar Agenda de ${assistenteNome} - ${mes}`;

  let contentHTML = '<div class="row g-3">';
  dias.forEach((dia) => {
    const dataFormatada = new Date(dia + "T00:00:00").toLocaleDateString(
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
                            <label class="form-check-label" for="triagem-${dia}">
                                Triagem
                            </label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="tipo-${dia}" id="reavaliacao-${dia}" value="reavaliacao">
                            <label class="form-check-label" for="reavaliacao-${dia}">
                                Reavaliação
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        `;
  });
  contentHTML += "</div>";
  modalContent.innerHTML = contentHTML;
}

async function salvarConfiguracaoAgenda() {
  const button = document.getElementById("saveConfigButton");
  button.disabled = true;
  button.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Salvando...`;

  // Coleta a configuração que o admin fez no modal
  const diasConfig = Array.from(
    document.querySelectorAll(
      '#agenda-config-content input[type="radio"]:checked'
    )
  ).map((input) => ({
    dia: input.name.replace("tipo-", ""),
    tipo: input.value,
  }));

  if (diasConfig.length === 0) {
    showFeedbackModal(
      "Nenhum dia foi configurado. Nenhuma ação foi tomada.",
      false
    );
    button.disabled = false;
    button.innerHTML = '<i class="fas fa-save me-2"></i>Salvar Configuração';
    return;
  }

  const payload = { ...currentAgendaConfig, dias: diasConfig };

  try {
    const definirTipoAgenda = httpsCallable(functions, "definirTipoAgenda");
    const result = await definirTipoAgenda(payload);

    // Esconde o modal manualmente após o sucesso
    const modalInstance = bootstrap.Modal.getInstance(
      document.getElementById("configurarAgendaModal")
    );
    modalInstance.hide();

    showFeedbackModal(result.data.message, true);
  } catch (error) {
    console.error("Erro ao definir tipo da agenda:", error);
    const modalInstance = bootstrap.Modal.getInstance(
      document.getElementById("configurarAgendaModal")
    );
    modalInstance.hide();
    showFeedbackModal(
      `Não foi possível salvar a configuração: ${error.message}`,
      false
    );
  } finally {
    button.disabled = false;
    button.innerHTML = '<i class="fas fa-save me-2"></i>Salvar Configuração';
  }
}
