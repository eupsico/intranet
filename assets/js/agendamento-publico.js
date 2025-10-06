// Arquivo: /assets/js/agendamento-publico.js
// Versão: 1.4 (Segurança e Lógica Corrigidas)
// Descrição: Chama a Cloud Function 'verificarCpfExistente' para buscar pacientes
// e 'getHorariosPublicos' para carregar os horários.

import { db, functions } from "../../../assets/js/firebase-init.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-functions.js";

document.addEventListener("DOMContentLoaded", () => {
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
  // A variável isNovoPaciente agora é controlada no escopo do módulo
  let isNovoPaciente = true;

  function validarCPF(cpf) {
    cpf = cpf.replace(/[^\d]+/g, "");
    if (cpf.startsWith("99")) return true; // Aceita CPF temporário
    if (cpf === "" || cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
    let add = 0;
    for (let i = 0; i < 9; i++) add += parseInt(cpf.charAt(i)) * (10 - i);
    let rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(9))) return false;
    add = 0;
    for (let i = 0; i < 10; i++) add += parseInt(cpf.charAt(i)) * (11 - i);
    rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(10))) return false;
    return true;
  }

  async function carregarHorarios() {
    try {
      const getHorarios = httpsCallable(functions, "getHorariosPublicos");
      const result = await getHorarios();
      const horarios = result.data.horarios;

      if (!horarios || horarios.length === 0) {
        horariosContainer.innerHTML =
          "<p>Não há horários disponíveis no momento. Por favor, tente novamente mais tarde.</p>";
        return;
      }

      renderizarHorarios(horarios);
    } catch (error) {
      console.error("Erro ao carregar horários:", error);
      horariosContainer.innerHTML = `<p style="color: red;"><strong>Erro ao carregar horários:</strong> ${error.message}</p><p>Tente recarregar a página.</p>`;
    }
  }

  function renderizarHorarios(horarios) {
    const horariosAgrupados = horarios.reduce((acc, horario) => {
      const modalidade = horario.modalidade || "Online";
      const dataFormatada = new Date(
        horario.data + "T03:00:00"
      ).toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      });

      if (!acc[modalidade]) acc[modalidade] = {};
      if (!acc[modalidade][dataFormatada]) acc[modalidade][dataFormatada] = [];

      acc[modalidade][dataFormatada].push(horario);
      return acc;
    }, {});

    let html = "";
    for (const modalidade in horariosAgrupados) {
      html += `<h3 class="modalidade-titulo">${modalidade}</h3>`;
      for (const data in horariosAgrupados[modalidade]) {
        html += `<div class="data-grupo"><h4>${data}</h4><div class="horarios-botoes">`;
        horariosAgrupados[modalidade][data].forEach((horario) => {
          // ✅ Garantir que os campos essenciais estão presentes
          const horarioCompleto = {
            id: horario.id,
            data: horario.data,
            hora: horario.hora,
            modalidade: horario.modalidade,
            unidade: horario.unidade,
            assistenteId:
              horario.assistenteId || horario.assistenteSocialId || null,
            assistenteNome:
              horario.assistenteNome || horario.assistenteSocialNome || null,
          };

          const horarioDataString = JSON.stringify(horarioCompleto);
          html += `<button type="button" class="horario-btn" data-horario='${horarioDataString}'>${horario.hora}</button>`;
        });
        html += `</div></div>`;
      }
    }
    horariosContainer.innerHTML = html;

    horariosContainer.querySelectorAll(".horario-btn").forEach((btn) => {
      btn.addEventListener("click", () =>
        abrirModalConfirmacao(JSON.parse(btn.dataset.horario))
      );
    });
  }

  function abrirModalConfirmacao(horario) {
    console.log("Modal aberto");
    horarioSelecionado = horario;
    pacienteExistenteId = null;
    isNovoPaciente = true; // Reseta o estado ao abrir o modal

    cpfInput.value = "";
    nomeInput.value = "";
    telefoneInput.value = "";
    cpfFeedback.textContent = "";
    nomeInput.readOnly = false;

    document.getElementById("modal-horario-selecionado").textContent =
      horario.hora;
    modal.style.display = "flex";
  }

  // ### FUNÇÃO CORRIGIDA ###
  async function buscarPacientePorCPF() {
    const cpf = cpfInput.value.replace(/\D/g, "");

    cpfFeedback.textContent = "Verificando...";
    cpfFeedback.style.color = "grey";

    if (!validarCPF(cpf)) {
      cpfFeedback.textContent = "CPF inválido.";
      cpfFeedback.style.color = "red";
      return;
    }

    try {
      // Chama a Cloud Function em vez de acessar o DB diretamente
      const verificarCpfExistente = httpsCallable(
        functions,
        "verificarCpfExistente"
      );
      const result = await verificarCpfExistente({ cpf: cpf });
      const data = result.data;

      if (data.exists) {
        const pacienteData = data.dados;
        nomeInput.value = pacienteData.nomeCompleto;
        telefoneInput.value = pacienteData.telefoneCelular;
        cpfFeedback.textContent = "Paciente encontrado.";
        cpfFeedback.style.color = "green";
        pacienteExistenteId = data.docId; // Armazena o ID do paciente existente
        isNovoPaciente = false; // Define que o paciente não é novo
      } else {
        cpfFeedback.textContent =
          "CPF não encontrado. Preencha os dados para novo cadastro.";
        cpfFeedback.style.color = "orange";
        pacienteExistenteId = null; // Garante que não há ID
        isNovoPaciente = true; // Define que o paciente é novo
      }
    } catch (error) {
      console.error("Erro ao buscar paciente:", error);
      cpfFeedback.textContent = "Erro ao buscar. Tente novamente.";
      cpfFeedback.style.color = "red";
    }
  }

  // ### FUNÇÃO AGENDAMENTO ###
  async function handleAgendamento() {
    console.log("---------- INÍCIO DO PROCESSO DE AGENDAMENTO ----------");

    const agendamentoButton = document.getElementById(
      "modal-confirm-agendamento-btn"
    );
    agendamentoButton.disabled = true;
    agendamentoButton.textContent = "Agendando...";

    try {
      const cpf = cpfInput.value.replace(/\D/g, "");
      const nomeCapturado = nomeInput.value.trim();
      const telefoneCapturado = telefoneInput.value.replace(/\D/g, "");

      console.log("PASSO 1: Dados capturados:", {
        cpf,
        nome: nomeCapturado,
        telefone: telefoneCapturado,
      });

      if (!validarCPF(cpf) || !nomeCapturado || !telefoneCapturado) {
        throw new Error(
          "Por favor, preencha todos os campos obrigatórios com dados válidos."
        );
      }
      console.log("PASSO 2: Validação de dados do paciente OK.");

      if (
        !horarioSelecionado ||
        !horarioSelecionado.assistenteId ||
        !horarioSelecionado.assistenteNome ||
        !horarioSelecionado.data ||
        !horarioSelecionado.hora
      ) {
        throw new Error(
          "Erro: dados do horário incompletos. Selecione novamente."
        );
      }
      console.log(
        "PASSO 3: Verificação do horário selecionado OK.",
        horarioSelecionado
      );

      const payload = {
        cpf: cpf,
        assistenteSocialId: horarioSelecionado.assistenteId,
        assistenteSocialNome: horarioSelecionado.assistenteNome,
        data: horarioSelecionado.data,
        hora: horarioSelecionado.hora,
        nomeCompleto: nomeCapturado,
        telefone: telefoneCapturado,
        email: "paciente.sem.email@eupsico.com.br",
        comoConheceu: "Formulário Público de Agendamento",
      };

      console.log("PASSO 4: Payload final montado:");
      Object.entries(payload).forEach(([key, value]) => {
        console.log(`→ ${key}:`, value);
      });

      const agendarTriagem = httpsCallable(functions, "agendarTriagemPublico");
      console.log(
        "🚀 PASSO 5: Chamando a Cloud Function 'agendarTriagemPublico'..."
      );

      const result = await agendarTriagem(payload);

      console.log("📨 PASSO 6: Resposta recebida da função:", result);

      if (result.data.success) {
        console.log("✅ SUCESSO: Agendamento realizado com sucesso!");
        exibirConfirmacaoFinal(nomeCapturado);
      } else {
        throw new Error(
          result.data.message || "Erro desconhecido retornado pela função."
        );
      }
    } catch (error) {
      console.error("🔥 ERRO FATAL no processo de agendamento:", error);
      alert(`Falha no agendamento: ${error.message}`);
    } finally {
      agendamentoButton.disabled = false;
      agendamentoButton.textContent = "Confirmar Agendamento";
      console.log("---------- FIM DO PROCESSO DE AGENDAMENTO ----------");
    }
  }

  function exibirConfirmacaoFinal(nomePaciente) {
    // Esconde o modal antes de mostrar a confirmação
    modal.style.display = "none";

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
  }

  cpfInput.addEventListener("blur", buscarPacientePorCPF);
  modal
    .querySelector(".close-modal-btn")
    .addEventListener("click", () => (modal.style.display = "none"));
  document
    .getElementById("modal-cancel-btn")
    .addEventListener("click", () => (modal.style.display = "none"));
  document
    .getElementById("modal-confirm-agendamento-btn")
    .addEventListener("click", handleAgendamento);

  // Inicia o carregamento dos horários assim que a página é carregada
  carregarHorarios();
});
