// Arquivo: /modulos/voluntario/js/meus-pacientes.js
// Versão: 3.7 (Lógica dos checkboxes de encaminhamento corrigida)

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
    // ... (esta função continua a mesma)
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
    // ... (esta função continua a mesma)
    const info = tipo === "plantao" ? data.plantaoInfo : data.pbInfo;
    const acaoLabel =
      tipo === "plantao" ? "Encerrar Plantão" : "Informar Horários (PB)";

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
    // ... (esta função continua a mesma)
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

  // ===== FUNÇÃO ATUALIZADA =====
  function abrirModalEncerramento(pacienteId, data) {
    const form = document.getElementById("encerramento-form");
    form.reset();
    document.getElementById("paciente-id-modal").value = pacienteId;
    document.getElementById("disponibilidade-atual").textContent =
      data.disponibilidadeGeral?.join(", ") || "Não informada";

    const pagamentoSelect = form.querySelector("#pagamento-contribuicao");
    pagamentoSelect.onchange = () => {
      document
        .getElementById("motivo-nao-pagamento-container")
        .classList.toggle("hidden", pagamentoSelect.value !== "nao");
      document.getElementById("motivo-nao-pagamento").required =
        pagamentoSelect.value === "nao";
    };

    const dispSelect = form.querySelector("#manter-disponibilidade");
    dispSelect.onchange = () => {
      document
        .getElementById("nova-disponibilidade-container")
        .classList.toggle("hidden", dispSelect.value !== "nao");
    };

    // --- INÍCIO DA LÓGICA CORRIGIDA ---
    const encaminhamentoCheckboxes = form.querySelectorAll(
      'input[name="encaminhamento"]'
    );
    const altaCheckbox = form.querySelector('input[value="Alta"]');
    const desistenciaCheckbox = form.querySelector(
      'input[value="Desistência"]'
    );

    const reabilitarTodos = () => {
      encaminhamentoCheckboxes.forEach((cb) => {
        // Não mexe nos que são inativos por padrão
        if (!cb.closest("label").classList.contains("disabled")) {
          cb.disabled = false;
          cb.parentElement.classList.remove("disabled");
        }
      });
    };

    // Garante que todos comecem habilitados ao abrir o modal
    reabilitarTodos();

    encaminhamentoCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const altaChecked = altaCheckbox.checked;
        const desistenciaChecked = desistenciaCheckbox.checked;

        // Reabilita todos antes de aplicar a nova regra
        reabilitarTodos();

        if (altaChecked) {
          // Desabilita todos, exceto 'Alta'
          encaminhamentoCheckboxes.forEach((cb) => {
            if (cb.value !== "Alta") {
              cb.checked = false;
              cb.disabled = true;
              if (!cb.closest("label").classList.contains("disabled")) {
                cb.parentElement.classList.add("disabled");
              }
            }
          });
        } else if (desistenciaChecked) {
          // Desabilita todos, exceto 'Desistência'
          encaminhamentoCheckboxes.forEach((cb) => {
            if (cb.value !== "Desistência") {
              cb.checked = false;
              cb.disabled = true;
              if (!cb.closest("label").classList.contains("disabled")) {
                cb.parentElement.classList.add("disabled");
              }
            }
          });
        }
        // Se nenhum dos dois estiver marcado, a função reabilitarTodos() no início já fez o trabalho.
      });
    });
    // --- FIM DA LÓGICA CORRIGIDA ---

    encerramentoModal.style.display = "block";
  }

  function abrirModalHorariosPb(pacienteId, data) {
    // ... (esta função continua a mesma)
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
      // ... (esta função continua a mesma)
      e.preventDefault();
      const form = e.target;
      const saveButton = form.querySelector(".save-btn");
      saveButton.disabled = true;

      const pacienteId = document.getElementById("paciente-id-modal").value;

      const encaminhamentosSelecionados = Array.from(
        form.querySelectorAll('input[name="encaminhamento"]:checked')
      ).map((cb) => cb.value);

      if (encaminhamentosSelecionados.length === 0) {
        alert("Por favor, selecione ao menos uma opção de encaminhamento.");
        saveButton.disabled = false;
        return;
      }

      const updateData = {
        status: "encaminhar_para_pb",
        "plantaoInfo.encerramento": {
          responsavelId: user.uid,
          responsavelNome: userData.nome,
          encaminhamento: encaminhamentosSelecionados,
          dataEncerramento: form.querySelector("#data-encerramento").value,
          sessoesRealizadas: form.querySelector("#quantidade-sessoes").value,
          pagamentoEfetuado: form.querySelector("#pagamento-contribuicao")
            .value,
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
      // ... (esta função continua a mesma)
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
