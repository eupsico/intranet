import { db, firebase } from "../../../../assets/js/firebase-config.js"; // Importa 'firebase' para usar FieldValue
import { carregarProfissionais } from "../../../../assets/js/app.js";

/**
 * Renderiza o conteúdo do modal para a etapa 'Encaminhar para PB'.
 * (Esta função não foi alterada)
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
  const data = doc.data(); // 2. Monta o HTML do formulário

  const content = `
        <div class="patient-info-box">
            <h4>Adicionar Atendimento de Psicoterapia Breve (PB)</h4>
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
                <label for="continua-terapia-pb">Paciente deseja iniciar/continuar com a terapia?</label>
                <select id="continua-terapia-pb" required>
                    <option value="">Selecione...</option>
                    <option value="sim">Sim</option>
                    <option value="nao">Não (Desistência)</option>
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
  element.innerHTML = content; // 3. Adiciona a lógica interna do formulário

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
  }); // Carrega a lista de profissionais no dropdown

  carregarProfissionais(
    db,
    "atendimento",
    element.querySelector("#profissional-pb")
  );

  return element;
}

/**
 * Salva os dados do formulário, adicionando um novo atendimento de PB.
 * @param {string} cardId - O ID do documento do paciente a ser atualizado.
 */
export async function save(cardId, cardData, modalBody) {
  const continua = document.getElementById("continua-terapia-pb").value;
  const FieldValue = firebase.firestore.FieldValue;

  if (continua === "nao") {
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
    // A lógica agora adiciona um atendimento a uma lista (array)

    const profissionalSelect = document.getElementById("profissional-pb");
    const profissionalId = profissionalSelect.value;
    const profissionalNome =
      profissionalSelect.options[profissionalSelect.selectedIndex].text;

    if (!profissionalId) {
      throw new Error(
        "Por favor, selecione um profissional para o encaminhamento."
      );
    }

    // 1. Cria um objeto para o NOVO atendimento
    const novoAtendimento = {
      atendimentoId:
        new Date().getTime().toString() +
        Math.random().toString(36).substring(2, 9), // Gera um ID único
      statusAtendimento: "ativo", // Define o status inicial deste atendimento
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
      // O campo 'horarioSessao' será preenchido pelo profissional na próxima etapa
    }; // 2. Monta o objeto de atualização usando 'arrayUnion' para adicionar à lista

    const updateData = {
      status: "aguardando_info_horarios", // Move o paciente para a próxima fase geral
      // Adiciona o novo objeto à lista 'atendimentosPB'
      atendimentosPB: FieldValue.arrayUnion(novoAtendimento),
      // Adiciona o ID do profissional a uma lista de busca rápida
      profissionaisPB_ids: FieldValue.arrayUnion(profissionalId),
      // Remove o campo antigo para manter os dados limpos
      pbInfo: FieldValue.delete(),
      lastUpdate: new Date(),
    }; // 3. Atualiza o documento do paciente

    try {
      await db.collection("trilhaPaciente").doc(cardId).update(updateData);
      console.log("Novo atendimento de PB adicionado com sucesso!");
    } catch (error) {
      console.error("Erro ao adicionar novo atendimento de PB:", error);
      throw new Error("Ocorreu um erro ao salvar os dados. Tente novamente.");
    } // --- FIM DA ALTERAÇÃO ---
  } else {
    throw new Error(
      "Por favor, selecione se o paciente deseja continuar com a terapia."
    );
  }
}
