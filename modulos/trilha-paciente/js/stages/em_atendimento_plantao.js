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
                    <select id="profissional-plantao" required></select>
                </div>
                <div class="form-group">
                    <label for="tipo-profissional-plantao">O profissional que irá atender o paciente é:</label>
                    <select id="tipo-profissional-plantao" required>
                        <option value="">Selecione...</option>
                        <option value="Estagiária(o)">Estagiária(o)</option>
                        <option value="Voluntária(o)">Voluntária(o)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="data-encaminhamento-plantao">Data do encaminhamento para o Plantão:</label>
                    <input type="date" id="data-encaminhamento-plantao" required>
                </div>
                <div class="form-group">
                    <label for="data-primeira-sessao-plantao">Primeira sessão do Plantão agendada para o dia:</label>
                    <input type="date" id="data-primeira-sessao-plantao" required>
                </div>
                <div class="form-group">
                    <label for="hora-primeira-sessao-plantao">Primeira sessão do Plantão agendada para o horário:</label>
                    <input type="time" id="hora-primeira-sessao-plantao" required>
                </div>
                <div class="form-group">
                    <label for="tipo-atendimento-plantao">O atendimento será:</label>
                    <select id="tipo-atendimento-plantao" required>
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

  const continuaTerapiaSelect = element.querySelector("#continua-terapia");
  const motivoContainer = element.querySelector(
    "#motivo-desistencia-container"
  );
  const continuacaoContainer = element.querySelector(
    "#continuacao-plantao-container"
  );

  continuaTerapiaSelect.addEventListener("change", (e) => {
    const value = e.target.value;
    motivoContainer.classList.toggle("hidden", value !== "nao");
    continuacaoContainer.classList.toggle("hidden", value !== "sim");

    // Toggle required fields
    const continuacaoInputs = continuacaoContainer.querySelectorAll(
      "select, input, textarea"
    );
    continuacaoInputs.forEach((input) => (input.required = value === "sim"));

    const motivoInput = motivoContainer.querySelector("textarea");
    motivoInput.required = value === "nao";
  });

  carregarProfissionais(
    db,
    "atendimento",
    element.querySelector("#profissional-plantao")
  );

  const form = element.querySelector("#plantao-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
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
        const profissionalId = element.querySelector(
          "#profissional-plantao"
        ).value;
        const profissionalNome = element.querySelector("#profissional-plantao")
          .options[element.querySelector("#profissional-plantao").selectedIndex]
          .text;

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

      await db.collection("trilhaPaciente").doc(trilhaId).update(updateData);
      alert("Status do paciente atualizado com sucesso!");
      window.location.reload();
    } catch (error) {
      console.error("Erro ao salvar informações do plantão:", error);
      alert("Erro ao salvar. Tente novamente.");
      saveButton.disabled = false;
      saveButton.textContent = "Salvar";
    }
  });

  return element;
}
