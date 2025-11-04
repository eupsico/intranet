// Arquivo: /assets/js/agendamento-publico.js
// Versão: 9.1 (Com logs detalhados para debug)
// Migração completa para a sintaxe modular do Firebase v9 + Sistema de Logging

// 1. Importa as funções necessárias do nosso arquivo de configuração central
import { functions, httpsCallable } from "./firebase-init.js";

// Sistema de Logging personalizado
const Logger = {
  log: (label, message, data = null) => {
    const timestamp = new Date().toLocaleTimeString("pt-BR");
    const style = "color: #0066cc; font-weight: bold;";
    console.log(`%c[${timestamp}] ${label}`, style, message);
    if (data) console.log("Dados:", data);
  },
  success: (label, message, data = null) => {
    const timestamp = new Date().toLocaleTimeString("pt-BR");
    const style = "color: #4CAF50; font-weight: bold;";
    console.log(`%c[${timestamp}] ✅ ${label}`, style, message);
    if (data) console.log("Dados:", data);
  },
  error: (label, message, data = null) => {
    const timestamp = new Date().toLocaleTimeString("pt-BR");
    const style = "color: #D32F2F; font-weight: bold;";
    console.error(`%c[${timestamp}] ❌ ${label}`, style, message);
    if (data) console.error("Dados:", data);
  },
  warning: (label, message, data = null) => {
    const timestamp = new Date().toLocaleTimeString("pt-BR");
    const style = "color: #FF9800; font-weight: bold;";
    console.warn(`%c[${timestamp}] ⚠️ ${label}`, style, message);
    if (data) console.log("Dados:", data);
  },
  info: (label, message, data = null) => {
    const timestamp = new Date().toLocaleTimeString("pt-BR");
    const style = "color: #2196F3; font-weight: bold;";
    console.log(`%c[${timestamp}] ℹ️ ${label}`, style, message);
    if (data) console.log("Dados:", data);
  },
};

document.addEventListener("DOMContentLoaded", () => {
  Logger.log("INICIALIZAÇÃO", "Página de Agendamento Público carregada");

  const horariosContainer = document.getElementById("horarios-container");
  const agendamentoSection = document.getElementById("agendamento-section");
  const confirmacaoSection = document.getElementById("confirmacao-section");

  const modal = document.getElementById("agendamento-modal");
  const cpfInput = document.getElementById("paciente-cpf");
  const nomeInput = document.getElementById("paciente-nome");
  const telefoneInput = document.getElementById("paciente-telefone");
  const cpfFeedback = document.getElementById("cpf-feedback");

  let horarioSelecionado = null;
  let pacienteExistenteId = null;

  Logger.log("ELEMENTOS DOM", "Elementos do formulário carregados");
  Logger.info("STATE", "Estado inicial:", {
    horarioSelecionado,
    pacienteExistenteId,
  });

  // ========================================
  // VALIDAÇÃO DE CPF
  // ========================================
  function validarCPF(cpf) {
    Logger.log("VALIDAÇÃO CPF", "Iniciando validação");
    Logger.info("VALIDAÇÃO CPF", "CPF recebido (bruto):", { cpf });

    cpf = cpf.replace(/[^\d]+/g, "");
    Logger.info("VALIDAÇÃO CPF", "CPF após limpeza:", {
      cpf,
      tamanho: cpf.length,
    });

    // Aceita CPF temporário começando com 99
    if (cpf.startsWith("99")) {
      Logger.success(
        "VALIDAÇÃO CPF",
        "CPF temporário detectado (começa com 99)"
      );
      return true;
    }

    // Valida comprimento e sequência
    if (cpf === "" || cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) {
      Logger.error(
        "VALIDAÇÃO CPF",
        "CPF inválido - falhou nas verificações básicas",
        {
          vazio: cpf === "",
          tamanhoErrado: cpf.length !== 11,
          todosIguais: /^(\d)\1+$/.test(cpf),
        }
      );
      return false;
    }

    // Valida primeiro dígito verificador
    let add = 0;
    for (let i = 0; i < 9; i++) {
      add += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;

    Logger.info("VALIDAÇÃO CPF", "Verificação do 1º dígito:", {
      calcado: rev,
      informado: parseInt(cpf.charAt(9)),
      match: rev === parseInt(cpf.charAt(9)),
    });

    if (rev !== parseInt(cpf.charAt(9))) {
      Logger.error("VALIDAÇÃO CPF", "Falha no 1º dígito verificador");
      return false;
    }

    // Valida segundo dígito verificador
    add = 0;
    for (let i = 0; i < 10; i++) {
      add += parseInt(cpf.charAt(i)) * (11 - i);
    }
    rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;

    Logger.info("VALIDAÇÃO CPF", "Verificação do 2º dígito:", {
      calcado: rev,
      informado: parseInt(cpf.charAt(10)),
      match: rev === parseInt(cpf.charAt(10)),
    });

    if (rev !== parseInt(cpf.charAt(10))) {
      Logger.error("VALIDAÇÃO CPF", "Falha no 2º dígito verificador");
      return false;
    }

    Logger.success("VALIDAÇÃO CPF", "CPF válido!");
    return true;
  }

  // ========================================
  // CARREGAR HORÁRIOS
  // ========================================
  async function carregarHorarios() {
    Logger.log("HORÁRIOS", "Iniciando carregamento de horários disponíveis");

    try {
      Logger.info("HORÁRIOS", "Chamando Cloud Function: getHorariosPublicos");

      // Usa a sintaxe v9 para chamar a Cloud Function
      const getHorarios = httpsCallable(functions, "getHorariosPublicos");
      const result = await getHorarios();

      Logger.success("HORÁRIOS", "Cloud Function respondeu com sucesso");
      Logger.info("HORÁRIOS", "Resposta completa:", result.data);

      const horarios = result.data.horarios;
      Logger.info(
        "HORÁRIOS",
        `Total de horários recebidos: ${horarios ? horarios.length : 0}`
      );

      if (!horarios || horarios.length === 0) {
        Logger.warning("HORÁRIOS", "Nenhum horário disponível");
        horariosContainer.innerHTML =
          "<p>Não há horários disponíveis no momento. Por favor, tente novamente mais tarde.</p>";
        return;
      }

      Logger.success(
        "HORÁRIOS",
        `${horarios.length} horário(s) carregado(s) com sucesso`
      );
      renderizarHorarios(horarios);
    } catch (error) {
      Logger.error("HORÁRIOS", "Erro ao carregar horários", {
        mensagem: error.message,
        codigo: error.code,
        stack: error.stack,
      });
      horariosContainer.innerHTML = `<p style="color: red;"><strong>Erro ao carregar horários:</strong> ${error.message}</p><p>Tente recarregar a página.</p>`;
    }
  }

  // ========================================
  // RENDERIZAR HORÁRIOS
  // ========================================
  function renderizarHorarios(horarios) {
    Logger.log("RENDERIZAÇÃO", "Iniciando renderização de horários");
    Logger.info("RENDERIZAÇÃO", `Processando ${horarios.length} horário(s)`);

    const horariosAgrupados = horarios.reduce((acc, horario) => {
      const modalidade = horario.modalidade || "Online";
      const dataFormatada = new Date(
        horario.data + "T03:00:00"
      ).toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      });

      Logger.info(
        "RENDERIZAÇÃO",
        `Agrupando horário - ${modalidade} - ${dataFormatada} - ${horario.hora}`
      );

      if (!acc[modalidade]) acc[modalidade] = {};
      if (!acc[modalidade][dataFormatada]) acc[modalidade][dataFormatada] = [];

      acc[modalidade][dataFormatada].push(horario);
      return acc;
    }, {});

    Logger.success("RENDERIZAÇÃO", "Horários agrupados", horariosAgrupados);

    let html = "";
    for (const modalidade in horariosAgrupados) {
      html += `<h3 class="modalidade-titulo">${modalidade}</h3>`;
      for (const data in horariosAgrupados[modalidade]) {
        html += `<div class="data-grupo"><h4>${data}</h4><div class="horarios-botoes">`;
        horariosAgrupados[modalidade][data].forEach((horario) => {
          const horarioCompleto = {
            id: horario.id,
            data: horario.data,
            hora: horario.hora,
            modalidade: horario.modalidade,
            unidade: horario.unidade,
            assistenteId: horario.assistenteId,
            assistenteNome: horario.assistenteNome,
          };
          const horarioDataString = JSON.stringify(horarioCompleto);
          html += `<button type="button" class="horario-btn" data-horario='${horarioDataString}'>${horario.hora}</button>`;
        });
        html += `</div></div>`;
      }
    }
    horariosContainer.innerHTML = html;

    Logger.log("RENDERIZAÇÃO", "HTML inserido no DOM");

    horariosContainer.querySelectorAll(".horario-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const horarioParsed = JSON.parse(btn.dataset.horario);
        Logger.log("CLIQUE HORÁRIO", "Botão de horário clicado", horarioParsed);
        abrirModalConfirmacao(horarioParsed);
      });
    });

    Logger.success(
      "RENDERIZAÇÃO",
      "Event listeners adicionados aos botões de horário"
    );
  }

  // ========================================
  // ABRIR MODAL DE CONFIRMAÇÃO
  // ========================================
  function abrirModalConfirmacao(horario) {
    Logger.log("MODAL", "Abrindo modal de confirmação");
    Logger.info("MODAL", "Horário selecionado:", horario);

    horarioSelecionado = horario;
    pacienteExistenteId = null;

    cpfInput.value = "";
    nomeInput.value = "";
    telefoneInput.value = "";
    cpfFeedback.textContent = "";
    cpfFeedback.className = "";
    nomeInput.disabled = true;
    telefoneInput.disabled = true;

    Logger.info("MODAL", "Campos do formulário resetados e desabilitados");
    Logger.info("STATE", "Estado atualizado:", {
      horarioSelecionado,
      pacienteExistenteId,
    });

    document.getElementById("modal-horario-selecionado").textContent =
      horario.hora;
    modal.style.display = "flex";

    Logger.success("MODAL", "Modal exibido para o usuário");
  }

  // ========================================
  // BUSCAR PACIENTE POR CPF
  // ========================================
  async function buscarPacientePorCPF() {
    Logger.log("BUSCA CPF", "═══ INICIANDO BUSCA DE PACIENTE ═══");
    Logger.info("BUSCA CPF", "Valor bruto do input:", {
      valor: cpfInput.value,
    });

    const cpf = cpfInput.value.replace(/\D/g, "");
    Logger.info("BUSCA CPF", "CPF após limpeza (apenas dígitos):", {
      cpf,
      tamanho: cpf.length,
    });

    cpfFeedback.textContent = "Verificando...";
    cpfFeedback.className = "";
    Logger.info("BUSCA CPF", 'Feedback atualizado para "Verificando..."');

    // ┌─────────────────────────────────────┐
    // │ VALIDAÇÃO LOCAL DO CPF              │
    // └─────────────────────────────────────┘
    if (!validarCPF(cpf)) {
      Logger.error("BUSCA CPF", "CPF não passou na validação local");
      cpfFeedback.textContent = "CPF inválido.";
      cpfFeedback.className = "error";
      Logger.info("BUSCA CPF", 'Feedback atualizado para "CPF inválido"');
      return;
    }

    Logger.success("BUSCA CPF", "CPF passou na validação local ✓");

    try {
      // ┌─────────────────────────────────────┐
      // │ CHAMADA À CLOUD FUNCTION            │
      // └─────────────────────────────────────┘
      Logger.log("BUSCA CPF", "Chamando Cloud Function: verificarCpfExistente");
      Logger.info("BUSCA CPF", "Payload enviado:", { cpf });

      const verificarCpfExistente = httpsCallable(
        functions,
        "verificarCpfExistente"
      );

      const result = await verificarCpfExistente({ cpf: cpf });

      Logger.success("BUSCA CPF", "Cloud Function respondeu com sucesso");
      Logger.info(
        "BUSCA CPF",
        "Resposta completa da Cloud Function:",
        result.data
      );

      const data = result.data;

      // ┌─────────────────────────────────────┐
      // │ PROCESSAMENTO DA RESPOSTA           │
      // └─────────────────────────────────────┘
      if (data.exists) {
        Logger.success("BUSCA CPF", "✅ PACIENTE ENCONTRADO NO BANCO DE DADOS");
        Logger.info("BUSCA CPF", "Dados do paciente:", {
          docId: data.docId,
          nomeCompleto: data.dados.nomeCompleto,
          telefoneCelular: data.dados.telefoneCelular,
        });

        nomeInput.value = data.dados.nomeCompleto;
        telefoneInput.value = data.dados.telefoneCelular;
        cpfFeedback.textContent = "Paciente encontrado.";
        cpfFeedback.className = "success";
        pacienteExistenteId = data.docId;

        Logger.info(
          "BUSCA CPF",
          "Campos do formulário preenchidos automaticamente"
        );
        Logger.info("STATE", "Estado atualizado:", {
          pacienteExistenteId,
          nomeInput: nomeInput.value,
          telefoneInput: telefoneInput.value,
        });
      } else {
        Logger.warning("BUSCA CPF", "❌ CPF NÃO ENCONTRADO NO BANCO DE DADOS");
        Logger.info("BUSCA CPF", "Possíveis motivos:");
        Logger.info(
          "BUSCA CPF",
          "  1. CPF pode estar com formatação diferente no banco"
        );
        Logger.info("BUSCA CPF", "  2. Paciente ainda não foi cadastrado");
        Logger.info(
          "BUSCA CPF",
          "  3. Dados da ficha de inscrição não foram salvos corretamente"
        );

        cpfFeedback.textContent =
          "CPF não encontrado. Preencha os dados para novo cadastro.";
        cpfFeedback.className = "warning";
        nomeInput.disabled = false;
        telefoneInput.disabled = false;
        pacienteExistenteId = null;

        Logger.info(
          "BUSCA CPF",
          "Campos do formulário habilitados para novo cadastro"
        );
        Logger.info("STATE", "Estado atualizado para novo cadastro:", {
          pacienteExistenteId,
          nomeInputDisabled: nomeInput.disabled,
          telefoneInputDisabled: telefoneInput.disabled,
        });
      }
    } catch (error) {
      Logger.error("BUSCA CPF", "ERRO NA CHAMADA À CLOUD FUNCTION", {
        mensagem: error.message,
        codigo: error.code,
        stack: error.stack,
      });
      cpfFeedback.textContent = "Erro ao buscar. Tente novamente.";
      cpfFeedback.className = "error";
      Logger.info("BUSCA CPF", 'Feedback atualizado para "Erro ao buscar"');
    }

    Logger.log("BUSCA CPF", "═══ FIM DA BUSCA DE PACIENTE ═══\n");
  }

  // ========================================
  // HANDLE AGENDAMENTO
  // ========================================
  async function handleAgendamento() {
    Logger.log("AGENDAMENTO", "═══ INICIANDO PROCESSO DE AGENDAMENTO ═══");

    const agendamentoButton = document.getElementById(
      "modal-confirm-agendamento-btn"
    );
    agendamentoButton.disabled = true;
    agendamentoButton.textContent = "Agendando...";

    Logger.info("AGENDAMENTO", "Botão desabilitado e texto alterado");

    try {
      const cpf = cpfInput.value.replace(/\D/g, "");
      const nome = nomeInput.value.trim();
      const telefone = telefoneInput.value.trim();

      Logger.info("AGENDAMENTO", "Dados coletados do formulário:", {
        cpf,
        nome,
        telefone,
        pacienteExistenteId,
      });

      // ┌─────────────────────────────────────┐
      // │ VALIDAÇÕES PRÉ-AGENDAMENTO         │
      // └─────────────────────────────────────┘
      Logger.log("AGENDAMENTO", "Executando validações pré-agendamento...");

      const validacoes = {
        cpfValido: validarCPF(cpf),
        nomePreenchido: !!nome,
        telefonePreenchido: !!telefone,
        horarioCompleto: !!horarioSelecionado?.assistenteId,
      };

      Logger.info("AGENDAMENTO", "Resultado das validações:", validacoes);

      if (!validacoes.cpfValido) {
        Logger.error("AGENDAMENTO", "Validação falhou: CPF inválido");
        throw new Error("CPF inválido. Por favor, verifique.");
      }
      if (!validacoes.nomePreenchido) {
        Logger.error("AGENDAMENTO", "Validação falhou: Nome não preenchido");
        throw new Error("Nome do paciente é obrigatório.");
      }
      if (!validacoes.telefonePreenchido) {
        Logger.error(
          "AGENDAMENTO",
          "Validação falhou: Telefone não preenchido"
        );
        throw new Error("Telefone de contato é obrigatório.");
      }
      if (!validacoes.horarioCompleto) {
        Logger.error(
          "AGENDAMENTO",
          "Validação falhou: Dados do horário incompletos"
        );
        throw new Error(
          "Erro: dados do horário incompletos. Selecione novamente."
        );
      }

      Logger.success("AGENDAMENTO", "Todas as validações passaram ✓");

      const payload = {
        cpf: cpf,
        assistenteSocialId: horarioSelecionado.assistenteId,
        assistenteSocialNome: horarioSelecionado.assistenteNome,
        data: horarioSelecionado.data,
        hora: horarioSelecionado.hora,
        nomeCompleto: nome,
        telefone: telefone,
      };

      Logger.log(
        "AGENDAMENTO",
        "Chamando Cloud Function: agendarTriagemPublico"
      );
      Logger.info("AGENDAMENTO", "Payload completo:", payload);

      // ┌─────────────────────────────────────┐
      // │ CHAMADA À CLOUD FUNCTION            │
      // └─────────────────────────────────────┘
      const agendarTriagem = httpsCallable(functions, "agendarTriagemPublico");
      const result = await agendarTriagem(payload);

      Logger.success("AGENDAMENTO", "Cloud Function respondeu com sucesso");
      Logger.info("AGENDAMENTO", "Resposta da Cloud Function:", result.data);

      if (result.data.success) {
        Logger.success("AGENDAMENTO", "✅ AGENDAMENTO REALIZADO COM SUCESSO!");
        Logger.info("AGENDAMENTO", "Exibindo tela de confirmação final");
        exibirConfirmacaoFinal(nome);
      } else {
        Logger.error("AGENDAMENTO", "Cloud Function retornou success=false");
        throw new Error(
          result.data.message || "Erro desconhecido retornado pela função."
        );
      }
    } catch (error) {
      Logger.error("AGENDAMENTO", "ERRO NO PROCESSO DE AGENDAMENTO", {
        mensagem: error.message,
        stack: error.stack,
      });
      alert(`Falha no agendamento: ${error.message}`);
    } finally {
      agendamentoButton.disabled = false;
      agendamentoButton.textContent = "Confirmar Agendamento";
      Logger.info("AGENDAMENTO", "Botão reabilitado");
      Logger.log("AGENDAMENTO", "═══ FIM DO PROCESSO DE AGENDAMENTO ═══\n");
    }
  }

  // ========================================
  // EXIBIR CONFIRMAÇÃO FINAL
  // ========================================
  function exibirConfirmacaoFinal(nomePaciente) {
    Logger.log("CONFIRMAÇÃO", "Exibindo tela de confirmação final");

    modal.style.display = "none";

    Logger.info("CONFIRMAÇÃO", "Dados da confirmação:", {
      nomePaciente,
      assistente: horarioSelecionado.assistenteNome,
      data: horarioSelecionado.data,
      hora: horarioSelecionado.hora,
    });

    document.getElementById("confirm-paciente-nome").textContent = nomePaciente;
    document.getElementById("confirm-assistente").textContent =
      horarioSelecionado.assistenteNome;
    document.getElementById("confirm-data").textContent = new Date(
      horarioSelecionado.data + "T03:00:00"
    ).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    document.getElementById("confirm-horario").textContent =
      horarioSelecionado.hora;

    agendamentoSection.style.display = "none";
    confirmacaoSection.style.display = "block";

    Logger.success(
      "CONFIRMAÇÃO",
      "Tela de confirmação final exibida ao usuário"
    );
  }

  // ========================================
  // CONFIGURAÇÃO DOS EVENT LISTENERS
  // ========================================
  Logger.log("EVENT LISTENERS", "Adicionando event listeners...");

  // Event Listener: CPF Input - Blur (quando sai do campo)
  cpfInput.addEventListener("blur", () => {
    Logger.log("EVENT", "Evento BLUR disparado no campo CPF");
    buscarPacientePorCPF();
  });

  // Event Listener: CPF Input - Change (quando o valor muda - ADICIONAL para melhor UX)
  cpfInput.addEventListener("change", () => {
    Logger.log("EVENT", "Evento CHANGE disparado no campo CPF");
    Logger.info("EVENT", "Valor do CPF:", cpfInput.value);
  });

  // Event Listener: CPF Input - Input (em tempo real enquanto digita)
  cpfInput.addEventListener("input", () => {
    Logger.info(
      "EVENT",
      "Evento INPUT disparado - CPF em digitação:",
      cpfInput.value
    );
    // Limpa feedback enquanto digita para melhor UX
    if (
      cpfFeedback.textContent &&
      cpfFeedback.textContent !== "Verificando..."
    ) {
      cpfFeedback.textContent = "";
      cpfFeedback.className = "";
      Logger.info("EVENT", "Feedback limpo enquanto usuário digita");
    }
  });

  // Event Listener: Botão Fechar Modal
  modal.querySelector(".close-modal-btn").addEventListener("click", () => {
    Logger.log("EVENT", "Botão fechar (X) clicado");
    modal.style.display = "none";
    Logger.info("EVENT", "Modal fechado");
  });

  // Event Listener: Botão Cancelar
  document.getElementById("modal-cancel-btn").addEventListener("click", () => {
    Logger.log("EVENT", "Botão Cancelar clicado");
    modal.style.display = "none";
    Logger.info("EVENT", "Modal fechado pelo usuário");
  });

  // Event Listener: Botão Confirmar Agendamento
  document
    .getElementById("modal-confirm-agendamento-btn")
    .addEventListener("click", () => {
      Logger.log("EVENT", "Botão Confirmar Agendamento clicado");
      handleAgendamento();
    });

  Logger.success(
    "EVENT LISTENERS",
    "Todos os event listeners adicionados com sucesso"
  );

  // ========================================
  // CARREGAMENTO INICIAL
  // ========================================
  Logger.log("INIT", "Carregando horários disponíveis...");
  carregarHorarios();
});
