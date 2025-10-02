// Arquivo: /modulos/voluntario/js/meus-pacientes.js
// Versão: 3.8 (Corrige lógica de checkboxes e implementa alteração de disponibilidade)

export function init(db, user, userData) {
  const container = document.getElementById("meus-pacientes-container");
  if (!container) return;

  const encerramentoModal = document.getElementById("encerramento-modal");
  const horariosPbModal = document.getElementById("horarios-pb-modal");

  // Configura botões de fechar e cancelar dos modais
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

  // Fecha o modal ao clicar fora dele
  window.addEventListener("click", (event) => {
    if (event.target == encerramentoModal)
      encerramentoModal.style.display = "none";
    if (event.target == horariosPbModal) horariosPbModal.style.display = "none";
  });

  // SUBSTITUA A FUNÇÃO 'carregarMeusPacientes' INTEIRA POR ESTA VERSÃO CORRIGIDA

  async function carregarMeusPacientes(userId) {
    const container = document.getElementById("pacientes-cards-container");
    const loading = document.getElementById("loading-pacientes");
    const emptyState = document.getElementById("empty-state-pacientes");

    if (!container || !loading || !emptyState) return;

    loading.style.display = "block";
    container.innerHTML = "";
    emptyState.style.display = "none";

    try {
      // Consulta única e otimizada que busca pacientes de Plantão OU de PB
      // que estão associados ao ID do profissional logado.
      const query = db
        .collection("trilhaPaciente")
        .where("profissionalAtualId", "==", userId);

      const snapshot = await query.get();

      if (snapshot.empty) {
        emptyState.style.display = "block";
        loading.style.display = "none";
        return;
      }

      const pacientes = [];
      snapshot.forEach((doc) => {
        pacientes.push({ id: doc.id, ...doc.data() });
      });

      // Ordena os pacientes por nome
      pacientes.sort((a, b) =>
        (a.nomeCompleto || "").localeCompare(b.nomeCompleto || "")
      );

      container.innerHTML = ""; // Limpa o container antes de adicionar os novos cards
      pacientes.forEach((data) => {
        // Determina o tipo de card (plantao ou pb) com base no status do paciente
        const tipo =
          data.status === "em_atendimento_plantao" ? "plantao" : "pb";
        const card = criarCardPaciente(data.id, data, tipo);
        container.appendChild(card);
      });
    } catch (error) {
      console.error("Erro ao carregar seus pacientes:", error);
      emptyState.style.display = "block";
      emptyState.innerHTML =
        "<p>Ocorreu um erro ao carregar os pacientes. Tente novamente mais tarde.</p>";
    } finally {
      loading.style.display = "none";
    }
  }

  function criarCardPaciente(id, data, tipo) {
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

  async function abrirModalEncerramento(pacienteId, data) {
    const form = document.getElementById("encerramento-form");
    form.reset();
    document.getElementById("paciente-id-modal").value = pacienteId;
    // --- CORREÇÃO DA EXIBIÇÃO DE DISPONIBILIDADE ---
    const disponibilidadeEspecifica = data.disponibilidadeEspecifica || [];
    const textoDisponibilidade =
      disponibilidadeEspecifica.length > 0
        ? disponibilidadeEspecifica
            .map((item) => {
              // Formata "manha-semana_8:00" para "Manhã (Semana) 8:00"
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

    // --- LÓGICA CORRIGIDA DOS CHECKBOXES ---
    const encaminhamentoCheckboxes = form.querySelectorAll(
      'input[name="encaminhamento"]'
    );
    const altaCheckbox = form.querySelector('input[value="Alta"]');
    const desistenciaCheckbox = form.querySelector(
      'input[value="Desistência"]'
    );

    // Função para reabilitar todos os checkboxes (exceto os permanentemente desabilitados)
    const reabilitarTodos = () => {
      encaminhamentoCheckboxes.forEach((cb) => {
        // A classe 'disabled' no HTML indica um campo que nunca deve ser habilitado
        if (!cb.closest("label").classList.contains("disabled")) {
          cb.disabled = false;
          cb.parentElement.classList.remove("disabled-temp"); // Usamos uma classe temporária
        }
      });
    };

    encaminhamentoCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const altaChecked = altaCheckbox.checked;
        const desistenciaChecked = desistenciaCheckbox.checked;

        // 1. Sempre reabilita todos os campos no início de cada mudança
        reabilitarTodos();

        // 2. Se 'Alta' estiver marcada, desabilita os outros
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
        }
        // 3. Se 'Desistência' estiver marcada, desabilita os outros
        else if (desistenciaChecked) {
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

    // Adicione este CSS para estilizar os campos desabilitados temporariamente
    const style = document.createElement("style");
    style.textContent = `
    .checkbox-group label.disabled-temp {
        color: #999;
        cursor: not-allowed;
        text-decoration: line-through;
    }
`;
    document.head.appendChild(style);

    // --- LÓGICA DA DISPONIBILIDADE ---
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
    // Reseta o campo ao abrir o modal
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

    // Limpa o container do formulário para garantir que não haja duplicatas
    continuacaoContainer.innerHTML = "";

    iniciouRadio.forEach((radio) => {
      radio.onchange = () => {
        const mostrarFormulario = radio.value === "sim" && radio.checked;
        const mostrarMotivo = radio.value === "nao" && radio.checked;

        motivoContainer.classList.toggle("hidden", !mostrarMotivo);
        continuacaoContainer.classList.toggle("hidden", !mostrarFormulario);

        document.getElementById("motivo-nao-inicio-pb").required =
          mostrarMotivo;

        // Se o formulário de continuação deve ser mostrado, o construímos
        if (mostrarFormulario && continuacaoContainer.innerHTML === "") {
          continuacaoContainer.innerHTML = construirFormularioHorarios(
            userData.nome
          );
        }

        // Torna os campos do formulário de continuação obrigatórios ou não
        continuacaoContainer
          .querySelectorAll("select, input, textarea")
          .forEach((el) => {
            // O campo de observações nunca é obrigatório
            if (el.id !== "observacoes-pb-horarios") {
              el.required = mostrarFormulario;
            }
          });
      };
    });

    horariosPbModal.style.display = "block";
  }

  // ADICIONE ESTA NOVA FUNÇÃO ABAIXO DA FUNÇÃO 'abrirModalHorariosPb'

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
          status: "cadastrar_horario_psicomanager", // Avança para a próxima etapa
          "pbInfo.horarioSessao": {
            responsavelId: user.uid,
            responsavelNome: userData.nome,
            diaSemana: form.querySelector("#dia-semana-pb").value,
            horario: form.querySelector("#horario-pb").value,
            tipoAtendimento: form.querySelector(
              "#tipo-atendimento-pb-voluntario"
            ).value,
            alterarGrade: form.querySelector("#alterar-grade-pb").value,
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
        alert("Informações de horário salvas com sucesso!");
        horariosPbModal.style.display = "none";
        carregarMeusPacientes();
      } catch (error) {
        console.error("Erro ao salvar horários:", error);
        alert("Erro ao salvar. Tente novamente.");
      } finally {
        saveButton.disabled = false;
      }
    });

  carregarMeusPacientes();
}
