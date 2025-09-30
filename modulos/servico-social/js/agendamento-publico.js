// Arquivo: /modulos/servico-social/js/agendamento-publico.js
// Versão 2.2: Corrige a busca de CPF para consultar as coleções corretas diretamente, espelhando a lógica da ficha de inscrição.

import { db, functions } from "../../../assets/js/firebase-init.js";

document.addEventListener("DOMContentLoaded", () => {
  // --- Mapeamento de Elementos ---
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
  let colecaoDoPaciente = null; // 'trilhaPaciente' ou 'inscricoes'

  // --- Funções Principais ---

  async function carregarHorarios() {
    try {
      const getHorarios = functions.httpsCallable("getHorariosTriagem");
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
      horariosContainer.innerHTML =
        '<p style="color: red;">Ocorreu um erro ao buscar os horários. Tente recarregar a página.</p>';
    }
  }

  function renderizarHorarios(horarios) {
    // Agrupar por modalidade e data
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
    colecaoDoPaciente = null;

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
    const cpf = cpfInput.value.replace(/\D/g, "");
    cpfFeedback.textContent = "Verificando...";
    cpfFeedback.style.color = "gray";
    nomeInput.value = "";
    nomeInput.readOnly = false;
    pacienteExistenteId = null;
    colecaoDoPaciente = null;

    if (cpf.length !== 11) {
      cpfFeedback.textContent = "CPF inválido.";
      cpfFeedback.style.color = "red";
      return;
    }

    try {
      // Lógica replicada da ficha de inscrição, mas buscando em ambas as coleções
      let snapshot = await db
        .collection("trilhaPaciente")
        .where("cpf", "==", cpf)
        .limit(1)
        .get();
      let colecao = "trilhaPaciente";

      if (snapshot.empty) {
        snapshot = await db
          .collection("inscricoes")
          .where("cpf", "==", cpf)
          .limit(1)
          .get();
        colecao = "inscricoes";
      }

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const paciente = doc.data();

        pacienteExistenteId = doc.id;
        colecaoDoPaciente = colecao;

        nomeInput.value = paciente.nomeCompleto;
        nomeInput.readOnly = true;
        telefoneInput.value = paciente.telefoneCelular || "";

        cpfFeedback.textContent = `Paciente encontrado: ${paciente.nomeCompleto}. Confirme seus dados.`;
        cpfFeedback.style.color = "green";
      } else {
        cpfFeedback.textContent =
          "CPF não encontrado. Preencha seus dados para um novo cadastro.";
        cpfFeedback.style.color = "orange";
      }
    } catch (error) {
      console.error("Erro ao verificar CPF:", error);
      // Este erro de permissão indica que as regras de segurança precisam de ajuste
      if (error.code === "permission-denied") {
        cpfFeedback.textContent =
          "Erro de segurança ao verificar CPF. Contate o administrador.";
      } else {
        cpfFeedback.textContent = "Erro ao verificar o CPF. Tente novamente.";
      }
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

    try {
      const dadosAgendamento = {
        status: "triagem_agendada",
        dataTriagem: horarioSelecionado.data,
        horaTriagem: horarioSelecionado.hora,
        modalidadeTriagem: horarioSelecionado.modalidade,
        assistenteSocialNome: horarioSelecionado.assistenteNome,
        assistenteSocialId: horarioSelecionado.assistenteId,
        lastUpdate: new Date(),
      };

      if (pacienteExistenteId && colecaoDoPaciente) {
        // Atualiza o documento na coleção onde o paciente foi encontrado
        const docRef = db
          .collection(colecaoDoPaciente)
          .doc(pacienteExistenteId);
        await docRef.update(dadosAgendamento);
      } else {
        // Se não encontrou, cria um novo paciente sempre na 'trilhaPaciente'
        const novoPaciente = {
          ...dadosAgendamento,
          nomeCompleto: nome,
          cpf: cpf,
          telefoneCelular: telefone,
          timestamp: new Date(),
        };
        await db.collection("trilhaPaciente").add(novoPaciente);
      }

      exibirConfirmacaoFinal(nome);
    } catch (error) {
      console.error("Erro ao salvar agendamento:", error);
      alert(
        "Não foi possível salvar seu agendamento. Por favor, tente novamente."
      );
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

  // --- Listeners de Eventos ---
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

  // --- Inicialização ---
  carregarHorarios();
});
