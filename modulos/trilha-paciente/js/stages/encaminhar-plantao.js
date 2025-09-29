// Arquivo: modulos/trilha-paciente/js/stages/3-encaminhar-plantao.js

let profissionaisAtendimento = [];

async function fetchDependencies(context) {
  if (profissionaisAtendimento.length > 0) return;
  try {
    const snapshot = await context.db
      .collection("usuarios")
      .where("funcoes", "array-contains", "atendimento")
      .where("inativo", "==", false)
      .get();
    profissionaisAtendimento = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Erro ao buscar profissionais de atendimento:", error);
  }
}

export async function render(cardData, modalContent, context) {
  await fetchDependencies(context);

  const valorContribuicao = cardData.valorContribuicao || "Aguardando Ficha";
  const disponibilidadeTriagem =
    cardData.disponibilidadeTriagem || "Aguardando Ficha";
  const modalidadeAtendimento =
    cardData.modalidadeAtendimento || "Aguardando Ficha";
  const preferenciaAtendimento =
    cardData.preferenciaAtendimento || "Aguardando Ficha";

  modalContent.innerHTML = `
        <div class="info-copy-box">
            <h4>Dados do Paciente (pós-triagem):</h4>
            <p>
                <strong>Nome:</strong> ${cardData.nomeCompleto}<br>
                <strong>Valor da Contribuição:</strong> ${valorContribuicao}<br>
                <strong>Disponibilidade (Ficha Inscrição):</strong> ${(
                  cardData.disponibilidadeGeral || []
                ).join(", ")}<br>
                <strong>Disponibilidade (Assistente Social):</strong> ${disponibilidadeTriagem}<br>
                <strong>Modalidade de Atendimento:</strong> ${modalidadeAtendimento}<br>
                <strong>Preferência de Atendimento:</strong> ${preferenciaAtendimento}
            </p>
        </div>

        <form id="form-etapa3">
            <div class="form-group">
                <label for="continua-terapia">Selecione abaixo se paciente deseja continuar com a terapia:</label>
                <select id="continua-terapia" class="form-control" required>
                    <option value="">Selecione...</option>
                    <option value="sim">Sim</option>
                    <option value="nao">Não</option>
                </select>
            </div>

            <div id="motivo-nao-prosseguir-container" class="form-group" style="display:none;">
                <label for="motivo-nao-prosseguir">Motivo de não prosseguir:</label>
                <textarea id="motivo-nao-prosseguir" class="form-control"></textarea>
            </div>

            <div id="campos-encaminhamento" style="display:none;">
                <div class="form-row">
                    <div class="form-group">
                        <label for="plantao-profissional">Selecione o nome profissional do Plantão:</label>
                        <select id="plantao-profissional" class="form-control" required></select>
                    </div>
                    <div class="form-group">
                        <label for="plantao-tipo-profissional">O profissional que irá atender o paciente é:</label>
                        <select id="plantao-tipo-profissional" class="form-control" required>
                            <option value="Estagiario">Estagiário</option>
                            <option value="Voluntario">Voluntário</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="data-encaminhamento">Data do encaminhamento para o Plantão:</label>
                        <input type="date" id="data-encaminhamento" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="data-primeira-sessao">Data da primeira sessão:</label>
                        <input type="date" id="data-primeira-sessao" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="hora-primeira-sessao">Horário da primeira sessão:</label>
                        <input type="time" id="hora-primeira-sessao" class="form-control" required>
                    </div>
                </div>
                 <div class="form-group">
                    <label for="atendimento-sera">O atendimento será:</label>
                    <select id="atendimento-sera" class="form-control" required>
                        <option value="Online">Online</option>
                        <option value="Presencial">Presencial</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="observacoes">Observações:</label>
                    <textarea id="observacoes" class="form-control"></textarea>
                </div>
            </div>

            <div class="button-bar">
                <button type="submit" class="action-button">Salvar e Mover</button>
            </div>
        </form>
    `;

  const selectProfissional = modalContent.querySelector(
    "#plantao-profissional"
  );
  selectProfissional.innerHTML = '<option value="">Selecione...</option>';
  profissionaisAtendimento.forEach((p) => {
    selectProfissional.innerHTML += `<option value="${p.id}">${p.nome}</option>`;
  });
}

export function initListeners(cardData, modalContent, context) {
  const form = modalContent.querySelector("#form-etapa3");
  const continuaTerapiaSelect = form.querySelector("#continua-terapia");
  const motivoNaoProsseguirContainer = form.querySelector(
    "#motivo-nao-prosseguir-container"
  );
  const camposEncaminhamento = form.querySelector("#campos-encaminhamento");

  continuaTerapiaSelect.addEventListener("change", () => {
    const continua = continuaTerapiaSelect.value === "sim";
    camposEncaminhamento.style.display = continua ? "block" : "none";
    motivoNaoProsseguirContainer.style.display =
      !continua && continuaTerapiaSelect.value !== "" ? "block" : "none";

    camposEncaminhamento
      .querySelectorAll("input, select")
      .forEach((el) => (el.required = continua));
    motivoNaoProsseguirContainer.querySelector("textarea").required = !continua;
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      form.reportValidity();
      return;
    }

    const querContinuar =
      form.querySelector("#continua-terapia").value === "sim";
    let dataToSave;

    if (querContinuar) {
      dataToSave = {
        status: "em_atendimento_plantao",
        continuaTerapia: true,
        plantaoProfissionalId: form.querySelector("#plantao-profissional")
          .value,
        plantaoProfissionalNome: form.querySelector("#plantao-profissional")
          .options[form.querySelector("#plantao-profissional").selectedIndex]
          .text,
        plantaoTipoProfissional: form.querySelector(
          "#plantao-tipo-profissional"
        ).value,
        dataEncaminhamentoPlantao: form.querySelector("#data-encaminhamento")
          .value,
        dataPrimeiraSessao: form.querySelector("#data-primeira-sessao").value,
        horaPrimeiraSessao: form.querySelector("#hora-primeira-sessao").value,
        plantaoTipoAtendimento: form.querySelector("#atendimento-sera").value,
        plantaoObservacoes: form.querySelector("#observacoes").value,
      };
    } else {
      dataToSave = {
        status: "desistencia",
        continuaTerapia: false,
        motivoNaoProsseguiu: form.querySelector("#motivo-nao-prosseguir").value,
      };
    }

    await context.updateCard(cardData.id, dataToSave);
  });
}
