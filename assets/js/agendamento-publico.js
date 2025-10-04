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
    const cpf = cpfInput.value.replace(/\D/g, "");
    const cpfFeedback = document.getElementById("cpf-feedback");
    const nomeInput = document.getElementById("nome");
    const telefoneInput = document.getElementById("telefone");

    cpfFeedback.textContent = "Verificando...";
    cpfFeedback.style.color = "grey";

    // **INÍCIO DA ALTERAÇÃO**
    // Utiliza a nova função que valida CPF comum e temporário
    if (!validarCPF(cpf)) {
      cpfFeedback.textContent = "CPF inválido.";
      cpfFeedback.style.color = "red";
      return;
    }
    // **FIM DA ALTERAÇÃO**

    try {
      const querySnapshot = await db
        .collection("pacientes")
        .where("cpf", "==", cpf)
        .get();
      if (!querySnapshot.empty) {
        const pacienteData = querySnapshot.docs[0].data();
        nomeInput.value = pacienteData.nomeCompleto;
        telefoneInput.value = pacienteData.telefoneCelular;
        cpfFeedback.textContent = "Paciente encontrado.";
        cpfFeedback.style.color = "green";
        window.isNovoPaciente = false; // Garante que a variável global seja atualizada
      } else {
        cpfFeedback.textContent =
          "CPF não encontrado. Preencha os dados para novo cadastro.";
        cpfFeedback.style.color = "orange";
        window.isNovoPaciente = true; // Garante que a variável global seja atualizada
      }
    } catch (error) {
      console.error("Erro ao buscar paciente:", error);
      cpfFeedback.textContent = "Erro ao buscar. Tente novamente.";
      cpfFeedback.style.color = "red";
    }
  }

  async function handleAgendamento() {
    const cpf = cpfInput.value.replace(/\D/g, "");
    const nome = nomeInput.value.trim();
    const telefone = telefoneInput.value.trim();
    const psicologoId = document.getElementById("psicologo").value;
    const horarioSelecionado = document.querySelector(".horario.selecionado");

    // **INÍCIO DA ALTERAÇÃO**
    // Valida se os campos essenciais estão preenchidos e se o CPF é válido (comum ou temporário)
    if (!validarCPF(cpf) || !nome || !telefone) {
      alert(
        "Por favor, preencha todos os campos obrigatórios com dados válidos: CPF, Nome e Telefone."
      );
      return;
    }
    // **FIM DA ALTERAÇÃO**

    if (!psicologoId || !horarioSelecionado) {
      alert("Por favor, selecione um psicólogo e um horário.");
      return;
    }

    const horarioId = horarioSelecionado.dataset.horarioId;
    const agendamentoButton = document.getElementById("agendamento-button");
    agendamentoButton.disabled = true;
    agendamentoButton.textContent = "Agendando...";

    try {
      let pacienteId;
      const querySnapshot = await db
        .collection("pacientes")
        .where("cpf", "==", cpf)
        .get();

      if (window.isNovoPaciente && querySnapshot.empty) {
        const novoPacienteRef = await db.collection("pacientes").add({
          nomeCompleto: nome,
          telefoneCelular: telefone,
          cpf: cpf,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        });
        pacienteId = novoPacienteRef.id;
      } else if (!querySnapshot.empty) {
        pacienteId = querySnapshot.docs[0].id;
      } else {
        // Caso de segurança: se isNovoPaciente for false, mas o CPF não for encontrado
        throw new Error(
          "CPF não encontrado para paciente existente. Por favor, verifique os dados."
        );
      }

      const agendamentoData = {
        pacienteId: pacienteId,
        psicologoId: psicologoId,
        horarioId: horarioId,
        status: "agendado", // Status inicial do agendamento
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection("agendamentosTriagem").add(agendamentoData);

      // Atualiza o status do horário para 'ocupado'
      await db.collection("disponibilidadeTriagem").doc(horarioId).update({
        status: "ocupado",
      });

      alert("Agendamento realizado com sucesso!");
      // Limpar o formulário ou redirecionar o usuário
      window.location.reload(); // Recarrega a página para limpar os campos e a seleção
    } catch (error) {
      console.error("Erro ao realizar agendamento:", error);
      alert("Falha no agendamento. Por favor, tente novamente.");
      agendamentoButton.disabled = false;
      agendamentoButton.textContent = "Confirmar Agendamento";
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
