// Arquivo: /modulos/servico-social/js/fila-atendimento.js
// Versão: 3.0 (Migrado para a sintaxe modular do Firebase v9)

import {
  db,
  doc,
  getDoc,
  updateDoc,
} from "../../../assets/js/firebase-init.js";

export function init(user, userData, trilhaId) {
  const patientDetailsContainer = document.getElementById(
    "patient-details-container"
  );
  const triagemForm = document.getElementById("triagem-form");
  const statusSelect = document.getElementById("triagem-status");
  const camposEncaminhado = document.getElementById("campos-encaminhado");
  const camposObservacao = document.getElementById("campos-observacao");
  const btnVoltar = document.getElementById("btn-voltar-lista");
  const valorContribuicaoInput = document.getElementById("valor-contribuicao");

  if (!trilhaId) {
    patientDetailsContainer.innerHTML =
      '<p class="error-message">ID do paciente não fornecido na URL.</p>';
    return;
  }

  // A referência será definida na função carregarDadosPaciente
  let trilhaDocRef = null;

  function formatarMoeda(input) {
    let value = input.value.replace(/\D/g, "");
    if (value === "") {
      input.value = "";
      return;
    }
    value = (parseInt(value) / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
    input.value = value;
  }
  valorContribuicaoInput.addEventListener("input", () =>
    formatarMoeda(valorContribuicaoInput)
  );

  function formatarDisponibilidadeEspecifica(disponibilidade) {
    if (!disponibilidade || disponibilidade.length === 0) {
      return "Nenhum horário detalhado informado.";
    }
    const dias = {
      "manha-semana": { label: "Manhã (Semana)", horarios: [] },
      "tarde-semana": { label: "Tarde (Semana)", horarios: [] },
      "noite-semana": { label: "Noite (Semana)", horarios: [] },
      "manha-sabado": { label: "Manhã (Sábado)", horarios: [] },
    };
    disponibilidade.forEach((item) => {
      const [periodo, hora] = item.split("_");
      if (dias[periodo]) {
        dias[periodo].horarios.push(hora);
      }
    });
    let html = "";
    for (const key in dias) {
      if (dias[key].horarios.length > 0) {
        html += `<strong>${dias[key].label}:</strong> ${dias[key].horarios.join(
          ", "
        )}<br>`;
      }
    }
    return html || "Nenhum horário detalhado informado.";
  }

  async function carregarDadosPaciente() {
    patientDetailsContainer.innerHTML = '<div class="loading-spinner"></div>';
    try {
      // Define a referência do documento com a sintaxe v9
      trilhaDocRef = doc(db, "trilhaPaciente", trilhaId);
      // Busca o documento com a sintaxe v9
      const trilhaDoc = await getDoc(trilhaDocRef);

      if (!trilhaDoc.exists()) {
        throw new Error(
          "Paciente não encontrado na trilha com o ID fornecido."
        );
      }

      const data = trilhaDoc.data();

      const formatDate = (dateStr) =>
        dateStr
          ? new Date(dateStr + "T03:00:00").toLocaleDateString("pt-BR")
          : "Não informado";
      const formatArray = (arr) =>
        arr && arr.length > 0 ? arr.join(", ") : "N/A";

      patientDetailsContainer.innerHTML = `
        <div class="patient-info-group"><strong>Nome:</strong><p>${
          data.nomeCompleto || "N/A"
        }</p></div>
        <div class="patient-info-group"><strong>CPF:</strong><p>${
          data.cpf || "N/A"
        }</p></div>
        <div class="patient-info-group"><strong>Data de Nasc.:</strong><p>${formatDate(
          data.dataNascimento
        )}</p></div>
        <div class="patient-info-group"><strong>Telefone:</strong><p>${
          data.telefoneCelular || "N/A"
        }</p></div>
        <div class="patient-info-group"><strong>Email:</strong><p>${
          data.email || "N/A"
        }</p></div>
        ${
          data.responsavel?.nome
            ? `
        <div class="patient-info-group"><strong>Responsável:</strong><p>${
          data.responsavel.nome
        }</p></div>
        <div class="patient-info-group"><strong>Contato Responsável:</strong><p>${
          data.responsavel.contato || "N/A"
        }</p></div>`
            : ""
        }
        <hr>
        <div class="patient-info-group"><strong>Endereço:</strong><p>${
          data.rua || "N/A"
        }, ${data.numeroCasa || "S/N"} - ${data.bairro || "N/A"}, ${
        data.cidade || "N/A"
      }</p></div>
        <div class="patient-info-group"><strong>CEP:</strong><p>${
          data.cep || "N/A"
        }</p></div>
        <hr>
        <div class="patient-info-group"><strong>Renda Individual:</strong><p>${
          data.rendaMensal || "N/A"
        }</p></div>
        <div class="patient-info-group"><strong>Renda Familiar:</strong><p>${
          data.rendaFamiliar || "N/A"
        }</p></div>
        <div class="patient-info-group"><strong>Moradia:</strong><p>${
          data.casaPropria || "N/A"
        }</p></div>
        <div class="patient-info-group"><strong>Pessoas na Moradia:</strong><p>${
          data.pessoasMoradia || "N/A"
        }</p></div>
        <hr>
        <div class="patient-info-group"><strong>Disponibilidade (Geral):</strong><p>${formatArray(
          data.disponibilidadeGeral
        )}</p></div>
        <div class="patient-info-group"><strong>Disponibilidade (Específica):</strong><p>${formatarDisponibilidadeEspecifica(
          data.disponibilidadeEspecifica
        )}</p></div>
        <div class="patient-info-group"><strong>Motivo da Busca:</strong><p>${
          data.motivoBusca || "N/A"
        }</p></div>
    `;
      document.getElementById("queixa-paciente").value = data.motivoBusca || "";
    } catch (error) {
      console.error("Erro ao carregar dados do paciente:", error);
      patientDetailsContainer.innerHTML = `<p class="error-message">Erro ao carregar dados: ${error.message}</p>`;
    }
  }

  statusSelect.addEventListener("change", () => {
    const selectedValue = statusSelect.value;
    const criteriosTextarea = document.getElementById("criterios-valor");
    camposEncaminhado.style.display =
      selectedValue === "encaminhado" ? "block" : "none";
    camposObservacao.style.display =
      selectedValue === "nao_realizada" || selectedValue === "desistiu"
        ? "block"
        : "none";
    valorContribuicaoInput.required = selectedValue === "encaminhado";
    criteriosTextarea.required = selectedValue === "encaminhado";
    document.getElementById("observacao-geral").required =
      selectedValue === "nao_realizada" || selectedValue === "desistiu";
  });

  btnVoltar.addEventListener(
    "click",
    () => (window.location.hash = "#agendamentos-triagem")
  );

  triagemForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (statusSelect.value === "encaminhado") {
      if (
        !valorContribuicaoInput.value ||
        !document.getElementById("criterios-valor").value.trim()
      ) {
        alert(
          'Os campos "Valor da contribuição" e "Critérios" são obrigatórios.'
        );
        return;
      }
    } else if (
      statusSelect.value === "nao_realizada" ||
      statusSelect.value === "desistiu"
    ) {
      if (!document.getElementById("observacao-geral").value.trim()) {
        alert('O campo "Observação" é obrigatório para este status.');
        return;
      }
    }
    const saveButton = triagemForm.querySelector('button[type="submit"]');
    saveButton.disabled = true;
    saveButton.textContent = "Salvando...";
    try {
      if (!trilhaDocRef)
        throw new Error("Referência do documento não encontrada.");
      const status = statusSelect.value;
      let dadosParaSalvar = {
        lastUpdate: new Date(),
        assistenteSocialTriagem: { uid: user.uid, nome: userData.nome },
      };
      if (status === "encaminhado") {
        dadosParaSalvar = {
          ...dadosParaSalvar,
          status: "encaminhar_para_plantao",
          valorContribuicao: valorContribuicaoInput.value,
          criteriosValor: document.getElementById("criterios-valor").value,
          modalidadeAtendimento: document.getElementById(
            "modalidade-atendimento"
          ).value,
          preferenciaAtendimento:
            document.getElementById("preferencia-genero").value,
          queixaPrincipal: document.getElementById("queixa-paciente").value,
        };
      } else if (status === "desistiu") {
        dadosParaSalvar = {
          ...dadosParaSalvar,
          status: "desistencia",
          desistenciaMotivo: `Desistiu na etapa de triagem. Motivo: ${
            document.getElementById("observacao-geral").value
          }`,
        };
      } else {
        dadosParaSalvar.statusTriagem = status;
        dadosParaSalvar.observacoesTriagem =
          document.getElementById("observacao-geral").value;
      }
      // Atualiza o documento com a sintaxe v9
      await updateDoc(trilhaDocRef, dadosParaSalvar);
      alert(
        "Ficha de triagem salva com sucesso! O paciente foi atualizado na Trilha do Paciente."
      );
      window.location.hash = "#agendamentos-triagem";
    } catch (error) {
      console.error("Erro ao salvar a triagem:", error);
      alert("Ocorreu um erro ao salvar a ficha. Tente novamente.");
      saveButton.disabled = false;
      saveButton.textContent = "Salvar Triagem";
    }
  });

  carregarDadosPaciente();
}
