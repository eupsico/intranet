import { db } from "../../../../assets/js/firebase-init.js";
import { carregarProfissionais } from "../../../../assets/js/app.js";

/**
 * Renderiza o conteúdo do modal para a etapa "Em Atendimento (Plantão)".
 * @param {string} cardId - O ID do documento do paciente.
 * @param {string} cardTitle - O nome do paciente.
 * @returns {HTMLElement} O elemento HTML com o formulário completo e funcional.
 */
export async function render(cardId, cardTitle) {
  // Busca os dados mais recentes do paciente
  const docRef = db.collection("trilhaPaciente").doc(cardId);
  const doc = await docRef.get();
  const data = doc.exists ? doc.data() : {};

  // O HTML original que você forneceu foi mantido
  const content = `
    <div class="patient-info-box">
        <h4>Dados do Paciente</h4>
        <p><strong>Nome:</strong> ${data.nomeCompleto || "Não informado"}</p>
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
    <form id="plantao-form-atendimento">
        <div class="form-group">
            <label for="continua-terapia-atendimento">Paciente deseja continuar com a terapia?</label>
            <select id="continua-terapia-atendimento" required>
                <option value="">Selecione...</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
            </select>
        </div>

        <div id="motivo-desistencia-container-atendimento" class="form-group hidden">
            <label for="motivo-desistencia-plantao-atendimento">Motivo da desistência:</label>
            <textarea id="motivo-desistencia-plantao-atendimento" rows="3"></textarea>
        </div>

        <div id="continuacao-plantao-container-atendimento" class="hidden">
            <div class="form-group">
                <label for="profissional-plantao-atendimento">Selecione o nome profissional do Plantão:</label>
                <select id="profissional-plantao-atendimento"></select>
            </div>
            <div class="form-group">
                <label for="tipo-profissional-plantao-atendimento">O profissional que irá atender o paciente é:</label>
                <select id="tipo-profissional-plantao-atendimento">
                    <option value="">Selecione...</option>
                    <option value="Estagiária(o)">Estagiária(o)</option>
                    <option value="Voluntária(o)">Voluntária(o)</option>
                </select>
            </div>
            <div class="form-group">
                <label for="data-encaminhamento-plantao-atendimento">Data do encaminhamento para o Plantão:</label>
                <input type="date" id="data-encaminhamento-plantao-atendimento">
            </div>
            <div class="form-group">
                <label for="data-primeira-sessao-plantao-atendimento">Primeira sessão do Plantão agendada para o dia:</label>
                <input type="date" id="data-primeira-sessao-plantao-atendimento">
            </div>
            <div class="form-group">
                <label for="hora-primeira-sessao-plantao-atendimento">Primeira sessão do Plantão agendada para o horário:</label>
                <input type="time" id="hora-primeira-sessao-plantao-atendimento">
            </div>
            <div class="form-group">
                <label for="tipo-atendimento-plantao-atendimento">O atendimento será:</label>
                <select id="tipo-atendimento-plantao-atendimento">
                    <option value="">Selecione...</option>
                    <option value="Presencial">Presencial</option>
                    <option value="Online">Online</option>
                </select>
            </div>
            <div class="form-group">
                <label for="observacoes-plantao-atendimento">Observações:</label>
                <textarea id="observacoes-plantao-atendimento" rows="3"></textarea>
            </div>
        </div>
    </form>
  `;

  const element = document.createElement("div");
  element.innerHTML = content;

  // Lógica para mostrar/esconder campos
  const continuaTerapiaSelect = element.querySelector(
    "#continua-terapia-atendimento"
  );
  const motivoContainer = element.querySelector(
    "#motivo-desistencia-container-atendimento"
  );
  const continuacaoContainer = element.querySelector(
    "#continuacao-plantao-container-atendimento"
  );

  continuaTerapiaSelect.addEventListener("change", () => {
    const selection = continuaTerapiaSelect.value;
    continuacaoContainer.classList.toggle("hidden", selection !== "sim");
    motivoContainer.classList.toggle("hidden", selection !== "nao");
  });

  // Carrega profissionais
  await carregarProfissionais(
    db,
    "atendimento",
    element.querySelector("#profissional-plantao-atendimento")
  );

  return element;
}

/**
 * Salva os dados do formulário da etapa "Em Atendimento (Plantão)".
 * @param {string} cardId - O ID do documento do paciente a ser atualizado.
 */
export async function save(cardId) {
  const continua = document.getElementById(
    "continua-terapia-atendimento"
  ).value;

  if (continua === "nao") {
    const motivo = document.getElementById(
      "motivo-desistencia-plantao-atendimento"
    ).value;
    if (!motivo) {
      throw new Error("Por favor, informe o motivo da desistência.");
    }
    await db
      .collection("trilhaPaciente")
      .doc(cardId)
      .update({
        status: "desistencia",
        desistenciaMotivo: `Desistiu no plantão. Motivo: ${motivo}`,
        profissionalAtualId: firebase.firestore.FieldValue.delete(),
        lastUpdate: new Date(),
      });
  } else if (continua === "sim") {
    const profissionalSelect = document.getElementById(
      "profissional-plantao-atendimento"
    );
    const profissionalId = profissionalSelect.value;
    const profissionalNome =
      profissionalSelect.options[profissionalSelect.selectedIndex].text;

    if (!profissionalId) {
      throw new Error("Por favor, selecione um profissional.");
    }

    const updateData = {
      status: "em_atendimento_plantao",
      profissionalAtualId: profissionalId,
      "plantaoInfo.profissionalId": profissionalId,
      "plantaoInfo.profissionalNome": profissionalNome,
      "plantaoInfo.tipoProfissional": document.getElementById(
        "tipo-profissional-plantao-atendimento"
      ).value,
      "plantaoInfo.dataEncaminhamento": document.getElementById(
        "data-encaminhamento-plantao-atendimento"
      ).value,
      "plantaoInfo.dataPrimeiraSessao": document.getElementById(
        "data-primeira-sessao-plantao-atendimento"
      ).value,
      "plantaoInfo.horaPrimeiraSessao": document.getElementById(
        "hora-primeira-sessao-plantao-atendimento"
      ).value,
      "plantaoInfo.tipoAtendimento": document.getElementById(
        "tipo-atendimento-plantao-atendimento"
      ).value,
      "plantaoInfo.observacoes": document.getElementById(
        "observacoes-plantao-atendimento"
      ).value,
      lastUpdate: new Date(),
    };
    await db.collection("trilhaPaciente").doc(cardId).update(updateData);
  } else {
    throw new Error(
      "Por favor, selecione se o paciente deseja continuar com a terapia."
    );
  }
}
