// Arquivo: /modulos/voluntario/js/meus-pacientes.js
// Versão: 4.2 (Corrige erro ao salvar horários da PB)

export function init(db, user, userData) {
  const container = document.getElementById("pacientes-cards-container");
  if (!container) return;

  const encerramentoModal = document.getElementById("encerramento-modal");
  const horariosPbModal = document.getElementById("horarios-pb-modal");

  // --- Funções de controle de modais ---
  const allModals = [encerramentoModal, horariosPbModal];
  document
    .querySelectorAll(
      ".modal .close-button, #modal-cancel-btn, [data-close-modal]"
    )
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        allModals.forEach((modal) => {
          if (modal) modal.style.display = "none";
        });
      });
    });

  window.addEventListener("click", (event) => {
    allModals.forEach((modal) => {
      if (modal && event.target == modal) modal.style.display = "none";
    });
  });

  async function carregarMeusPacientes() {
    container.innerHTML = '<div class="loading-spinner"></div>';

    try {
      const statusDeInteresse = [
        "em_atendimento_plantao",
        "encaminhar_para_pb",
        "aguardando_info_horarios",
        "cadastrar_horario_psicomanager",
        "em_atendimento_pb",
      ];

      const queryPlantao = db
        .collection("trilhaPaciente")
        .where("plantaoInfo.profissionalId", "==", user.uid);
      const queryPb = db
        .collection("trilhaPaciente")
        .where("pbInfo.profissionalId", "==", user.uid);

      const [plantaoSnapshot, pbSnapshot] = await Promise.all([
        queryPlantao.get(),
        queryPb.get(),
      ]);

      const todosPacientes = [];
      const pacientesProcessados = new Set();

      const processarSnapshot = (snapshot) => {
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (
            statusDeInteresse.includes(data.status) &&
            !pacientesProcessados.has(doc.id)
          ) {
            todosPacientes.push({ id: doc.id, ...data });
            pacientesProcessados.add(doc.id);
          }
        });
      };

      processarSnapshot(plantaoSnapshot);
      processarSnapshot(pbSnapshot);

      if (todosPacientes.length === 0) {
        container.innerHTML =
          "<p>Você não tem pacientes designados nos estágios de atendimento ativo no momento.</p>";
        return;
      }

      todosPacientes.sort((a, b) =>
        a.nomeCompleto.localeCompare(b.nomeCompleto)
      );
      container.innerHTML = todosPacientes
        .map((paciente) => criarCardPaciente(paciente))
        .join("");

      adicionarEventListeners();
    } catch (error) {
      console.error("Falha crítica ao buscar pacientes.", error);
      container.innerHTML =
        '<p class="error-message">Ocorreu um erro ao carregar seus pacientes.</p>';
    }
  }

  function criarCardPaciente(data) {
    const statusMap = {
      em_atendimento_plantao: {
        label: "Em Atendimento (Plantão)",
        acao: "Encerrar Plantão",
        tipo: "plantao",
        ativo: true,
      },
      aguardando_info_horarios: {
        label: "Aguardando Info Horários (PB)",
        acao: "Informar Horários (PB)",
        tipo: "pb",
        ativo: true,
      },
      encaminhar_para_pb: {
        label: "Encaminhado para PB",
        acao: "Aguardando Secretaria",
        tipo: "info",
        ativo: false,
      },
      cadastrar_horario_psicomanager: {
        label: "Horários em Processamento",
        acao: "Aguardando Secretaria",
        tipo: "info",
        ativo: false,
      },
      em_atendimento_pb: {
        label: "Em Atendimento (PB)",
        acao: "Enviar Contrato",
        tipo: "contrato",
        ativo: true,
      },
    };

    const info = statusMap[data.status] || {
      label: data.status.replace(/_/g, " "),
      acao: "Ver Detalhes",
      tipo: "info",
      ativo: false,
    };
    const infoContato = data.pbInfo?.dataEncaminhamento
      ? data.pbInfo
      : data.plantaoInfo;
    const dataEncaminhamento = infoContato?.dataEncaminhamento
      ? new Date(
          infoContato.dataEncaminhamento + "T03:00:00"
        ).toLocaleDateString("pt-BR")
      : "N/A";

    return `
            <div class="paciente-card" data-id="${data.id}" data-tipo="${
      info.tipo
    }" data-telefone="${data.telefoneCelular || ""}">
                <h4>${data.nomeCompleto}</h4>
                <p><strong>Status:</strong> ${info.label}</p>
                <p><strong>Telefone:</strong> ${
                  data.telefoneCelular || "Não informado"
                }</p>
                <p><strong>Data Encaminhamento:</strong> ${dataEncaminhamento}</p>
                <button class="action-button" data-id="${data.id}" data-tipo="${
      info.tipo
    }" ${!info.ativo ? "disabled" : ""}>${info.acao}</button>
            </div>`;
  }

  function adicionarEventListeners() {
    container.addEventListener("click", async (event) => {
      const button = event.target.closest(".action-button:not([disabled])");
      if (!button) return;

      const card = button.closest(".paciente-card");
      const pacienteId = button.dataset.id;
      const tipo = button.dataset.tipo;
      const telefone = card.dataset.telefone;

      try {
        const docSnap = await db
          .collection("trilhaPaciente")
          .doc(pacienteId)
          .get();
        if (!docSnap.exists) {
          alert("Paciente não encontrado!");
          return;
        }
        const pacienteData = docSnap.data();

        switch (tipo) {
          case "plantao":
            abrirModalEncerramento(pacienteId, pacienteData);
            break;
          case "pb":
            abrirModalHorariosPb(pacienteId, pacienteData);
            break;
          case "contrato":
            handleEnviarContrato(
              pacienteId,
              telefone,
              pacienteData.nomeCompleto
            );
            break;
        }
      } catch (error) {
        console.error("Erro ao processar ação do card:", error);
        alert("Ocorreu um erro ao buscar os dados do paciente.");
      }
    });
  }

  function handleEnviarContrato(pacienteId, telefone, nomePaciente) {
    const numeroLimpo = telefone ? telefone.replace(/\D/g, "") : "";
    if (!numeroLimpo || numeroLimpo.length < 10) {
      alert(
        "O número de telefone do paciente não é válido para envio via WhatsApp."
      );
      return;
    }
    const contractUrl = `${window.location.origin}/public/contrato-terapeutico.html?id=${pacienteId}`;
    const mensagem = `Olá, ${nomePaciente}! Tudo bem?\n\nSegue o link para leitura e aceite do nosso contrato terapêutico. Por favor, preencha ao final para darmos continuidade.\n\n${contractUrl}\n\nQualquer dúvida, estou à disposição!`;
    const whatsappUrl = `https://api.whatsapp.com/send?phone=55${numeroLimpo}&text=${encodeURIComponent(
      mensagem
    )}`;
    window.open(whatsappUrl, "_blank");
  }

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
      const iniciouRadio = form.querySelector(
        'input[name="iniciou-pb"]:checked'
      );

      if (!iniciouRadio) {
        alert("Por favor, selecione se o paciente iniciou o atendimento.");
        saveButton.disabled = false;
        return;
      }

      const iniciou = iniciouRadio.value;
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
        // ***** CORREÇÃO APLICADA AQUI *****
        // O seletor foi ajustado de 'input[name="alterar-grade"]:checked' para '#alterar-grade-pb'
        const alterarGradeValue = form.querySelector("#alterar-grade-pb").value;

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
            alterarGrade: alterarGradeValue, // Valor corrigido
            frequencia: form.querySelector("#frequencia-atendimento-pb").value,
            salaAtendimento: form.querySelector("#sala-atendimento-pb").value,
            dataInicio: form.querySelector("#data-inicio-sessoes").value,
            observacoes: form.querySelector("#observacoes-pb-horarios").value,
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
        carregarMeusPacientes();
      } catch (error) {
        console.error("Erro ao salvar horários:", error);
        alert("Erro ao salvar. Tente novamente.");
      } finally {
        saveButton.disabled = false;
      }
    });

  // (O restante do seu código, com as outras funções de modal, permanece inalterado)

  async function abrirModalEncerramento(pacienteId, data) {
    const form = document.getElementById("encerramento-form");
    form.reset();
    document.getElementById("paciente-id-modal").value = pacienteId;
    const disponibilidadeEspecifica = data.disponibilidadeEspecifica || [];
    const textoDisponibilidade =
      disponibilidadeEspecifica.length > 0
        ? disponibilidadeEspecifica
            .map((item) => {
              const [periodo, hora] = item.split("_");
              const periodoFormatado =
                periodo.replace("-", " (").replace("-", " ") + ")";
              return `${
                periodoFormatado.charAt(0).toUpperCase() +
                periodoFormatado.slice(1)
              } ${hora}`;
            })
            .join(", ")
        : "Nenhuma disponibilidade específica informada.";

    document.getElementById("disponibilidade-atual").textContent =
      textoDisponibilidade;

    const pagamentoSelect = form.querySelector("#pagamento-contribuicao");
    pagamentoSelect.onchange = () => {
      document
        .getElementById("motivo-nao-pagamento-container")
        .classList.toggle("hidden", pagamentoSelect.value !== "nao");
      document.getElementById("motivo-nao-pagamento").required =
        pagamentoSelect.value === "nao";
    };

    const encaminhamentoCheckboxes = form.querySelectorAll(
      'input[name="encaminhamento"]'
    );
    const altaCheckbox = form.querySelector('input[value="Alta"]');
    const desistenciaCheckbox = form.querySelector(
      'input[value="Desistência"]'
    );

    const reabilitarTodos = () => {
      encaminhamentoCheckboxes.forEach((cb) => {
        if (!cb.closest("label").classList.contains("disabled")) {
          cb.disabled = false;
          cb.parentElement.classList.remove("disabled-temp");
        }
      });
    };

    encaminhamentoCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const altaChecked = altaCheckbox.checked;
        const desistenciaChecked = desistenciaCheckbox.checked;
        reabilitarTodos();
        if (altaChecked) {
          encaminhamentoCheckboxes.forEach((cb) => {
            if (cb.value !== "Alta") {
              cb.checked = false;
              cb.disabled = true;
              if (!cb.closest("label").classList.contains("disabled")) {
                cb.parentElement.classList.add("disabled-temp");
              }
            }
          });
        } else if (desistenciaChecked) {
          encaminhamentoCheckboxes.forEach((cb) => {
            if (cb.value !== "Desistência") {
              cb.checked = false;
              cb.disabled = true;
              if (!cb.closest("label").classList.contains("disabled")) {
                cb.parentElement.classList.add("disabled-temp");
              }
            }
          });
        }
      });
    });

    const style = document.createElement("style");
    style.textContent = `
    .checkbox-group label.disabled-temp {
        color: #999;
        cursor: not-allowed;
        text-decoration: line-through;
    }
`;
    document.head.appendChild(style);
    const dispSelect = form.querySelector("#manter-disponibilidade");
    const novaDisponibilidadeContainer = document.getElementById(
      "nova-disponibilidade-container"
    );

    dispSelect.onchange = async () => {
      const mostrar = dispSelect.value === "nao";
      novaDisponibilidadeContainer.classList.toggle("hidden", !mostrar);
      if (mostrar && novaDisponibilidadeContainer.innerHTML.trim() === "") {
        novaDisponibilidadeContainer.innerHTML =
          '<div class="loading-spinner"></div>';
        try {
          const response = await fetch(
            "../../../public/fichas-de-inscricao.html"
          );
          const text = await response.text();
          const parser = new DOMParser();
          const doc = parser.parseFromString(text, "text/html");
          const disponibilidadeHtml = doc.getElementById(
            "disponibilidade-section"
          ).innerHTML;
          novaDisponibilidadeContainer.innerHTML = disponibilidadeHtml;
          addDisponibilidadeListeners(novaDisponibilidadeContainer);
        } catch (error) {
          console.error("Erro ao carregar HTML da disponibilidade:", error);
          novaDisponibilidadeContainer.innerHTML =
            '<p class="error-message">Erro ao carregar opções.</p>';
        }
      }
    };
    dispSelect.value = "";
    novaDisponibilidadeContainer.classList.add("hidden");
    novaDisponibilidadeContainer.innerHTML = "";

    encerramentoModal.style.display = "block";
  }

  function addDisponibilidadeListeners(container) {
    const horariosCheckboxes = container.querySelectorAll(
      'input[name="horario"]'
    );
    horariosCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", (e) => {
        const periodo = e.target.value;
        const detalheContainer = container.querySelector(
          `#container-${periodo}`
        );
        if (e.target.checked) {
          gerarHorarios(periodo, detalheContainer);
          detalheContainer.classList.remove("hidden-section");
        } else {
          detalheContainer.innerHTML = "";
          detalheContainer.classList.add("hidden-section");
        }
      });
    });
  }

  function gerarHorarios(periodo, container) {
    let horarios = [],
      label = "";
    switch (periodo) {
      case "manha-semana":
        label = "Manhã (Seg-Sex):";
        for (let i = 8; i < 12; i++) horarios.push(`${i}:00`);
        break;
      case "tarde-semana":
        label = "Tarde (Seg-Sex):";
        for (let i = 12; i < 18; i++) horarios.push(`${i}:00`);
        break;
      case "noite-semana":
        label = "Noite (Seg-Sex):";
        for (let i = 18; i < 21; i++) horarios.push(`${i}:00`);
        break;
      case "manha-sabado":
        label = "Manhã (Sábado):";
        for (let i = 8; i < 13; i++) horarios.push(`${i}:00`);
        break;
    }
    let html = `<label class="horario-detalhe-label">${label}</label><div class="horario-detalhe-grid">`;
    horarios.forEach((hora) => {
      html += `<div><label><input type="checkbox" name="horario-especifico" value="${periodo}_${hora}"> ${hora}</label></div>`;
    });
    container.innerHTML = html + `</div>`;
  }

  function abrirModalHorariosPb(pacienteId, data) {
    const form = document.getElementById("horarios-pb-form");
    form.reset();
    document.getElementById("paciente-id-horarios-modal").value = pacienteId;
    const iniciouRadio = form.querySelectorAll('input[name="iniciou-pb"]');
    const motivoContainer = document.getElementById(
      "motivo-nao-inicio-pb-container"
    );
    const continuacaoContainer = document.getElementById("form-continuacao-pb");
    continuacaoContainer.innerHTML = "";
    iniciouRadio.forEach((radio) => {
      radio.onchange = () => {
        const mostrarFormulario = radio.value === "sim" && radio.checked;
        const mostrarMotivo = radio.value === "nao" && radio.checked;
        motivoContainer.classList.toggle("hidden", !mostrarMotivo);
        continuacaoContainer.classList.toggle("hidden", !mostrarFormulario);
        document.getElementById("motivo-nao-inicio-pb").required =
          mostrarMotivo;
        if (mostrarFormulario && continuacaoContainer.innerHTML === "") {
          continuacaoContainer.innerHTML = construirFormularioHorarios(
            userData.nome
          );
        }
        continuacaoContainer
          .querySelectorAll("select, input, textarea")
          .forEach((el) => {
            if (el.id !== "observacoes-pb-horarios") {
              el.required = mostrarFormulario;
            }
          });
      };
    });
    horariosPbModal.style.display = "block";
  }

  function construirFormularioHorarios(nomeProfissional) {
    let horasOptions = "";
    for (let i = 8; i <= 21; i++) {
      const hora = `${String(i).padStart(2, "0")}:00`;
      horasOptions += `<option value="${hora}">${hora}</option>`;
    }
    const salas = [
      "Christian Dunker",
      "Leila Tardivo",
      "Leonardo Abrahão",
      "Karina Okajima Fukumitsu",
      "Maria Célia Malaquias (Grupo)",
      "Maria Júlia Kovacs",
      "Online",
    ];
    let salasOptions = salas
      .map((sala) => `<option value="${sala}">${sala}</option>`)
      .join("");
    return `<div class="form-group"><label for="nome-profissional-pb">Nome Profissional:</label><input type="text" id="nome-profissional-pb" class="form-control" value="${nomeProfissional}" readonly></div><div class="form-group"><label for="dia-semana-pb">Informe o dia da semana:</label><select id="dia-semana-pb" class="form-control" required><option value="">Selecione...</option><option value="Segunda-feira">Segunda-feira</option><option value="Terça-feira">Terça-feira</option><option value="Quarta-feira">Quarta-feira</option><option value="Quinta-feira">Quinta-feira</option><option value="Sexta-feira">Sexta-feira</option><option value="Sábado">Sábado</option></select></div><div class="form-group"><label for="horario-pb">Selecione o horário:</label><select id="horario-pb" class="form-control" required><option value="">Selecione...</option>${horasOptions}</select></div><div class="form-group"><label for="tipo-atendimento-pb-voluntario">Tipo de atendimento:</label><select id="tipo-atendimento-pb-voluntario" class="form-control" required><option value="">Selecione...</option><option value="Presencial">Presencial</option><option value="Online">Online</option></select></div><div class="form-group"><label for="alterar-grade-pb">Será preciso alterar ou incluir o novo horário na grade?</label><select id="alterar-grade-pb" class="form-control" required><option value="">Selecione...</option><option value="Sim">Sim</option><option value="Não">Não</option></select></div><div class="form-group"><label for="frequencia-atendimento-pb">Frequência:</label><select id="frequencia-atendimento-pb" class="form-control" required><option value="">Selecione...</option><option value="Semanal">Semanal</option><option value="Quinzenal">Quinzenal</option><option value="Mensal">Mensal</option></select></div><div class="form-group"><label for="sala-atendimento-pb">Sala de atendimento:</label><select id="sala-atendimento-pb" class="form-control" required><option value="">Selecione...</option>${salasOptions}</select></div><div class="form-group"><label for="data-inicio-sessoes">Data de início das sessões:</label><input type="date" id="data-inicio-sessoes" class="form-control" required></div><div class="form-group"><label for="observacoes-pb-horarios">Observações:</label><textarea id="observacoes-pb-horarios" rows="3" class="form-control"></textarea></div>`;
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
        alert("Selecione ao menos uma opção de encaminhamento.");
        saveButton.disabled = false;
        return;
      }
      let novoStatus = encaminhamentos.includes("Alta")
        ? "alta"
        : encaminhamentos.includes("Desistência")
        ? "desistencia"
        : "encaminhar_para_pb";
      let updateData = {
        status: novoStatus,
        "plantaoInfo.encerramento": {
          responsavelId: user.uid,
          responsavelNome: userData.nome,
          encaminhamento: encaminhamentos,
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
        alert("Encerramento salvo com sucesso!");
        encerramentoModal.style.display = "none";
        carregarMeusPacientes();
      } catch (error) {
        console.error("Erro ao salvar encerramento:", error);
        alert("Erro ao salvar.");
      } finally {
        saveButton.disabled = false;
      }
    });

  carregarMeusPacientes();
}
