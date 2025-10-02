import { carregarProfissionais } from "../../../../assets/js/app.js";

export function setupEncaminharParaPb(db, functions, trilhaId, data) {
  const content = `
        <div class="patient-info-box">
            <h4>Encaminhar para Psicoterapia Breve (PB)</h4>
            <p><strong>Nome:</strong> ${
              data.nomeCompleto || "Não informado"
            }</p>
            <p><strong>Telefone:</strong> ${
              data.telefoneCelular || "Não informado"
            }</p>
            <p><strong>Disponibilidade:</strong> ${
              data.disponibilidadeGeral
                ? data.disponibilidadeGeral.join(", ")
                : "Não informado"
            }</p>
             <p><strong>Tipo de Atendimento:</strong> ${
               data.plantaoInfo?.tipoAtendimento ||
               data.modalidadeAtendimento ||
               "Não informado"
             }</p>
            <p><strong>Contribuição:</strong> ${
              data.valorContribuicao || "Não informado"
            }</p>
        </div>
        <form id="pb-form">
            <div class="form-group">
                <label for="continua-terapia-pb">Paciente deseja continuar com a terapia?</label>
                <select id="continua-terapia-pb" required>
                    <option value="">Selecione...</option>
                    <option value="sim">Sim</option>
                    <option value="nao">Não</option>
                </select>
            </div>
            <div id="motivo-desistencia-pb-container" class="form-group hidden">
                <label for="motivo-desistencia-pb">Motivo da desistência:</label>
                <textarea id="motivo-desistencia-pb" rows="3"></textarea>
            </div>
            <div id="continuacao-pb-container" class="hidden">
                <div class="form-group">
                    <label for="profissional-pb">Selecione o nome profissional do PB:</label>
                    <select id="profissional-pb" required></select>
                </div>
                <div class="form-group">
                    <label for="tipo-profissional-pb">O profissional que irá atender o paciente é:</label>
                    <select id="tipo-profissional-pb" required>
                        <option value="">Selecione...</option>
                        <option value="Estagiária(o)">Estagiária(o)</option>
                        <option value="Voluntária(o)">Voluntária(o)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="data-encaminhamento-pb">Data do encaminhamento para PB:</label>
                    <input type="date" id="data-encaminhamento-pb" required>
                </div>
                <div class="form-group">
                    <label for="data-primeira-sessao-pb">Data da Primeira sessão de PB agendada para:</label>
                    <input type="date" id="data-primeira-sessao-pb" required>
                </div>
                 <div class="form-group">
                    <label for="hora-primeira-sessao-pb">Horário da Primeira sessão de PB agendada para:</label>
                    <input type="time" id="hora-primeira-sessao-pb" required>
                </div>
                <div class="form-group">
                    <label for="tipo-atendimento-pb">O atendimento será:</label>
                    <select id="tipo-atendimento-pb" required>
                        <option value="">Selecione...</option>
                        <option value="Online">Online</option>
                        <option value="Presencial">Presencial</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="observacoes-pb">Observações:</label>
                    <textarea id="observacoes-pb" rows="3"></textarea>
                </div>
            </div>
            <button type="submit" class="save-btn">Salvar</button>
        </form>
    `;
  const element = document.createElement("div");
  element.innerHTML = content;

  const continuaTerapiaSelect = element.querySelector("#continua-terapia-pb");
  const motivoContainer = element.querySelector(
    "#motivo-desistencia-pb-container"
  );
  const continuacaoContainer = element.querySelector(
    "#continuacao-pb-container"
  );

  continuaTerapiaSelect.addEventListener("change", (e) => {
    const value = e.target.value;
    motivoContainer.classList.toggle("hidden", value !== "nao");
    continuacaoContainer.classList.toggle("hidden", value !== "sim");

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
    element.querySelector("#profissional-pb")
  );

  const form = element.querySelector("#pb-form");
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
          desistenciaMotivo: `Desistiu antes do PB. Motivo: ${
            element.querySelector("#motivo-desistencia-pb").value
          }`,
          lastUpdate: new Date(),
        };
      } else if (continua === "sim") {
        const profissionalId = element.querySelector("#profissional-pb").value;
        const profissionalNome =
          element.querySelector("#profissional-pb").options[
            element.querySelector("#profissional-pb").selectedIndex
          ].text;

        updateData = {
          status: "aguardando_info_horarios",
          pbInfo: {
            profissionalId: profissionalId,
            profissionalNome: profissionalNome,
            tipoProfissional: element.querySelector("#tipo-profissional-pb")
              .value,
            dataEncaminhamento: element.querySelector("#data-encaminhamento-pb")
              .value,
            dataPrimeiraSessao: element.querySelector(
              "#data-primeira-sessao-pb"
            ).value,
            horaPrimeiraSessao: element.querySelector(
              "#hora-primeira-sessao-pb"
            ).value,
            tipoAtendimento: element.querySelector("#tipo-atendimento-pb")
              .value,
            observacoes: element.querySelector("#observacoes-pb").value,
          },
          lastUpdate: new Date(),
        };
      }

      await db.collection("trilhaPaciente").doc(trilhaId).update(updateData);
      alert("Paciente encaminhado para PB com sucesso!");
      window.location.reload();
    } catch (error) {
      console.error("Erro ao encaminhar para PB:", error);
      alert("Erro ao salvar. Tente novamente.");
      saveButton.disabled = false;
      saveButton.textContent = "Salvar";
    }
  });

  return element;
}
