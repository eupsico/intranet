// Arquivo: /modulos/trilha-paciente/js/stages/em_atendimento_plantao.js
// Versão: 2.2 (Lógica de visibilidade e campos obrigatórios CORRIGIDA)

import { carregarProfissionais } from "../../../../assets/js/app.js";

export function setupEmAtendimentoPlantao(db, functions, trilhaId, data) {
  const content = `
        <div class="patient-info-box">
            <h4>Dados do Paciente</h4>
            <p><strong>Nome:</strong> ${
              data.nomeCompleto || "Não informado"
            }</p>
            <p><strong>Contribuição:</strong> ${
              data.valorContribuicao || "Não informado"
            }</p>
            <p><strong>Disponibilidade:</strong> ${
              data.disponibilidadeGeral
                ? data.disponibilidadeGeral.join(", ")
                : "Não informado"
            }</p>
            <p><strong>Modalidade:</strong> ${
              data.modalidadeAtendimento || "Não informado"
            }</p>
            <p><strong>Preferência de Atendimento:</strong> ${
              data.preferenciaAtendimento || "Não informado"
            }</p>
        </div>
        <form id="plantao-form">
            <div class="form-group">
                <label for="continua-terapia">Paciente deseja continuar com a terapia?</label>
                <select id="continua-terapia" required>
                    <option value="">Selecione...</option>
                    <option value="sim">Sim</option>
                    <option value="nao">Não</option>
                </select>
            </div>
            <div id="motivo-desistencia-container" class="form-group hidden">
                <label for="motivo-desistencia-plantao">Motivo da desistência:</label>
                <textarea id="motivo-desistencia-plantao" rows="3"></textarea>
            </div>
            <div id="continuacao-plantao-container" class="hidden">
                <div class="form-group">
                    <label for="profissional-plantao">Selecione o nome profissional do Plantão:</label>
                    <select id="profissional-plantao"></select>
                </div>
                <div class="form-group">
                    <label for="tipo-profissional-plantao">O profissional que irá atender o paciente é:</label>
                    <select id="tipo-profissional-plantao">
                        <option value="">Selecione...</option>
                        <option value="Estagiária(o)">Estagiária(o)</option>
                        <option value="Voluntária(o)">Voluntária(o)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="data-encaminhamento-plantao">Data do encaminhamento para o Plantão:</label>
                    <input type="date" id="data-encaminhamento-plantao">
                </div>
                <div class="form-group">
                    <label for="data-primeira-sessao-plantao">Primeira sessão do Plantão agendada para o dia:</label>
                    <input type="date" id="data-primeira-sessao-plantao">
                </div>
                <div class="form-group">
                    <label for="hora-primeira-sessao-plantao">Primeira sessão do Plantão agendada para o horário:</label>
                    <input type="time" id="hora-primeira-sessao-plantao">
                </div>
                <div class="form-group">
                    <label for="tipo-atendimento-plantao">O atendimento será:</label>
                    <select id="tipo-atendimento-plantao">
                        <option value="">Selecione...</option>
                        <option value="Presencial">Presencial</option>
                        <option value="Online">Online</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="observacoes-plantao">Observações:</label>
                    <textarea id="observacoes-plantao" rows="3"></textarea>
                </div>
            </div>
            <button type="submit" class="save-btn">Salvar</button>
        </form>
    `;

  const element = document.createElement("div");
  element.innerHTML = content;

  // === INÍCIO DA CORREÇÃO APLICADA AQUI ===
  const continuaTerapiaSelect = element.querySelector("#continua-terapia");
  const motivoContainer = element.querySelector(
    "#motivo-desistencia-container"
  );
  const continuacaoContainer = element.querySelector(
    "#continuacao-plantao-container"
  );

  // Mapeia os campos que devem ser obrigatórios para cada caso
  const camposObrigatoriosSim = [
    "profissional-plantao",
    "tipo-profissional-plantao",
    "data-encaminhamento-plantao",
    "data-primeira-sessao-plantao",
    "hora-primeira-sessao-plantao",
    "tipo-atendimento-plantao",
  ];
  const campoObrigatorioNao = "motivo-desistencia-plantao";

  continuaTerapiaSelect.addEventListener("change", (e) => {
    const value = e.target.value;
    const isSim = value === "sim";
    const isNao = value === "nao";

    // 1. Controla a visibilidade das seções
    continuacaoContainer.classList.toggle("hidden", !isSim);
    motivoContainer.classList.toggle("hidden", !isNao);

    // 2. Define quais campos são obrigatórios com base na seleção
    camposObrigatoriosSim.forEach((id) => {
      element.querySelector(`#${id}`).required = isSim;
    });
    element.querySelector(`#${campoObrigatorioNao}`).required = isNao;
  });
  // === FIM DA CORREÇÃO ===

  carregarProfissionais(
    db,
    "atendimento",
    element.querySelector("#profissional-plantao")
  );

  const form = element.querySelector("#plantao-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Verifica a validação do formulário antes de continuar
    if (!form.checkValidity()) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      form.reportValidity(); // Mostra qual campo está inválido
      return;
    }

    const saveButton = form.querySelector(".save-btn");
    saveButton.disabled = true;
    saveButton.textContent = "Salvando...";

    try {
      const continua = continuaTerapiaSelect.value;
      let updateData = {};

      if (continua === "nao") {
        updateData = {
          status: "desistencia",
          desistenciaMotivo: `Desistiu no plantão. Motivo: ${
            element.querySelector("#motivo-desistencia-plantao").value
          }`,
          lastUpdate: new Date(),
        };
      } else if (continua === "sim") {
        const profissionalSelect = element.querySelector(
          "#profissional-plantao"
        );
        const profissionalId = profissionalSelect.value;
        const profissionalNome =
          profissionalSelect.options[profissionalSelect.selectedIndex].text;

        updateData = {
          status: "em_atendimento_plantao",
          plantaoInfo: {
            profissionalId: profissionalId,
            profissionalNome: profissionalNome,
            tipoProfissional: element.querySelector(
              "#tipo-profissional-plantao"
            ).value,
            dataEncaminhamento: element.querySelector(
              "#data-encaminhamento-plantao"
            ).value,
            dataPrimeiraSessao: element.querySelector(
              "#data-primeira-sessao-plantao"
            ).value,
            horaPrimeiraSessao: element.querySelector(
              "#hora-primeira-sessao-plantao"
            ).value,
            tipoAtendimento: element.querySelector("#tipo-atendimento-plantao")
              .value,
            observacoes: element.querySelector("#observacoes-plantao").value,
          },
          lastUpdate: new Date(),
        };
      }

      if (Object.keys(updateData).length > 0) {
        await db.collection("trilhaPaciente").doc(trilhaId).update(updateData);
        alert("Status do paciente atualizado com sucesso!");
        window.location.reload();
      } else {
        alert("Nenhuma opção selecionada para salvar.");
      }
    } catch (error) {
      console.error("Erro ao salvar informações do plantão:", error);
      alert("Erro ao salvar. Tente novamente.");
    } finally {
      // Garante que o botão seja reativado mesmo em caso de erro
      saveButton.disabled = false;
      saveButton.textContent = "Salvar";
    }
  });

  return element;
}
