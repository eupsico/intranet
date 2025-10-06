import { db } from "../../../../assets/js/firebase-config.js";
import { carregarProfissionais } from "../../../../assets/js/app.js";

/**
 * Renderiza o conteúdo do modal para a etapa 'Encaminhar para PB'.
 * @param {string} cardId - O ID do documento do paciente na coleção 'trilhaPaciente'.
 * @param {string} cardTitle - O título do card (nome do paciente).
 * @returns {HTMLElement} O elemento HTML com o formulário.
 */
export async function render(cardId, cardTitle) {
  // 1. Busca os dados mais recentes do paciente
  const docRef = db.collection("trilhaPaciente").doc(cardId);
  const doc = await docRef.get();
  if (!doc.exists) {
    console.error("Documento do paciente não encontrado!");
    return (document.createElement("div").textContent =
      "Erro: Paciente não encontrado.");
  }
  const data = doc.data();

  // 2. Monta o HTML do formulário
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
              data.disponibilidadeGeral?.join(", ") || "Não informado"
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
        </form>
    `;

  const element = document.createElement("div");
  element.innerHTML = content;

  // 3. Adiciona a lógica interna do formulário
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

  // Carrega a lista de profissionais no dropdown
  carregarProfissionais(
    db,
    "atendimento",
    element.querySelector("#profissional-pb")
  );

  return element;
}

/**
 * Salva os dados do formulário 'Encaminhar para PB' diretamente no Firestore,
 * sem usar uma Cloud Function.
 * @param {string} cardId - O ID do documento do paciente a ser atualizado.
 */
export async function save(cardId, cardData, modalBody) {
  // Captura a decisão inicial do paciente
  const continua = document.getElementById("continua-terapia-pb").value;

  if (continua === "nao") {
    // Se o paciente desistiu, atualiza o status para "desistencia"
    const updateData = {
      status: "desistencia",
      desistenciaMotivo: `Desistiu antes do PB. Motivo: ${
        document.getElementById("motivo-desistencia-pb").value
      }`,
      lastUpdate: new Date(),
    };
    await db.collection("trilhaPaciente").doc(cardId).update(updateData);
  } else if (continua === "sim") {
    // --- INÍCIO DA ALTERAÇÃO ---

    // 1. Coleta todos os dados do formulário de encaminhamento
    const profissionalSelect = document.getElementById("profissional-pb");
    const profissionalId = profissionalSelect.value;
    const profissionalNome =
      profissionalSelect.options[profissionalSelect.selectedIndex].text;

    const pbData = {
      profissionalId: profissionalId,
      profissionalNome: profissionalNome,
      tipoProfissional: document.getElementById("tipo-profissional-pb").value,
      dataEncaminhamento: document.getElementById("data-encaminhamento-pb")
        .value,
      dataPrimeiraSessao: document.getElementById("data-primeira-sessao-pb")
        .value,
      horaPrimeiraSessao: document.getElementById("hora-primeira-sessao-pb")
        .value,
      tipoAtendimento: document.getElementById("tipo-atendimento-pb").value,
      observacoes: document.getElementById("observacoes-pb").value,
    };

    // 2. Validação para garantir que um profissional foi selecionado
    if (!pbData.profissionalId) {
      throw new Error(
        "Por favor, selecione um profissional para o encaminhamento."
      );
    }

    // 3. Monta o objeto de atualização para o Firestore
    const updateData = {
      status: "aguardando_info_horarios", // Define o próximo status da trilha
      pbInfo: pbData, // Adiciona o objeto com todas as informações do encaminhamento
      lastUpdate: new Date(),
    };

    // 4. Atualiza o documento do paciente diretamente
    try {
      await db.collection("trilhaPaciente").doc(cardId).update(updateData);
      console.log(
        "Paciente encaminhado para PB com sucesso (direto do frontend)!"
      );
    } catch (error) {
      console.error("Erro ao atualizar o paciente para PB:", error);
      // Propaga o erro para que o painel exiba a mensagem de falha
      throw new Error("Ocorreu um erro ao salvar os dados. Tente novamente.");
    }
    // --- FIM DA ALTERAÇÃO ---
  } else {
    // Se nenhuma opção for selecionada, lança um erro para o usuário
    throw new Error(
      "Por favor, selecione se o paciente deseja continuar com a terapia."
    );
  }
}
