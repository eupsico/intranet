// Arquivo: /modulos/voluntario/js/meus-pacientes.js
// Versão: 4.2 (Corrige erro ao salvar horários da PB)
import { httpsCallable } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-functions.js";
export function init(db, user, userData) {
  const container = document.getElementById("pacientes-cards-container");
  if (!container) return;
  const encerramentoModal = document.getElementById("encerramento-modal");
  const horariosPbModal = document.getElementById("horarios-pb-modal");
  const desfechoPbModal = document.getElementById("desfecho-pb-modal");

  // --- Funções de controle de modais ---
  const allModals = [encerramentoModal, horariosPbModal, desfechoPbModal];
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
      // --- INÍCIO DA CORREÇÃO ---

      // 1. Define os status de interesse para cada fase
      const statusPlantao = ["em_atendimento_plantao"];
      const statusPb = [
        "aguardando_info_horarios",
        "cadastrar_horario_psicomanager",
        "em_atendimento_pb",
      ];

      // 2. Cria consultas específicas que ligam o profissional à fase ATIVA
      const queryPlantao = db
        .collection("trilhaPaciente")
        .where("plantaoInfo.profissionalId", "==", user.uid)
        .where("status", "in", statusPlantao); // Só busca se o status for de plantão

      const queryPb = db
        .collection("trilhaPaciente")
        .where("pbInfo.profissionalId", "==", user.uid)
        .where("status", "in", statusPb); // Só busca se o status for de PB

      // 3. Executa as duas consultas em paralelo
      const [plantaoSnapshot, pbSnapshot] = await Promise.all([
        queryPlantao.get(),
        queryPb.get(),
      ]);

      const todosPacientes = [];
      const pacientesProcessados = new Set();

      // A lógica de processamento continua a mesma, pois as consultas já trazem os dados corretos
      const processarSnapshot = (snapshot) => {
        snapshot.forEach((doc) => {
          if (!pacientesProcessados.has(doc.id)) {
            todosPacientes.push({ id: doc.id, ...doc.data() });
            pacientesProcessados.add(doc.id);
          }
        });
      };

      // --- FIM DA CORREÇÃO ---

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
      // Nota: Se houver um erro no console sobre "índice não encontrado",
      // o Firebase pode pedir para você criar um índice composto.
      // Basta seguir o link que o erro fornece no console para criá-lo com um clique.
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
      // --- LÓGICA ALTERADA AQUI ---
      em_atendimento_pb: data.contratoAssinado
        ? {
            label: "Em Atendimento (PB)",
            acao: "Registrar Desfecho", // Ação muda após assinatura
            tipo: "desfecho_pb", // Novo tipo de ação
            ativo: true,
          }
        : {
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

    // Adiciona um indicador visual para o contrato
    const contratoStatusHtml = data.contratoAssinado
      ? `<p class="contrato-assinado"><i class="fas fa-file-signature"></i> Contrato Assinado</p>`
      : "";
    let pdfButtonHtml = "";
    if (data.status === "em_atendimento_pb" && data.contratoAssinado) {
      pdfButtonHtml = `<button class="action-button secondary-button" data-id="${data.id}" data-tipo="pdf_contrato">PDF Contrato</button>`;
    }
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
          ${contratoStatusHtml}
          <button class="action-button" data-id="${data.id}" data-tipo="${
      info.tipo
    }" ${!info.ativo ? "disabled" : ""}>${info.acao}</button>
    ${pdfButtonHtml}
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
          case "desfecho_pb":
            abrirModalDesfechoPb(pacienteId, pacienteData);
            break;
          case "pdf_contrato":
            gerarPdfContrato(pacienteData); // Passa os dados do paciente
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
  function abrirModalDesfechoPb(pacienteId, pacienteData) {
    const modal = document.getElementById("desfecho-pb-modal");
    const modalBody = document.getElementById("desfecho-pb-modal-body");

    const servicosEncaminhamento = [
      "Psicólogo",
      "Psicopedagogo",
      "Grupo papo de adolescente",
      "Grupo envelhecimento ativo",
      "Grupo família",
      "Grupo Questões de peso",
      "Musicoterapeuta",
      "Grupo Funcional",
      "Assistente Social",
    ];
    const servicosOptions = servicosEncaminhamento
      .map((s) => `<option value="${s}">${s}</option>`)
      .join("");

    modalBody.innerHTML = `
        <form id="form-desfecho-pb" data-paciente-id="${pacienteId}">
            <div class="form-group">
                <label for="desfecho-pb-select">Qual foi o desfecho do acompanhamento?</label>
                <select id="desfecho-pb-select" class="form-control" required>
                    <option value="">Selecione...</option>
                    <option value="Alta">Alta</option>
                    <option value="Desistência">Desistência</option>
                    <option value="Encaminhamento">Realizar Encaminhamento</option>
                </select>
            </div>
            <div id="motivo-alta-desistencia-container" class="form-group hidden">
                <label for="motivo-alta-desistencia-textarea">Descreva brevemente os motivos do desfecho:</label>
                <textarea id="motivo-alta-desistencia-textarea" class="form-control" rows="4"></textarea>
            </div>
            <div id="encaminhamento-pb-container" class="hidden">
                <div class="form-group">
                    <label for="encaminhamento-servico-select">Serviço de Encaminhamento:</label>
                    <select id="encaminhamento-servico-select" class="form-control">${servicosOptions}</select>
                </div>
                <div class="form-group">
                    <label for="encaminhamento-motivo-textarea">Informe o motivo do encaminhamento:</label>
                    <textarea id="encaminhamento-motivo-textarea" class="form-control" rows="3"></textarea>
                </div>
                <div class="form-group">
                    <label for="encaminhamento-demanda-textarea">Informe a demanda do paciente:</label>
                    <textarea id="encaminhamento-demanda-textarea" class="form-control" rows="3"></textarea>
                </div>
                <div class="form-group">
                    <label>O paciente continuará a ser atendido por você?</label>
                    <div class="radio-group">
                        <label><input type="radio" name="continua-atendimento" value="sim"> Sim</label>
                        <label><input type="radio" name="continua-atendimento" value="nao"> Não</label>
                    </div>
                </div>
                <div class="form-group">
                    <label for="valor-contribuicao">Valor da contribuição:</label>
                    <input type="text" id="valor-contribuicao" class="form-control" value="R$ ${
                      pacienteData.valorContribuicao || "0,00"
                    }" readonly>
                </div>
                <div class="form-group">
                    <label for="relato-caso-textarea">Faça um breve relato sobre o caso do paciente:</label>
                    <textarea id="relato-caso-textarea" class="form-control" rows="5" placeholder="Qual a queixa inicial, qual a queixa identificada..."></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button type="submit" class="button-primary">Salvar Desfecho</button>
            </div>
        </form>
    `;

    // Lógica para campos dinâmicos
    const form = modalBody.querySelector("#form-desfecho-pb");
    const desfechoSelect = form.querySelector("#desfecho-pb-select");
    desfechoSelect.addEventListener("change", () => {
      const value = desfechoSelect.value;
      form
        .querySelector("#motivo-alta-desistencia-container")
        .classList.toggle("hidden", value === "Encaminhamento" || !value);
      form
        .querySelector("#encaminhamento-pb-container")
        .classList.toggle("hidden", value !== "Encaminhamento");
    });

    form.addEventListener("submit", handleDesfechoPbSubmit);
    modal.style.display = "block";
  }
  async function handleDesfechoPbSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const pacienteId = form.dataset.pacienteId;
    const saveButton = form.querySelector('button[type="submit"]');

    // As variáveis 'functions' e 'db' são obtidas da função 'init'
    // Certifique-se que elas estão acessíveis neste escopo.
    // O ideal é passá-las como parâmetro ou declarar em um escopo superior.
    // Por simplicidade, assumindo que `functions` está disponível globalmente ou no escopo do módulo.

    saveButton.disabled = true;
    saveButton.textContent = "Salvando...";

    try {
      const desfecho = form.querySelector("#desfecho-pb-select").value;
      if (!desfecho) throw new Error("Selecione um desfecho.");

      // O objeto 'user' e 'userData' devem estar disponíveis no escopo da função init
      const payload = {
        pacienteId,
        desfecho,
        profissionalNome: userData.nome, // Adicionando o nome do profissional ao payload
      };

      if (desfecho === "Encaminhamento") {
        const continuaAtendimento = form.querySelector(
          'input[name="continua-atendimento"]:checked'
        );
        payload.encaminhamento = {
          servico: form.querySelector("#encaminhamento-servico-select").value,
          motivo: form.querySelector("#encaminhamento-motivo-textarea").value,
          demanda: form.querySelector("#encaminhamento-demanda-textarea").value,
          continuaAtendimento: continuaAtendimento
            ? continuaAtendimento.value
            : null,
          relatoCaso: form.querySelector("#relato-caso-textarea").value,
        };
        if (Object.values(payload.encaminhamento).some((v) => !v)) {
          throw new Error(
            "Para encaminhamento, todos os campos são obrigatórios."
          );
        }
      } else {
        payload.motivo = form.querySelector(
          "#motivo-alta-desistencia-textarea"
        ).value;
        if (!payload.motivo) throw new Error("O motivo é obrigatório.");
      }

      // --- INÍCIO DA CORREÇÃO ---
      // Pega a instância 'functions' inicializada corretamente com a v9
      const functionsInstance = firebase.functions();
      // Chama a função usando a sintaxe correta que propaga a autenticação
      const registrarDesfechoPb = httpsCallable(
        functions,
        "registrarDesfechoPb"
      );
      // --- FIM DA CORREÇÃO ---

      const result = await registrarDesfechoPb(payload);

      if (!result.data.success) {
        throw new Error(result.data.message || "Erro no servidor.");
      }

      alert("Desfecho registrado com sucesso!");
      document.getElementById("desfecho-pb-modal").style.display = "none";
      carregarMeusPacientes(); // Recarrega a lista de pacientes
    } catch (error) {
      console.error("Erro ao salvar desfecho:", error);
      alert(`Falha ao salvar: ${error.message}`);
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = "Salvar Desfecho";
    }
  }

  carregarMeusPacientes();
}

async function gerarPdfContrato(pacienteData) {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });

    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const usableWidth = pageWidth - margin * 2;
    let cursorY = 15;

    // --- FUNÇÕES AUXILIARES ---
    const loadImageAsBase64 = async (url) => {
      try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error("Falha ao carregar a imagem do logo:", error);
        return null;
      }
    };

    const addTextSection = (text, options = {}) => {
      const {
        size = 10,
        style = "normal",
        spaceBefore = 0,
        spaceAfter = 5,
      } = options;
      cursorY += spaceBefore;
      doc.setFontSize(size);
      doc.setFont("helvetica", style);
      const lines = doc.splitTextToSize(text, usableWidth);
      const textHeight = doc.getTextDimensions(lines).h;
      if (cursorY + textHeight > pageHeight - margin) {
        doc.addPage();
        cursorY = margin;
      }
      doc.text(lines, margin, cursorY);
      cursorY += textHeight + spaceAfter;
    };

    // --- CABEÇALHO ---
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(
      "CONTRATO DE PRESTAÇÃO DE SERVIÇOS TERAPÊUTICOS",
      pageWidth / 2,
      cursorY + 15,
      { align: "center" }
    );
    cursorY += 35;

    // --- TEXTO DO CONTRATO ---
    const response = await fetch("../../../public/contrato-terapeutico.html");
    if (!response.ok)
      throw new Error("Não foi possível carregar o modelo do contrato.");

    const htmlString = await response.text();
    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(htmlString, "text/html");
    const contractContent = htmlDoc.getElementById("contract-content");

    contractContent.querySelectorAll("h2, h3, p, li, ol").forEach((el) => {
      if (el.closest(".data-section")) return;
      let text = el.textContent.trim();
      if (!text) return;
      const tagName = el.tagName.toLowerCase();
      if (tagName === "h2")
        addTextSection(text, {
          size: 12,
          style: "bold",
          spaceBefore: 5,
          spaceAfter: 4,
        });
      else if (tagName === "li" || tagName === "ol")
        addTextSection(`• ${text}`, { size: 10, spaceAfter: 3 });
      else addTextSection(text, { size: 10, spaceAfter: 5 });
    });

    // --- QUADROS DE DADOS ---
    const pbInfo = pacienteData.pbInfo || {};
    const horarioInfo = pbInfo.horarioSessao || {};
    const formatDate = (dateString) =>
      dateString
        ? new Date(dateString + "T03:00:00").toLocaleDateString("pt-BR")
        : "A definir";
    const formatCurrency = (value) =>
      value
        ? parseFloat(
            value.replace(/[^\d,]/g, "").replace(",", ".")
          ).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : "A definir";

    const addDataBox = (title, data) => {
      addTextSection(title, { size: 11, style: "bold", spaceBefore: 8 });
      const boxStartY = cursorY;
      data.forEach(([label, value]) =>
        addTextSection(`${label} ${value}`, { size: 10, spaceAfter: 2 })
      );
      doc.rect(
        margin - 2,
        boxStartY - 4,
        usableWidth + 4,
        cursorY - boxStartY,
        "S"
      );
      cursorY += 5;
    };

    addDataBox("Dados do Terapeuta e Paciente", [
      ["Terapeuta:", pbInfo.profissionalNome || "A definir"],
      [
        "Nome completo do PACIENTE:",
        pacienteData.nomeCompleto || "Não informado",
      ],
      [
        "Nome do Responsável:",
        pacienteData.responsavel?.nome || "Não aplicável",
      ],
      [
        "Data de nascimento do PACIENTE:",
        formatDate(pacienteData.dataNascimento),
      ],
      [
        "Valor da contribuição mensal:",
        formatCurrency(pacienteData.valorContribuicao),
      ],
    ]);

    addDataBox("Dados da Sessão", [
      ["Dia da sessão:", horarioInfo.diaSemana || "A definir"],
      ["Horário do atendimento:", horarioInfo.horario || "A definir"],
      ["Tipo de atendimento:", horarioInfo.tipoAtendimento || "A definir"],
    ]);

    // --- DADOS DA ASSINATURA ---
    if (
      pacienteData.contratoAssinado &&
      pacienteData.contratoAssinado.assinadoEm
    ) {
      const assinatura = pacienteData.contratoAssinado;
      const dataAssinatura = assinatura.assinadoEm.toDate();
      const textoAssinatura = `Assinado digitalmente por ${
        assinatura.nomeSignatario
      } (CPF: ${
        assinatura.cpfSignatario
      }) em ${dataAssinatura.toLocaleDateString(
        "pt-BR"
      )} às ${dataAssinatura.toLocaleTimeString("pt-BR")}.`;

      const pageCount = doc.internal.getNumberOfPages();
      doc.setPage(pageCount);

      if (cursorY > pageHeight - 40) {
        doc.addPage();
        cursorY = margin;
      } else {
        cursorY = pageHeight - 40;
      }

      addTextSection("Contrato Assinado", {
        size: 12,
        style: "bold",
        spaceAfter: 4,
      });
      addTextSection(textoAssinatura, { size: 10, spaceAfter: 0 });
    }

    // --- MARCA D'ÁGUA ---
    const logoUrl = "../../../assets/img/logo-eupsico.png";
    const logoBase64 = await loadImageAsBase64(logoUrl);
    const totalPages = doc.internal.getNumberOfPages();

    if (logoBase64) {
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);

        // --- INÍCIO DA CORREÇÃO ---
        // Define a opacidade de forma compatível
        doc.setGState(new doc.GState({ opacity: 0.1, "stroke-opacity": 0.1 }));
        // --- FIM DA CORREÇÃO ---

        const imgWidth = 90;
        const imgHeight = 90;
        const x = (pageWidth - imgWidth) / 2;
        const y = (pageHeight - imgHeight) / 2;

        doc.addImage(
          logoBase64,
          "PNG",
          x,
          y,
          imgWidth,
          imgHeight,
          undefined,
          "FAST"
        );

        // Reseta a opacidade para o normal
        doc.setGState(new doc.GState({ opacity: 1, "stroke-opacity": 1 }));
      }
    }

    // --- SALVAR O PDF ---
    doc.save(`Contrato_${pacienteData.nomeCompleto.replace(/ /g, "_")}.pdf`);
  } catch (error) {
    console.error("Erro ao gerar PDF completo do contrato:", error);
    alert(
      "Não foi possível gerar o PDF. Verifique o console para mais detalhes."
    );
  }
}
