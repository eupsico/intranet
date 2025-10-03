// Arquivo: /modulos/voluntario/js/meus-pacientes.js
// Versão: 4.0 (Adiciona busca por 'em_atendimento_pb' e funcionalidade 'Enviar Contrato')

export function init(db, user, userData) {
  console.log(
    "%c[ANÁLISE] Etapa 1: Módulo 'meus-pacientes.js' iniciado.",
    "color: blue; font-weight: bold;"
  );

  const container = document.getElementById("pacientes-cards-container");
  if (!container) {
    console.error(
      "[ANÁLISE ERRO] Container '#pacientes-cards-container' não encontrado."
    );
    return;
  }

  const encerramentoModal = document.getElementById("encerramento-modal");
  const horariosPbModal = document.getElementById("horarios-pb-modal");

  // --- Funções de controle de modais ---
  const allModals = [encerramentoModal, horariosPbModal];
  document
    .querySelectorAll(".modal .close-button, [data-close-modal]")
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
  // --- Fim do controle de modais ---

  async function carregarMeusPacientes() {
    container.innerHTML = '<div class="loading-spinner"></div>';
    console.log(
      "%c[ANÁLISE] Etapa 2: Iniciando busca de pacientes...",
      "color: blue; font-weight: bold;"
    );

    try {
      // Unifica as buscas para maior clareza e abrangência
      const statusDeInteresse = [
        "em_atendimento_plantao",
        "encaminhar_para_pb",
        "aguardando_info_horarios",
        "cadastrar_horario_psicomanager",
        "em_atendimento_pb", // <-- NOVO STATUS ADICIONADO PARA O CONTRATO
      ];

      console.log(
        `[ANÁLISE] Buscando pacientes com status em: [${statusDeInteresse.join(
          ", "
        )}]`
      );

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
          // Adiciona apenas se o status for um dos que queremos ver e não for duplicado
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

      console.log(
        `[ANÁLISE] Encontrados ${todosPacientes.length} pacientes únicos.`
      );

      if (todosPacientes.length === 0) {
        container.innerHTML =
          "<p>Você não tem pacientes designados nos estágios de atendimento ativo no momento.</p>";
        return;
      }

      todosPacientes.sort((a, b) =>
        a.nomeCompleto.localeCompare(b.nomeCompleto)
      );
      container.innerHTML = todosPacientes
        .map((paciente) => criarCardPaciente(paciente.id, paciente))
        .join("");

      adicionarEventListeners(todosPacientes);
    } catch (error) {
      console.error("[ANÁLISE ERRO] Falha crítica ao buscar pacientes.", error);
      container.innerHTML =
        '<p class="error-message">Ocorreu um erro ao carregar seus pacientes.</p>';
    }
  }

  function criarCardPaciente(id, data) {
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
      }, // <-- NOVA AÇÃO
    };

    const info = statusMap[data.status] || {
      label: data.status.replace(/_/g, " "),
      acao: "Ver Prontuário",
      tipo: "info",
      ativo: false,
    };

    // Mostra a data de encaminhamento do plantão ou da PB
    const infoContato = data.pbInfo?.dataEncaminhamento
      ? data.pbInfo
      : data.plantaoInfo;
    const dataEncaminhamento = infoContato?.dataEncaminhamento
      ? new Date(
          infoContato.dataEncaminhamento + "T03:00:00"
        ).toLocaleDateString("pt-BR")
      : "N/A";

    return `
            <div class="paciente-card" data-id="${id}" data-tipo="${info.tipo}">
                <h4>${data.nomeCompleto}</h4>
                <p><strong>Status:</strong> ${info.label}</p>
                <p><strong>Telefone:</strong> ${data.telefoneCelular}</p>
                <p><strong>Data Encaminhamento:</strong> ${dataEncaminhamento}</p>
                <button class="action-button" data-id="${id}" data-tipo="${
      info.tipo
    }" ${!info.ativo ? "disabled" : ""}>
                    ${info.acao}
                </button>
            </div>
        `;
  }

  function adicionarEventListeners() {
    console.log(
      "%c[ANÁLISE] Etapa 5: Adicionando interatividade.",
      "color: blue; font-weight: bold;"
    );

    container.addEventListener("click", async (event) => {
      const button = event.target.closest(".action-button:not([disabled])");
      if (!button) return;

      const pacienteId = button.dataset.id;
      const tipo = button.dataset.tipo;

      console.log(
        `[ANÁLISE] Botão de ação clicado para o paciente ID: ${pacienteId} (Tipo: ${tipo})`
      );

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
            handleEnviarContrato(pacienteId);
            break;
        }
      } catch (error) {
        console.error("Erro ao processar ação do card:", error);
        alert("Ocorreu um erro ao buscar os dados do paciente.");
      }
    });
  }

  function handleEnviarContrato(pacienteId) {
    // Constrói a URL completa para a página do contrato
    const contractUrl = `${window.location.origin}/public/contrato-terapeutico.html?id=${pacienteId}`;

    // Tenta copiar para a área de transferência
    navigator.clipboard
      .writeText(contractUrl)
      .then(() => {
        alert(
          `Link do contrato copiado para a área de transferência!\n\nEnvie este link para o paciente:\n${contractUrl}`
        );
      })
      .catch((err) => {
        console.error("Falha ao copiar o link: ", err);
        // Se a cópia falhar, exibe o link em um prompt para cópia manual
        window.prompt(
          "Não foi possível copiar o link automaticamente. Copie manualmente:",
          contractUrl
        );
      });
  }

  // (O restante do código, com as funções de modal, permanece exatamente o mesmo)
  // ... (abrirModalEncerramento, abrirModalHorariosPb, etc.)

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

    return `
        <div class="form-group">
            <label for="nome-profissional-pb">Nome Profissional:</label>
            <input type="text" id="nome-profissional-pb" class="form-control" value="${nomeProfissional}" readonly>
        </div>
        <div class="form-group">
            <label for="dia-semana-pb">Informe o dia da semana que você irá atender o paciente:</label>
            <select id="dia-semana-pb" class="form-control" required>
                <option value="">Selecione...</option>
                <option value="Segunda-feira">Segunda-feira</option>
                <option value="Terça-feira">Terça-feira</option>
                <option value="Quarta-feira">Quarta-feira</option>
                <option value="Quinta-feira">Quinta-feira</option>
                <option value="Sexta-feira">Sexta-feira</option>
                <option value="Sábado">Sábado</option>
            </select>
        </div>
        <div class="form-group">
            <label for="horario-pb">Selecione o horário da sessão:</label>
            <select id="horario-pb" class="form-control" required>
                <option value="">Selecione...</option>
                ${horasOptions}
            </select>
        </div>
        <div class="form-group">
            <label for="tipo-atendimento-pb-voluntario">Informe o tipo de atendimento:</label>
            <select id="tipo-atendimento-pb-voluntario" class="form-control" required>
                <option value="">Selecione...</option>
                <option value="Presencial">Presencial</option>
                <option value="Online">Online</option>
            </select>
        </div>
        <div class="form-group">
            <label for="alterar-grade-pb">Será preciso alterar ou incluir o novo horário na grade?</label>
            <select id="alterar-grade-pb" class="form-control" required>
                <option value="">Selecione...</option>
                <option value="Sim">Sim</option>
                <option value="Não">Não</option>
            </select>
        </div>
        <div class="form-group">
            <label for="frequencia-atendimento-pb">O atendimento será realizado:</label>
            <select id="frequencia-atendimento-pb" class="form-control" required>
                <option value="">Selecione...</option>
                <option value="Semanal">Semanal</option>
                <option value="Quinzenal">Quinzenal</option>
                <option value="Mensal">Mensal</option>
            </select>
        </div>
        <div class="form-group">
            <label for="sala-atendimento-pb">Selecione abaixo a sala que você atende no dia e horário informado:<br><small>Para atendimentos online selecione a opção Online.</small></label>
            <select id="sala-atendimento-pb" class="form-control" required>
                <option value="">Selecione...</option>
                ${salasOptions}
            </select>
        </div>
        <div class="form-group">
            <label for="data-inicio-sessoes">Informe a partir de qual data devem ser criadas as novas sessões:</label>
            <input type="date" id="data-inicio-sessoes" class="form-control" required>
        </div>
         <div class="form-group">
            <label for="observacoes-pb-horarios">Observações:</label>
            <textarea id="observacoes-pb-horarios" rows="3" class="form-control"></textarea>
        </div>
    `;
  }

  document
    .getElementById("encerramento-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      const saveButton = document.getElementById("modal-save-btn");
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

      let novoStatus = "encaminhar_para_pb";
      if (encaminhamentosSelecionados.includes("Alta")) {
        novoStatus = "alta";
      } else if (encaminhamentosSelecionados.includes("Desistência")) {
        novoStatus = "desistencia";
      }

      let updateData = {
        status: novoStatus,
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

      if (form.querySelector("#manter-disponibilidade").value === "nao") {
        const novaDisponibilidadeContainer = form.querySelector(
          "#nova-disponibilidade-container"
        );
        updateData.disponibilidadeGeral = Array.from(
          novaDisponibilidadeContainer.querySelectorAll(
            'input[name="horario"]:checked'
          )
        ).map((cb) => cb.parentElement.textContent.trim());
        updateData.disponibilidadeEspecifica = Array.from(
          novaDisponibilidadeContainer.querySelectorAll(
            'input[name="horario-especifico"]:checked'
          )
        ).map((cb) => cb.value);
      }

      try {
        await db
          .collection("trilhaPaciente")
          .doc(pacienteId)
          .update(updateData);
        alert(
          "Encerramento salvo com sucesso! O status do paciente foi atualizado."
        );
        encerramentoModal.style.display = "none";
        carregarMeusPacientes();
      } catch (error) {
        console.error("Erro ao salvar encerramento:", error);
        alert("Erro ao salvar. Tente novamente.");
      } finally {
        saveButton.disabled = false;
      }
    });

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
      } finally {
        saveButton.disabled = false;
      }
    }); // Ponto de partida da execução da lógica da página

  carregarMeusPacientes();
}
