// Arquivo: /modulos/servico-social/js/agendamento-publico.js
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
    nomeInput.value = "";
    nomeInput.readOnly = false;
    pacienteExistenteId = null;

    if (cpf.length !== 11) {
      cpfFeedback.textContent = "CPF inválido.";
      return;
    }

    try {
      const q = db
        .collection("trilhaPaciente")
        .where("cpf", "==", cpf)
        .limit(1);
      const querySnapshot = await q.get();

      if (!querySnapshot.empty) {
        const paciente = querySnapshot.docs[0].data();
        pacienteExistenteId = querySnapshot.docs[0].id;

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
      console.error("Erro ao buscar CPF:", error);
      cpfFeedback.textContent = "Erro ao verificar o CPF. Tente novamente.";
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

      if (pacienteExistenteId) {
        // Atualiza um paciente existente
        const docRef = db.collection("trilhaPaciente").doc(pacienteExistenteId);
        await docRef.update(dadosAgendamento);
      } else {
        // Cria um novo paciente na trilha
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
