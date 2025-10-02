export function setupCadastrarHorarioPsicomanager(
  db,
  functions,
  trilhaId,
  data
) {
  const pbInfo = data.pbInfo || {};
  const horarioInfo = pbInfo.horarioSessao || {};

  const content = `
        <div class="patient-info-box confirmation">
            <h4>Cadastrar Horários na Psicomanager</h4>
            <p><strong>Nome Paciente:</strong> ${
              data.nomeCompleto || "Não informado"
            }</p>
            <p><strong>Nome Profissional:</strong> ${
              pbInfo.profissionalNome || "Não informado"
            }</p>
            <p><strong>Dia e Horário da Sessão:</strong> ${
              horarioInfo.diaSemana || ""
            } às ${horarioInfo.horario || ""}</p>
            <p><strong>Tipo de Atendimento:</strong> ${
              horarioInfo.tipoAtendimento || ""
            }</p>
            <p><strong>Cadastrar a partir de:</strong> ${
              horarioInfo.dataInicio
                ? new Date(
                    horarioInfo.dataInicio + "T00:00:00"
                  ).toLocaleDateString("pt-BR")
                : ""
            }</p>
            <p><strong>Será preciso alterar Grade:</strong> ${
              horarioInfo.alterarGrade || ""
            }</p>
            <p><strong>Sala de Atendimento:</strong> ${
              horarioInfo.salaAtendimento || ""
            }</p>
            <p><strong>Contribuição:</strong> ${
              data.valorContribuicao || "Não informado"
            }</p>
        </div>
        <form id="psicomanager-form">
            <div class="form-group">
                <label for="data-cadastro-psicomanager">Informe a data que foi cadastrado na Psicomanager:</label>
                <input type="date" id="data-cadastro-psicomanager" required>
            </div>
            <button type="submit" class="save-btn">Finalizar</button>
        </form>
    `;
  const element = document.createElement("div");
  element.innerHTML = content;

  const form = element.querySelector("#psicomanager-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const saveButton = form.querySelector(".save-btn");
    saveButton.disabled = true;
    saveButton.textContent = "Salvando...";

    try {
      const dataCadastro = element.querySelector(
        "#data-cadastro-psicomanager"
      ).value;
      const updateData = {
        status: "finalizado", // ou outro status final
        "pbInfo.dataCadastroPsicomanager": dataCadastro,
        lastUpdate: new Date(),
      };

      await db.collection("trilhaPaciente").doc(trilhaId).update(updateData);
      alert("Cadastro na Psicomanager registrado com sucesso!");
      window.location.reload();
    } catch (error) {
      console.error("Erro ao registrar cadastro na Psicomanager:", error);
      alert("Erro ao salvar. Tente novamente.");
      saveButton.disabled = false;
      saveButton.textContent = "Finalizar";
    }
  });

  return element;
}
