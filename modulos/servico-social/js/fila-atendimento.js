// Arquivo: /modulos/servico-social/js/fila-atendimento.js
// Versão: 2.0 (Corrige ReferenceError e integra com a Trilha do Paciente)

export function init(db, user, userData, inscricaoId) {
  const patientDetailsContainer = document.getElementById(
    "patient-details-container"
  );
  const triagemForm = document.getElementById("triagem-form");
  const statusSelect = document.getElementById("triagem-status");
  const camposEncaminhado = document.getElementById("campos-encaminhado");
  const camposObservacao = document.getElementById("campos-observacao");
  const btnVoltar = document.getElementById("btn-voltar-lista");

  if (!inscricaoId) {
    patientDetailsContainer.innerHTML =
      '<p class="error-message">ID da inscrição não fornecido na URL.</p>';
    return;
  }

  let trilhaDocRef = null; // Guardará a referência ao documento na trilha do paciente

  async function carregarDadosPaciente() {
    patientDetailsContainer.innerHTML = '<div class="loading-spinner"></div>';
    try {
      // **CORREÇÃO 2**: Busca na coleção 'trilhaPaciente' usando o 'inscricaoId'
      const trilhaQuery = await db
        .collection("trilhaPaciente")
        .where("inscricaoId", "==", inscricaoId)
        .limit(1)
        .get();

      if (trilhaQuery.empty) {
        throw new Error(
          "Paciente não encontrado na trilha. A inscrição pode não ter sido processada ainda."
        );
      }

      const trilhaDoc = trilhaQuery.docs[0];
      trilhaDocRef = trilhaDoc.ref; // Armazena a referência para salvar depois

      const data = trilhaDoc.data();

      patientDetailsContainer.innerHTML = `
                <div class="patient-info-group">
                    <strong>Nome:</strong>
                    <p>${data.nomeCompleto || "Não informado"}</p>
                </div>
                <div class="patient-info-group">
                    <strong>Telefone:</strong>
                    <p>${data.telefoneCelular || "Não informado"}</p>
                </div>
                <div class="patient-info-group">
                    <strong>Email:</strong>
                    <p>${data.email || "Não informado"}</p>
                </div>
                <div class="patient-info-group">
                    <strong>Data de Nascimento:</strong>
                    <p>${
                      new Date(
                        data.dataNascimento + "T03:00:00"
                      ).toLocaleDateString("pt-BR") || "Não informado"
                    }</p>
                </div>
                <div class="patient-info-group">
                    <strong>Disponibilidade (Inscrição):</strong>
                    <p>${
                      (data.disponibilidadeGeral || []).join(", ") ||
                      "Não informado"
                    }</p>
                </div>
            `;
    } catch (error) {
      console.error("Erro ao carregar dados do paciente da trilha:", error);
      patientDetailsContainer.innerHTML = `<p class="error-message">Erro ao carregar dados: ${error.message}</p>`;
    }
  }

  statusSelect.addEventListener("change", () => {
    const selectedValue = statusSelect.value;
    camposEncaminhado.style.display =
      selectedValue === "encaminhado" ? "block" : "none";
    camposObservacao.style.display =
      selectedValue === "nao_realizada" || selectedValue === "desistiu"
        ? "block"
        : "none";
  });

  btnVoltar.addEventListener("click", () => {
    window.location.hash = "#agendamentos-triagem";
  });

  triagemForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const saveButton = triagemForm.querySelector('button[type="submit"]');
    saveButton.disabled = true;
    saveButton.textContent = "Salvando...";

    try {
      if (!trilhaDocRef) {
        throw new Error(
          "Referência do documento do paciente na trilha não encontrada."
        );
      }

      const status = statusSelect.value;
      let dadosParaSalvar = {
        lastUpdate: new Date(),
        assistenteSocialTriagem: {
          uid: user.uid,
          nome: userData.nome,
        },
      };
      let newStatus = "";

      if (status === "encaminhado") {
        newStatus = "encaminhar_para_plantao";
        dadosParaSalvar = {
          ...dadosParaSalvar,
          status: newStatus,
          valorContribuicao:
            document.getElementById("valor-contribuicao").value ||
            "Não definido",
          criteriosValor: document.getElementById("criterios-valor").value,
          infoIsencao: document.getElementById("info-isencao").value,
          modalidadeAtendimento: document.getElementById(
            "modalidade-atendimento"
          ).value,
          preferenciaAtendimento:
            document.getElementById("preferencia-genero").value,
          queixaPrincipal: document.getElementById("queixa-paciente").value,
        };
      } else if (status === "desistiu") {
        newStatus = "desistencia";
        dadosParaSalvar = {
          ...dadosParaSalvar,
          status: newStatus,
          desistenciaMotivo: `Desistiu na etapa de triagem. Motivo: ${
            document.getElementById("observacao-geral").value
          }`,
        };
      } else {
        // 'nao_realizada' ou outro status
        // Neste caso, o card não muda de status, apenas adiciona uma observação.
        dadosParaSalvar.observacoesTriagem =
          document.getElementById("observacao-geral").value;
      }

      await trilhaDocRef.update(dadosParaSalvar);

      alert(
        "Ficha de triagem salva com sucesso! O paciente foi movido na Trilha do Paciente."
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
