// Arquivo: /modulos/voluntario/js/meus-pacientes.js
// Versão: 3.5 (CORRIGIDO)

export function init(db, user, userData) {
  const container = document.getElementById("meus-pacientes-container");
  if (!container) return;

  const encerramentoModal = document.getElementById("encerramento-modal");
  const horariosPbModal = document.getElementById("horarios-pb-modal");
  const closeButtons = document.querySelectorAll(".modal .close-button");

  if (encerramentoModal) encerramentoModal.style.display = "none";
  if (horariosPbModal) horariosPbModal.style.display = "none";

  closeButtons.forEach(
    (btn) =>
      (btn.onclick = () => {
        if (encerramentoModal) encerramentoModal.style.display = "none";
        if (horariosPbModal) horariosPbModal.style.display = "none";
      })
  );
  window.onclick = (event) => {
    if (event.target == encerramentoModal)
      encerramentoModal.style.display = "none";
    if (event.target == horariosPbModal) horariosPbModal.style.display = "none";
  };

  async function carregarMeusPacientes() {
    container.innerHTML = '<div class="loading-spinner"></div>';
    try {
      const queryPlantao = db
        .collection("trilhaPaciente")
        .where("status", "==", "em_atendimento_plantao")
        .where("plantaoInfo.profissionalId", "==", user.uid);

      const queryPb = db
        .collection("trilhaPaciente")
        .where("status", "==", "aguardando_info_horarios")
        .where("pbInfo.profissionalId", "==", user.uid);

      const [plantaoSnapshot, pbSnapshot] = await Promise.all([
        queryPlantao.get(),
        queryPb.get(),
      ]);

      if (plantaoSnapshot.empty && pbSnapshot.empty) {
        container.innerHTML =
          "<p>Você não tem pacientes designados no momento.</p>";
        return;
      }

      let html = "";
      plantaoSnapshot.forEach((doc) => {
        const data = doc.data();
        html += criarCardPaciente(doc.id, data, "plantao");
      });
      pbSnapshot.forEach((doc) => {
        const data = doc.data();
        html += criarCardPaciente(doc.id, data, "pb");
      });

      container.innerHTML = html;
      adicionarEventListeners();
    } catch (error) {
      console.error("Erro ao carregar pacientes:", error);
      container.innerHTML =
        '<p class="error-message">Ocorreu um erro ao carregar seus pacientes.</p>';
      if (encerramentoModal) encerramentoModal.style.display = "none";
      if (horariosPbModal) horariosPbModal.style.display = "none";
    }
  }

  function criarCardPaciente(id, data, tipo) {
    const info = tipo === "plantao" ? data.plantaoInfo : data.pbInfo;
    const acaoLabel =
      tipo === "plantao"
        ? "Encerrar Atendimento (Plantão)"
        : "Informar Horários (PB)";

    const dataEncaminhamento = info?.dataEncaminhamento
      ? new Date(info.dataEncaminhamento + "T03:00:00").toLocaleDateString(
          "pt-BR"
        )
      : "N/A";

    return `
            <div class="paciente-card" data-id="${id}" data-tipo="${tipo}">
                <h4>${data.nomeCompleto}</h4>
                <p><strong>Status:</strong> ${
                  tipo === "plantao"
                    ? "Em Atendimento (Plantão)"
                    : "Aguardando Info Horários (PB)"
                }</p>
                <p><strong>Telefone:</strong> ${data.telefoneCelular}</p>
                 <p><strong>Data Encaminhamento:</strong> ${dataEncaminhamento}</p>
                <button class="action-button">${acaoLabel}</button>
            </div>
        `;
  }

  function adicionarEventListeners() {
    document
      .querySelectorAll(".paciente-card .action-button")
      .forEach((button) => {
        button.addEventListener("click", async (e) => {
          const card = e.target.closest(".paciente-card");
          const pacienteId = card.dataset.id;
          const tipo = card.dataset.tipo;

          const docSnap = await db
            .collection("trilhaPaciente")
            .doc(pacienteId)
            .get();

          // ===== ALTERAÇÃO APLICADA AQUI =====
          // Corrigido de docSnap.exists() para docSnap.exists
          if (!docSnap.exists) {
            alert("Paciente não encontrado!");
            return;
          }
          const pacienteData = docSnap.data();

          if (tipo === "plantao") {
            abrirModalEncerramento(pacienteId, pacienteData);
          } else {
            abrirModalHorariosPb(pacienteId, pacienteData);
          }
        });
      });
  }

  function abrirModalEncerramento(pacienteId, data) {
    const form = document.getElementById("encerramento-form");
    form.reset();
    document.getElementById("paciente-id-modal").value = pacienteId;
    document.getElementById("disponibilidade-atual").textContent =
      data.disponibilidadeGeral?.join(", ") || "Não informada";

    const pagRadio = form.querySelectorAll(
      'input[name="pagamento-contribuicao"]'
    );
    pagRadio.forEach(
      (radio) =>
        (radio.onchange = () => {
          document
            .getElementById("motivo-nao-pagamento-container")
            .classList.toggle("hidden", radio.value !== "nao");
          document.getElementById("motivo-nao-pagamento").required =
            radio.value === "nao";
        })
    );

    const dispRadio = form.querySelectorAll(
      'input[name="manter-disponibilidade"]'
    );
    dispRadio.forEach(
      (radio) =>
        (radio.onchange = () => {
          document
            .getElementById("nova-disponibilidade-container")
            .classList.toggle("hidden", radio.value !== "nao");
        })
    );

    encerramentoModal.style.display = "block";
  }

  function abrirModalHorariosPb(pacienteId, data) {
    const form = document.getElementById("horarios-pb-form");
    form.reset();
    document.getElementById("paciente-id-horarios-modal").value = pacienteId;

    const iniciouRadio = form.querySelectorAll('input[name="iniciou-pb"]');
    iniciouRadio.forEach(
      (radio) =>
        (radio.onchange = () => {
          const naoIniciou = radio.value === "nao";
          document
            .getElementById("motivo-nao-inicio-pb-container")
            .classList.toggle("hidden", !naoIniciou);
          document
            .getElementById("form-continuacao-pb")
            .classList.toggle("hidden", naoIniciou);
          document.getElementById("motivo-nao-inicio-pb").required = naoIniciou;
          form
            .querySelectorAll(
              "#form-continuacao-pb select, #form-continuacao-pb input"
            )
            .forEach((el) => (el.required = !naoIniciou));
        })
    );

    horariosPbModal.style.display = "block";
  }

  document
    .getElementById("encerramento-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      const saveButton = form.querySelector(".save-btn");
      saveButton.disabled = true;

      const pacienteId = document.getElementById("paciente-id-modal").value;
      const updateData = {
        status: "encaminhar_para_pb",
        "plantaoInfo.encerramento": {
          responsavelId: user.uid,
          responsavelNome: userData.nome,
          encaminhamento: form.querySelector("#encerramento-encaminhamento")
            .value,
          dataEncerramento: form.querySelector("#data-encerramento").value,
          sessoesRealizadas: form.querySelector("#quantidade-sessoes").value,
          pagamentoEfetuado: form.querySelector(
            'input[name="pagamento-contribuicao"]:checked'
          ).value,
          motivoNaoPagamento: form.querySelector("#motivo-nao-pagamento").value,
          relato: form.querySelector("#relato-encerramento").value,
        },
        lastUpdate: new Date(),
      };

      try {
        await db
          .collection("trilhaPaciente")
          .doc(pacienteId)
          .update(updateData);
        alert(
          "Encerramento salvo com sucesso! Paciente movido para a próxima etapa."
        );
        encerramentoModal.style.display = "none";
        carregarMeusPacientes();
      } catch (error) {
        console.error("Erro ao salvar encerramento:", error);
        alert("Erro ao salvar. Tente novamente.");
        saveButton.disabled = false;
      }
    });

  document
    .getElementById("horarios-pb-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      const saveButton = form.querySelector(".save-btn");
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
          desistenciaMotivo: `Não iniciou PB. Motivo: ${
            form.querySelector("#motivo-nao-inicio-pb").value
          }`,
          lastUpdate: new Date(),
        };
      } else {
        updateData = {
          status: "cadastrar_horario_psicomanager",
          "pbInfo.horarioSessao": {
            responsavelId: user.uid,
            responsavelNome: userData.nome,
            diaSemana: form.querySelector("#dia-semana-pb").value,
            horario: form.querySelector("#horario-pb").value,
            tipoAtendimento: form.querySelector(
              "#tipo-atendimento-pb-voluntario"
            ).value,
            alterarGrade: form.querySelector(
              'input[name="alterar-grade"]:checked'
            ).value,
            frequencia: form.querySelector("#frequencia-atendimento-pb").value,
            salaAtendimento: form.querySelector("#sala-atendimento-pb").value,
            dataInicio: form.querySelector("#data-inicio-sessoes").value,
          },
          lastUpdate: new Date(),
        };
      }

      try {
        await db
          .collection("trilhaPaciente")
          .doc(pacienteId)
          .update(updateData);
        alert("Informações de horário salvas com sucesso!");
        horariosPbModal.style.display = "none";
        carregarMeusPacientes();
      } catch (error) {
        console.error("Erro ao salvar horários:", error);
        alert("Erro ao salvar. Tente novamente.");
        saveButton.disabled = false;
      }
    });

  carregarMeusPacientes();
}
