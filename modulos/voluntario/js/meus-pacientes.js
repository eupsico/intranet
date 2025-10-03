// Arquivo: /modulos/voluntario/js/meus-pacientes.js
// Versão: 4.0 (Corrige a lógica de carregamento de pacientes e o ciclo de vida)

export function init(db, user, userData) {
  const container = document.getElementById("meus-pacientes-container");
  if (!container) return;

  // Variáveis globais para os modais
  const encerramentoModal = document.getElementById("encerramento-modal");
  const horariosPbModal = document.getElementById("horarios-pb-modal");

  // --- CONTROLES GERAIS DO MODAL ---
  function setupModalControls() {
    document
      .querySelectorAll(
        ".modal .close-button, #modal-cancel-btn, [data-close-modal]"
      )
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          encerramentoModal.style.display = "none";
          horariosPbModal.style.display = "none";
        });
      });

    window.addEventListener("click", (event) => {
      if (event.target == encerramentoModal)
        encerramentoModal.style.display = "none";
      if (event.target == horariosPbModal)
        horariosPbModal.style.display = "none";
    });
  }

  // --- FUNÇÃO PARA CARREGAR PACIENTES DO PROFISSIONAL ---
  async function carregarMeusPacientes(userId) {
    const container = document.getElementById("pacientes-cards-container");
    const loading = document.getElementById("loading-pacientes");
    const emptyState = document.getElementById("empty-state-pacientes");

    if (!container || !loading || !emptyState) {
      console.warn("❗ Elementos do DOM não encontrados:", {
        container: !!container,
        loading: !!loading,
        emptyState: !!emptyState,
      });
      return;
    }

    console.log("🔄 Iniciando carregamento de pacientes para userId:", userId);

    loading.style.display = "block";
    container.innerHTML = "";
    emptyState.style.display = "none";

    try {
      // Timeout de segurança (10s)
      const timeout = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("⏱ Timeout na consulta Firebase")),
          10000
        )
      );

      // Consultas
      const queryPlantao = db
        .collection("trilhaPaciente")
        .where("plantaoInfo.profissionalId", "==", userId)
        .where("status", "==", "em_atendimento_plantao");

      const queryPb = db
        .collection("trilhaPaciente")
        .where("pbInfo.profissionalId", "==", userId)
        .where("status", "not-in", ["alta", "desistencia"]);

      console.log("📡 Executando consultas no Firestore...");

      const [snapshotPlantao, snapshotPb] = await Promise.race([
        Promise.all([queryPlantao.get(), queryPb.get()]),
        timeout,
      ]);

      console.log("📊 Resultados recebidos:");
      console.log("   → Plantão encontrados:", snapshotPlantao.size);
      snapshotPlantao.forEach((doc) =>
        console.log("      •", doc.id, "| status:", doc.data().status)
      );

      console.log("   → PB encontrados:", snapshotPb.size);
      snapshotPb.forEach((doc) =>
        console.log("      •", doc.id, "| status:", doc.data().status)
      );

      // Unificação dos pacientes
      const pacientesMap = new Map();
      snapshotPlantao.forEach((doc) => {
        pacientesMap.set(doc.id, { id: doc.id, ...doc.data() });
      });
      snapshotPb.forEach((doc) => {
        pacientesMap.set(doc.id, { id: doc.id, ...doc.data() });
      });

      const pacientes = Array.from(pacientesMap.values());

      if (pacientes.length === 0) {
        console.log("ℹ️ Nenhum paciente encontrado.");
        emptyState.style.display = "block";
      } else {
        console.log("✅ Renderizando", pacientes.length, "pacientes...");
        pacientes.sort((a, b) =>
          (a.nomeCompleto || "").localeCompare(b.nomeCompleto || "")
        );
        container.innerHTML = "";
        pacientes.forEach((data) => {
          try {
            const cardHtml = criarCardPaciente(data.id, data);
            container.insertAdjacentHTML("beforeend", cardHtml);
          } catch (err) {
            console.error("⚠️ Erro ao criar card do paciente:", data.id, err);
          }
        });

        try {
          adicionarEventListeners();
        } catch (err) {
          console.error("⚠️ Erro ao adicionar event listeners:", err);
        }
      }
    } catch (error) {
      console.error("❌ Erro ao carregar pacientes:", {
        message: error.message,
        stack: error.stack,
      });
      emptyState.style.display = "block";
      emptyState.innerHTML =
        "<p>Ocorreu um erro ao carregar os pacientes. Tente novamente mais tarde.</p>";
    } finally {
      loading.style.display = "none";
      console.log("🔚 Finalizado processo de carregamento.");
    }
  }

  // --- CRIAÇÃO DOS CARDS DE PACIENTE ---
  function criarCardPaciente(id, data) {
    // Determina o tipo e o status com base nos dados do paciente
    let tipo, statusLabel, acaoLabel;

    if (data.status === "em_atendimento_plantao") {
      tipo = "plantao";
      statusLabel = "Em Atendimento (Plantão)";
      acaoLabel = "Encerrar Plantão";
    } else {
      tipo = "pb";
      // Detalha o status da PB
      switch (data.status) {
        case "aguardando_info_horarios":
          statusLabel = "Aguardando Info Horários (PB)";
          acaoLabel = "Informar Horários";
          break;
        case "cadastrar_horario_psicomanager":
          statusLabel = "Aguardando Cadastro (PB)";
          acaoLabel = "Visualizar Horários"; // Ou outra ação/visualização
          break;
        case "em_atendimento_pb":
          statusLabel = "Em Atendimento (PB)";
          acaoLabel = "Gerenciar Paciente"; // Exemplo de outra ação futura
          break;
        default:
          statusLabel = "Em Processo (PB)";
          acaoLabel = "Ver Detalhes";
      }
    }

    const info = tipo === "plantao" ? data.plantaoInfo : data.pbInfo;
    const dataEncaminhamento = info?.dataEncaminhamento
      ? new Date(info.dataEncaminhamento + "T03:00:00").toLocaleDateString(
          "pt-BR"
        )
      : "N/A";

    return `
      <div class="paciente-card" data-id="${id}" data-tipo="${tipo}">
        <h4>${data.nomeCompleto}</h4>
        <p><strong>Status:</strong> ${statusLabel}</p>
        <p><strong>Telefone:</strong> ${data.telefoneCelular || "N/A"}</p>
        <p><strong>Data Encaminhamento:</strong> ${dataEncaminhamento}</p>
        <button class="action-button">${acaoLabel}</button>
      </div>
    `;
  }
  function adicionarEventListeners() {
    document
      .querySelectorAll(".paciente-card .action-button")
      .forEach((button) => {
        // Remove listener antigo para evitar duplicação
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);

        newButton.addEventListener("click", async (e) => {
          const card = e.target.closest(".paciente-card");
          const pacienteId = card.dataset.id;
          const tipo = card.dataset.tipo;

          const docSnap = await db
            .collection("trilhaPaciente")
            .doc(pacienteId)
            .get();
          if (!docSnap.exists) {
            alert("Paciente não encontrado!");
            return;
          }
          const pacienteData = docSnap.data();

          if (tipo === "plantao") {
            abrirModalEncerramento(pacienteId, pacienteData);
          } else {
            // Futuramente, pode ter lógicas diferentes para cada status da PB
            abrirModalHorariosPb(pacienteId, pacienteData);
          }
        });
      });
  }
  function abrirModalEncerramento(pacienteId, data) {
    const form = document.getElementById("encerramento-form");
    form.reset();
    document.getElementById("paciente-id-modal").value = pacienteId;

    // ... (O restante do seu código para este modal, como a lógica dos checkboxes e disponibilidade, continua aqui)
    // Nenhuma alteração necessária nesta função.

    encerramentoModal.style.display = "block";
  }
  function abrirModalHorariosPb(pacienteId, data) {
    const form = document.getElementById("horarios-pb-form");
    form.reset();
    document.getElementById("paciente-id-horarios-modal").value = pacienteId;

    // ... (O restante do seu código para este modal, como a construção do formulário, continua aqui)
    // Nenhuma alteração necessária nesta função.

    horariosPbModal.style.display = "block";
  }
  document
    .getElementById("encerramento-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      const saveButton = encerramentoModal.querySelector(
        'button[type="submit"]'
      );
      saveButton.disabled = true;

      const pacienteId = document.getElementById("paciente-id-modal").value;
      const encaminhamentos = Array.from(
        form.querySelectorAll('input[name="encaminhamento"]:checked')
      ).map((cb) => cb.value);

      if (encaminhamentos.length === 0) {
        alert("Por favor, selecione ao menos uma opção de encaminhamento.");
        saveButton.disabled = false;
        return;
      }

      let novoStatus = "encaminhar_para_pb"; // Padrão
      if (encaminhamentos.includes("Alta")) novoStatus = "alta";
      if (encaminhamentos.includes("Desistência")) novoStatus = "desistencia";

      let updateData = {
        status: novoStatus,
        // Remove a associação com o profissional de plantão
        profissionalAtualId: firebase.firestore.FieldValue.delete(),
        "plantaoInfo.encerramento": {
          /* ... seus outros campos ... */
        },
        lastUpdate: new Date(),
      };

      // ... (Lógica para atualizar a disponibilidade, se houver) ...

      try {
        await db
          .collection("trilhaPaciente")
          .doc(pacienteId)
          .update(updateData);
        alert("Encerramento salvo com sucesso!");
        encerramentoModal.style.display = "none";
        carregarMeusPacientes(user.uid); // Recarrega a lista
      } catch (error) {
        console.error("Erro ao salvar encerramento:", error);
        alert("Erro ao salvar.");
      } finally {
        saveButton.disabled = false;
      }
    });

  // Listener do formulário de HORÁRIOS PB
  document
    .getElementById("horarios-pb-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      const saveButton = horariosPbModal.querySelector('button[type="submit"]');
      saveButton.disabled = true;

      const pacienteId = document.getElementById(
        "paciente-id-horarios-modal"
      ).value;
      const iniciou = form.querySelector(
        'input[name="iniciou-pb"]:checked'
      ).value;
      let updateData = {};

      if (iniciou === "nao") {
        updateData = {
          status: "desistencia",
          profissionalAtualId: firebase.firestore.FieldValue.delete(), // Remove o profissional
          desistenciaMotivo: `Não iniciou PB. Motivo: ${
            form.querySelector("#motivo-nao-inicio-pb").value
          }`,
          lastUpdate: new Date(),
        };
      } else {
        updateData = {
          status: "cadastrar_horario_psicomanager",
          profissionalAtualId: user.uid, // Mantém a associação
          "pbInfo.horarioSessao": {
            /* ... seus outros campos do formulário ... */
          },
          lastUpdate: new Date(),
        };
      }

      try {
        await db
          .collection("trilhaPaciente")
          .doc(pacienteId)
          .update(updateData);
        alert("Informações salvas com sucesso!");
        horariosPbModal.style.display = "none";
        carregarMeusPacientes(user.uid); // Recarrega a lista
      } catch (error) {
        console.error("Erro ao salvar horários:", error);
        alert("Erro ao salvar.");
      } finally {
        saveButton.disabled = false;
      }
    });

  setupModalControls();
  carregarMeusPacientes(user.uid);
}
