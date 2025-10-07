// Arquivo: /modulos/voluntario/js/meus-pacientes.js
// Versão: 5.0 (Implementa Múltiplos Atendimentos em PB)
import { httpsCallable } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-functions.js";
import {
  doc,
  updateDoc,
  arrayUnion,
  deleteField,
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
export function init(db, user, userData) {
  const container = document.getElementById("pacientes-cards-container");
  if (!container) {
    return;
  }
  const encerramentoModal = document.getElementById("encerramento-modal");
  const horariosPbModal = document.getElementById("horarios-pb-modal");
  const desfechoPbModal = document.getElementById("desfecho-pb-modal"); // --- Funções de controle dos modais ---

  const todosOsModais = [encerramentoModal, horariosPbModal, desfechoPbModal];
  document
    .querySelectorAll(
      ".modal .close-button, #modal-cancel-btn, [data-close-modal]"
    )
    .forEach((botao) => {
      botao.addEventListener("click", () => {
        todosOsModais.forEach((modal) => {
          if (modal) {
            modal.style.display = "none";
          }
        });
      });
    });

  window.addEventListener("click", (evento) => {
    todosOsModais.forEach((modal) => {
      if (modal && evento.target === modal) {
        modal.style.display = "none";
      }
    });
  });

  async function carregarMeusPacientes() {
    container.innerHTML = '<div class="loading-spinner"></div>';
    console.log("--- Iniciando carregarMeusPacientes (Versão com Logs) ---");

    try {
      console.log("Passo 1: Definindo as consultas para Plantão e PB."); // Consultas simplificadas para evitar o erro de query inválida
      const queryPlantao = db
        .collection("trilhaPaciente")
        .where("plantaoInfo.profissionalId", "==", user.uid);

      const queryPb = db
        .collection("trilhaPaciente")
        .where("profissionaisPB_ids", "array-contains", user.uid);

      console.log("Passo 2: Executando as consultas ao Firestore...");
      const [plantaoSnapshot, pbSnapshot] = await Promise.all([
        queryPlantao.get(),
        queryPb.get(),
      ]);
      console.log("Passo 3: Consultas concluídas com sucesso.");
      console.log(
        ` -> Encontrados ${plantaoSnapshot.size} pacientes potenciais de Plantão.`
      );
      console.log(
        ` -> Encontrados ${pbSnapshot.size} pacientes potenciais de PB.`
      );

      let cardsHtml = "";
      const pacientesProcessados = new Set();

      console.log("Passo 4: Filtrando resultados de Plantão...");
      plantaoSnapshot.forEach((doc) => {
        const paciente = { id: doc.id, ...doc.data() };
        // O filtro de status é aplicado aqui
        if (
          paciente.status === "em_atendimento_plantao" &&
          !pacientesProcessados.has(paciente.id)
        ) {
          console.log(
            `  - [PLANTÃO] Adicionando card para o paciente: ${paciente.nomeCompleto}`
          );
          cardsHtml += criarCardPaciente(paciente);
          pacientesProcessados.add(paciente.id);
        }
      });

      console.log("Passo 5: Filtrando resultados de PB...");
      pbSnapshot.forEach((doc) => {
        const paciente = { id: doc.id, ...doc.data() };
        const meuAtendimento = paciente.atendimentosPB?.find(
          (at) => at.profissionalId === user.uid
        );

        // O filtro de status do atendimento é aplicado aqui
        if (meuAtendimento && meuAtendimento.statusAtendimento === "ativo") {
          console.log(
            `  - [PB] Adicionando card para o paciente: ${paciente.nomeCompleto} (Atendimento ID: ${meuAtendimento.atendimentoId})`
          );
          cardsHtml += criarCardPaciente(paciente, meuAtendimento);
        }
      });

      if (cardsHtml === "") {
        console.log(
          "Passo 6: Nenhum paciente ativo encontrado para este profissional."
        );
        container.innerHTML =
          "<p>Você não tem pacientes designados nos estágios de atendimento ativo no momento.</p>";
        return;
      }

      console.log("Passo 7: Renderizando os cards na tela.");
      container.innerHTML = cardsHtml;
      const cards = Array.from(container.querySelectorAll(".paciente-card"));
      cards.sort((a, b) =>
        a
          .querySelector("h4")
          .textContent.localeCompare(b.querySelector("h4").textContent)
      );
      cards.forEach((card) => container.appendChild(card));

      adicionarEventListeners();
      console.log("--- Finalizado carregarMeusPacientes com sucesso. ---");
    } catch (error) {
      // Log de erro detalhado
      console.error("--- ERRO CRÍTICO em carregarMeusPacientes ---");
      console.error(
        "Ocorreu um erro durante a busca ou processamento dos pacientes."
      );
      console.error("Mensagem de erro:", error.message);
      console.error("Detalhes do erro:", error);
      container.innerHTML = `<p class="error-message">Ocorreu um erro ao carregar seus pacientes. Verifique o console (F12) para detalhes técnicos.</p>`;
    }
  }

  function criarCardPaciente(dadosDoPaciente, atendimentoPB = null) {
    const isAtendimentoDePlantao = !atendimentoPB;
    const statusGeralDoPaciente = dadosDoPaciente.status;

    let statusParaExibicao = statusGeralDoPaciente;
    if (atendimentoPB) {
      if (statusGeralDoPaciente === "aguardando_info_horarios") {
        statusParaExibicao = "aguardando_info_horarios";
      } else if (!dadosDoPaciente.contratoAssinado) {
        statusParaExibicao = "aguardando_contrato";
      } else {
        statusParaExibicao = "em_atendimento_pb";
      }
    }

    const mapaDeStatus = {
      em_atendimento_plantao: {
        label: "Em Atendimento (Plantão)",
        acao: "Encerrar Plantão",
        tipo: "plantao",
        ativo: true,
      },
      aguardando_info_horarios: {
        label: "Aguardando Info Horários (PB)",
        acao: "Informar Horários",
        tipo: "pb_horarios",
        ativo: true,
      },
      aguardando_contrato: {
        label: "Em Atendimento (PB)",
        acao: "Enviar Contrato",
        tipo: "contrato",
        ativo: true,
      },
      em_atendimento_pb: {
        label: "Em Atendimento (PB)",
        acao: "Registrar Desfecho",
        tipo: "desfecho_pb",
        ativo: true,
      },
    };

    const infoStatus = mapaDeStatus[
      isAtendimentoDePlantao ? "em_atendimento_plantao" : statusParaExibicao
    ] || {
      label: "Status Desconhecido",
      acao: "-",
      tipo: "info",
      ativo: false,
    };

    const informacoesDeContato = atendimentoPB || dadosDoPaciente.plantaoInfo;
    const dataEncaminhamento = informacoesDeContato?.dataEncaminhamento
      ? new Date(
          informacoesDeContato.dataEncaminhamento + "T03:00:00"
        ).toLocaleDateString("pt-BR")
      : "N/A";

    const htmlStatusContrato = dadosDoPaciente.contratoAssinado
      ? `<p class="contrato-assinado"><i class="fas fa-file-signature"></i> Contrato Assinado</p>`
      : "";

    let htmlBotaoPdf = "";
    if (atendimentoPB && dadosDoPaciente.contratoAssinado) {
      htmlBotaoPdf = `<button class="action-button secondary-button" data-id="${dadosDoPaciente.id}" data-atendimento-id="${atendimentoPB.atendimentoId}" data-tipo="pdf_contrato">PDF Contrato</button>`;
    }

    const atributoIdAtendimento = atendimentoPB
      ? `data-atendimento-id="${atendimentoPB.atendimentoId}"`
      : "";

    return `
   <div class="paciente-card" data-id="${dadosDoPaciente.id}" data-telefone="${
      dadosDoPaciente.telefoneCelular || ""
    }">
   <h4>${dadosDoPaciente.nomeCompleto}</h4>
   <p><strong>Status:</strong> ${infoStatus.label}</p>
   <p><strong>Telefone:</strong> ${
     dadosDoPaciente.telefoneCelular || "Não informado"
   }</p>    <p><strong>Data Encaminhamento:</strong> ${dataEncaminhamento}</p>
   ${htmlStatusContrato}
              <div class="card-actions">
     <button class="action-button" data-id="${dadosDoPaciente.id}" data-tipo="${
      infoStatus.tipo
    }" ${atributoIdAtendimento} ${!infoStatus.ativo ? "disabled" : ""}>${
      infoStatus.acao
    }</button>
                ${htmlBotaoPdf}
              </div>
  </div>`;
  }

  function adicionarEventListeners() {
    container.addEventListener("click", async (evento) => {
      const botao = evento.target.closest(".action-button:not([disabled])");
      if (!botao) return;

      const card = botao.closest(".paciente-card");
      const pacienteId = botao.dataset.id;
      const atendimentoId = botao.dataset.atendimentoId;
      const tipoDeAcao = botao.dataset.tipo;
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
        const dadosDoPaciente = { id: docSnap.id, ...docSnap.data() };
        const meuAtendimento = dadosDoPaciente.atendimentosPB?.find(
          (at) => at.atendimentoId === atendimentoId
        );

        switch (tipoDeAcao) {
          case "plantao":
            abrirModalEncerramento(pacienteId, dadosDoPaciente);
            break;
          case "pb_horarios":
            abrirModalHorariosPb(pacienteId, atendimentoId);
            break;
          case "contrato":
            handleEnviarContrato(
              pacienteId,
              telefone,
              dadosDoPaciente.nomeCompleto
            );
            break;
          case "desfecho_pb":
            abrirModalDesfechoPb(pacienteId, atendimentoId, dadosDoPaciente);
            break;
          case "pdf_contrato":
            gerarPdfContrato(dadosDoPaciente, meuAtendimento);
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
    .addEventListener("submit", async (evento) => {
      evento.preventDefault();
      const formulario = evento.target;
      const botaoSalvar = horariosPbModal.querySelector(
        'button[type="submit"]'
      );
      botaoSalvar.disabled = true;

      const pacienteId = formulario.querySelector(
        "#paciente-id-horarios-modal"
      ).value;
      const atendimentoId = formulario.querySelector(
        "#atendimento-id-horarios-modal"
      ).value;

      const docRef = db.collection("trilhaPaciente").doc(pacienteId);
      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        alert("Erro: Paciente não encontrado!");
        botaoSalvar.disabled = false;
        return;
      }

      const dadosDoPaciente = docSnap.data();
      const atendimentos = dadosDoPaciente.atendimentosPB || [];
      const indiceDoAtendimento = atendimentos.findIndex(
        (at) => at.atendimentoId === atendimentoId
      );

      if (indiceDoAtendimento === -1) {
        alert("Erro: Atendimento não encontrado para este paciente!");
        botaoSalvar.disabled = false;
        return;
      }

      const iniciou = formulario.querySelector(
        'input[name="iniciou-pb"]:checked'
      )?.value;
      if (!iniciou) {
        alert("Por favor, selecione se o paciente iniciou o atendimento.");
        botaoSalvar.disabled = false;
        return;
      }

      if (iniciou === "nao") {
        atendimentos[indiceDoAtendimento].statusAtendimento = "encerrado";
        atendimentos[
          indiceDoAtendimento
        ].motivoDesistencia = `Não iniciou PB. Motivo: ${
          formulario.querySelector("#motivo-nao-inicio-pb").value
        }`;
      } else {
        atendimentos[indiceDoAtendimento].horarioSessao = {
          responsavelId: user.uid,
          responsavelNome: userData.nome,
          diaSemana: formulario.querySelector("#dia-semana-pb").value,
          horario: formulario.querySelector("#horario-pb").value,
          tipoAtendimento: formulario.querySelector(
            "#tipo-atendimento-pb-voluntario"
          ).value,
          alterarGrade: formulario.querySelector("#alterar-grade-pb").value,
          frequencia: formulario.querySelector("#frequencia-atendimento-pb")
            .value,
          salaAtendimento: formulario.querySelector("#sala-atendimento-pb")
            .value,
          dataInicio: formulario.querySelector("#data-inicio-sessoes").value,
          observacoes: formulario.querySelector("#observacoes-pb-horarios")
            .value,
        };
      }

      const dadosParaAtualizar = {
        atendimentosPB: atendimentos,
        status: "cadastrar_horario_psicomanager",
        lastUpdate: new Date(),
      };

      try {
        await docRef.update(dadosParaAtualizar);
        alert("Informações salvas com sucesso!");
        horariosPbModal.style.display = "none";
        carregarMeusPacientes();
      } catch (error) {
        console.error("Erro ao salvar horários:", error);
        alert("Erro ao salvar. Tente novamente.");
      } finally {
        botaoSalvar.disabled = false;
      }
    });

  async function abrirModalEncerramento(pacienteId, dadosDoPaciente) {
    const form = document.getElementById("encerramento-form");
    form.reset();
    document.getElementById("paciente-id-modal").value = pacienteId;
    const disponibilidadeEspecifica =
      dadosDoPaciente.disponibilidadeEspecifica || [];
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

    // --- INÍCIO DA CORREÇÃO ---
    // A lógica abaixo estava faltando

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
          addDisponibilidadeListeners(novaDisponibilidadeContainer); // Chama a função de suporte
        } catch (error) {
          console.error("Erro ao carregar HTML da disponibilidade:", error);
          novaDisponibilidadeContainer.innerHTML =
            '<p class="error-message">Erro ao carregar opções.</p>';
        }
      }
    };
    // Reseta o campo ao abrir o modal
    dispSelect.value = "";
    novaDisponibilidadeContainer.classList.add("hidden");
    novaDisponibilidadeContainer.innerHTML = "";

    // --- FIM DA CORREÇÃO ---

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

  document
    .getElementById("encerramento-form")
    .addEventListener("submit", async (evento) => {
      evento.preventDefault();
      const form = evento.target;
      const botaoSalvar = encerramentoModal.querySelector(
        'button[type="submit"]'
      );
      botaoSalvar.disabled = true;
      const pacienteId = document.getElementById("paciente-id-modal").value;
      const encaminhamentos = Array.from(
        form.querySelectorAll('input[name="encaminhamento"]:checked')
      ).map((cb) => cb.value);

      if (encaminhamentos.length === 0) {
        alert("Selecione ao menos uma opção de encaminhamento.");
        botaoSalvar.disabled = false;
        return;
      }

      let novoStatus = encaminhamentos.includes("Alta")
        ? "alta"
        : encaminhamentos.includes("Desistência")
        ? "desistencia"
        : "encaminhar_para_pb";

      let dadosParaAtualizar = {
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
          .update(dadosParaAtualizar);
        alert("Encerramento salvo com sucesso!");
        encerramentoModal.style.display = "none";
        carregarMeusPacientes();
      } catch (error) {
        console.error("Erro ao salvar encerramento:", error);
        alert("Erro ao salvar.");
      } finally {
        botaoSalvar.disabled = false;
      }
    });

  function abrirModalHorariosPb(pacienteId, atendimentoId) {
    const form = document.getElementById("horarios-pb-form");
    form.reset();
    form.querySelector("#paciente-id-horarios-modal").value = pacienteId;
    form.querySelector("#atendimento-id-horarios-modal").value = atendimentoId;

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
          .forEach((elemento) => {
            if (elemento.id !== "observacoes-pb-horarios") {
              elemento.required = mostrarFormulario;
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

  async function abrirModalDesfechoPb(
    pacienteId,
    atendimentoId,
    dadosDoPaciente
  ) {
    // Lógica para abrir o modal de desfecho
    // Esta função precisará ser adaptada para receber o atendimentoId e atualizar o atendimento correto
    // Por enquanto, ela mantém a estrutura original
    const modal = document.getElementById("desfecho-pb-modal");
    modal.querySelector("form").dataset.pacienteId = pacienteId;
    modal.querySelector("form").dataset.atendimentoId = atendimentoId; // Adiciona o ID do atendimento
    modal.style.display = "block";
  }

  async function handleDesfechoPbSubmit(evento) {
    evento.preventDefault();
    // A lógica de submit do desfecho precisa ser refatorada para atualizar
    // o atendimento específico dentro do array `atendimentosPB`, similar ao que foi feito
    // no formulário de horários.
    alert(
      "A lógica de salvar o desfecho precisa ser adaptada para a nova estrutura."
    );
  }

  async function gerarPdfContrato(pacienteData, meuAtendimento) {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const margin = 15;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const usableWidth = pageWidth - margin * 2;
      let cursorY = 15;

      const loadImageAsBase64 = async (url) => {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      };

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(
        "CONTRATO DE PRESTAÇÃO DE SERVIÇOS TERAPÊUTICOS",
        pageWidth / 2,
        cursorY + 15,
        { align: "center" }
      );
      cursorY += 35;

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

      const response = await fetch("../../../public/contrato-terapeutico.html");
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

      const horarioInfo = meuAtendimento?.horarioSessao || {};
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
        ["Terapeuta:", meuAtendimento?.profissionalNome || "A definir"],
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
        cursorY = pageHeight - 35;
        addTextSection("Contrato Assinado", {
          size: 12,
          style: "bold",
          spaceAfter: 4,
        });
        addTextSection(textoAssinatura, { size: 10, spaceAfter: 0 });
      }

      const logoUrl = "../../../assets/img/logo-eupsico.png";
      const logoBase64 = await loadImageAsBase64(logoUrl);
      if (logoBase64) {
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          doc.setGState(
            new doc.GState({ opacity: 0.1, "stroke-opacity": 0.1 })
          );
          const imgWidth = 90;
          const x = (pageWidth - imgWidth) / 2;
          const y = (pageHeight - imgWidth) / 2;
          doc.addImage(
            logoBase64,
            "PNG",
            x,
            y,
            imgWidth,
            imgWidth,
            undefined,
            "FAST"
          );
          doc.setGState(new doc.GState({ opacity: 1, "stroke-opacity": 1 }));
        }
      }
      doc.save(`Contrato_${pacienteData.nomeCompleto.replace(/ /g, "_")}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Não foi possível gerar o PDF.");
    }
  } // Inicia o carregamento dos pacientes

  carregarMeusPacientes();
}
