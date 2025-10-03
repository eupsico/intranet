// Arquivo: /assets/js/agendamento-publico.js
// Versão: 1.3 (Final Corrigida)
// Descrição: Chama a Cloud Function 'getHorariosTriagemPublicos' (com o nome correto).

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

  async function carregarHorarios() {
    try {
      // ### CORREÇÃO APLICADA AQUI ###
      // O nome da função foi atualizado para corresponder ao backend.
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
          const horarioDataString = JSON.stringify(horario);
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
    horarioSelecionado = horario;
    pacienteExistenteId = null;

    cpfInput.value = "";
    nomeInput.value = "";
    telefoneInput.value = "";
    cpfFeedback.textContent = "";
    nomeInput.readOnly = false;

    document.getElementById("modal-horario-selecionado").textContent =
      horario.hora;
    modal.style.display = "flex";
  }

  async function buscarPacientePorCPF() {
    const cpfValue = cpfInput.value.trim(); // Pega o valor completo do campo
    cpfFeedback.textContent = "Verificando...";
    cpfFeedback.style.color = "gray";
    nomeInput.value = "";
    nomeInput.readOnly = false;
    pacienteExistenteId = null;

    let cpfParaBusca;

    // VERIFICA SE É UM ID TEMPORÁRIO OU UM CPF NORMAL
    if (cpfValue.toUpperCase().startsWith("TEMP-")) {
      cpfParaBusca = cpfValue; // Usa o ID temporário completo
    } else {
      cpfParaBusca = cpfValue.replace(/\D/g, ""); // Limpa como antes para CPFs normais
      if (cpfParaBusca.length !== 11) {
        cpfFeedback.textContent = "CPF inválido.";
        cpfFeedback.style.color = "red";
        return;
      }
    }

    try {
      const verificarCpf = httpsCallable(functions, "verificarCpfExistente");
      // Envia o valor correto para a função (seja o CPF de 11 dígitos ou o ID 'TEMP-...')
      const result = await verificarCpf({ cpf: cpfParaBusca });
      const data = result.data;

      if (data.exists) {
        pacienteExistenteId = data.docId;
        const paciente = data.dados;
        nomeInput.value = paciente.nomeCompleto;
        nomeInput.readOnly = true;
        telefoneInput.value = paciente.telefoneCelular || "";
        cpfFeedback.textContent = `Paciente encontrado: ${paciente.nomeCompleto}. Confirme seus dados.`;
        cpfFeedback.style.color = "green";
      } else {
        cpfFeedback.textContent =
          "CPF ou ID não encontrado. Preencha seus dados para um novo cadastro.";
        cpfFeedback.style.color = "orange";
      }
    } catch (error) {
      console.error("Erro ao chamar a função verificarCpfExistente:", error);
      cpfFeedback.textContent = "Erro ao verificar o CPF/ID. Tente novamente.";
      cpfFeedback.style.color = "red";
    }
  }

  async function handleAgendamento() {
    if (!horarioSelecionado) return;

    const cpf = cpfInput.value.replace(/\D/g, "");
    const nome = nomeInput.value.trim();
    const telefone = telefoneInput.value.trim();

    if (cpf.length !== 11 || !nome || !telefone) {
      alert(
        "Por favor, preencha todos os campos obrigatórios: CPF, Nome e Telefone."
      );
      return;
    }

    const btnConfirmar = document.getElementById(
      "modal-confirm-agendamento-btn"
    );
    btnConfirmar.disabled = true;
    btnConfirmar.textContent = "Salvando...";

    const dadosParaAgendamento = {
      cpf: cpf,
      nome: nome,
      telefone: telefone,
      horarioSelecionado: horarioSelecionado,
      pacienteExistenteId: pacienteExistenteId,
    };

    try {
      const agendarTriagem = httpsCallable(functions, "agendarTriagemPublico");
      await agendarTriagem(dadosParaAgendamento);
      exibirConfirmacaoFinal(nome);
    } catch (error) {
      console.error("Erro ao salvar agendamento via Cloud Function:", error);
      alert(`Não foi possível salvar seu agendamento: ${error.message}`);
    } finally {
      btnConfirmar.disabled = false;
      btnConfirmar.textContent = "Confirmar Agendamento";
      modal.style.display = "none";
    }
  }

  function exibirConfirmacaoFinal(nomePaciente) {
    document.getElementById("confirm-paciente-nome").textContent = nomePaciente;
    document.getElementById("confirm-assistente").textContent =
      horarioSelecionado.assistenteNome;
    document.getElementById("confirm-data").textContent = new Date(
      horarioSelecionado.data + "T03:00:00"
    ).toLocaleDateString("pt-BR");
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

  carregarHorarios();
});
