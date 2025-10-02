import { db } from "../../../../assets/js/firebase-init.js";
import { carregarProfissionais } from "../../../../assets/js/app.js";

/**
 * Renderiza o conteúdo do modal para a etapa "Encaminhar para Plantão".
 * @param {string} cardId - O ID do documento do paciente na coleção 'trilhaPaciente'.
 * @param {object} cardData - Os dados do card do paciente.
 * @returns {HTMLElement} O elemento HTML com o formulário.
 */
export async function render(cardId, cardTitle) {
  // 1. Busca os dados mais recentes do paciente para garantir que estão atualizados.
  const docRef = db.collection("trilhaPaciente").doc(cardId);
  const doc = await docRef.get();
  if (!doc.exists) {
    const errorElement = document.createElement("div");
    errorElement.textContent = "Erro: Paciente não encontrado.";
    return errorElement;
  }
  const data = doc.data();

  // 2. Monta o HTML do formulário como uma string.
  const content = `
        <h3 class="form-section-title">Dados do Paciente (Pós-Triagem)</h3>
        <div class="form-grid">
            <div class="form-group">
                <label>Nome do Paciente</label>
                <input type="text" class="form-control" value="${
                  data.nomeCompleto || ""
                }" disabled>
            </div>
            <div class="form-group">
                <label>Valor da Contribuição</label>
                <input type="text" class="form-control" value="${
                  data.valorContribuicao || "Aguardando triagem"
                }" disabled>
            </div>
            <div class="form-group">
                <label>Modalidade de Atendimento</label>
                <input type="text" class="form-control" value="${
                  data.modalidadeAtendimento || "Aguardando triagem"
                }" disabled>
            </div>
             <div class="form-group">
                <label>Prefere ser atendido por</label>
                <input type="text" class="form-control" value="${
                  data.preferenciaAtendimento || "Aguardando triagem"
                }" disabled>
            </div>
        </div>
        
        <h3 class="form-section-title">Encaminhamento</h3>
        <div class="form-group">
            <label for="profissional-plantao">Selecione o Profissional do Plantão*</label>
            <select id="profissional-plantao" class="form-control" required>
                <option value="">Carregando...</option>
            </select>
        </div>
        <div class="form-group">
            <label for="tipo-atendimento-plantao">O atendimento será:*</label>
            <select id="tipo-atendimento-plantao" class="form-control" required>
                <option value="">Selecione...</option>
                <option value="Online">Online</option>
                <option value="Presencial">Presencial</option>
            </select>
        </div>
        <div class="form-group">
            <label for="observacoes-plantao">Observações</label>
            <textarea id="observacoes-plantao" class="form-control" rows="3"></textarea>
        </div>
    `;

  // 3. Cria um elemento <div> e insere a string HTML nele.
  const element = document.createElement("div");
  element.innerHTML = content;

  // 4. Carrega a lista de profissionais no select que acabamos de criar.
  const selectProfissionais = element.querySelector("#profissional-plantao");
  await carregarProfissionais(db, "atendimento", selectProfissionais);

  // 5. Retorna o ELEMENTO HTML, não mais a string.
  return element;
}

/**
 * Salva os dados do formulário "Encaminhar para Plantão".
 * @param {string} cardId - O ID do documento do paciente a ser atualizado.
 */
export async function save(cardId) {
  const profissionalSelect = document.getElementById("profissional-plantao");
  const profissionalId = profissionalSelect.value;
  const profissionalNome =
    profissionalSelect.options[profissionalSelect.selectedIndex].text;
  const tipoAtendimento = document.getElementById(
    "tipo-atendimento-plantao"
  ).value;
  const observacoes = document.getElementById("observacoes-plantao").value;

  if (!profissionalId || !tipoAtendimento) {
    throw new Error(
      "Por favor, selecione um profissional e o tipo de atendimento."
    );
  }

  const updateData = {
    status: "em_atendimento_plantao",
    profissionalAtualId: profissionalId, // Adiciona o campo para a busca em "Meus Pacientes"
    "plantaoInfo.profissionalId": profissionalId,
    "plantaoInfo.profissionalNome": profissionalNome,
    "plantaoInfo.dataEncaminhamento": new Date().toISOString().split("T")[0],
    "plantaoInfo.tipoAtendimento": tipoAtendimento,
    "plantaoInfo.observacoes": observacoes,
    lastUpdate: new Date(),
  };

  await db.collection("trilhaPaciente").doc(cardId).update(updateData);
}
