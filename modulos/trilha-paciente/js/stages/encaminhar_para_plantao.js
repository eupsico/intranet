/**
 * Renderiza o conteúdo do modal para a etapa "Encaminhar para Plantão".
 * @param {HTMLElement} modalBody - O corpo do modal onde o conteúdo será inserido.
 * @param {object} cardData - Os dados do card do paciente.
 * @param {object} db - A instância do Firestore.
 */
export function render(modalBody, cardData, db) {
  modalBody.innerHTML = `
        <h3 class="form-section-title">Dados do Paciente (Pós-Triagem)</h3>
        <div class="form-grid">
            <div class="form-group">
                <label>Nome do Paciente</label>
                <input type="text" class="form-control" value="${
                  cardData.nomeCompleto || ""
                }" disabled>
            </div>
            <div class="form-group">
                <label>Valor da Contribuição</label>
                <input type="text" class="form-control" value="${
                  cardData.valorContribuicao || "Aguardando triagem"
                }" disabled>
            </div>
            <div class="form-group">
                <label>Modalidade de Atendimento</label>
                <input type="text" class="form-control" value="${
                  cardData.modalidadeAtendimento || "Aguardando triagem"
                }" disabled>
            </div>
             <div class="form-group">
                <label>Prefere ser atendido</label>
                <input type="text" class="form-control" value="${
                  cardData.preferenciaAtendimento || "Aguardando triagem"
                }" disabled>
            </div>
        </div>
        
        <h3 class="form-section-title">Encaminhamento</h3>
        <div class="form-group">
            <label for="continua-terapia">Paciente deseja continuar com a terapia?</label>
            <select id="continua-terapia" class="form-control">
                <option value="">Selecione...</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
            </select>
        </div>
        
        <div id="motivo-nao-prosseguir-section" class="form-group hidden-section">
            <label for="motivo-nao-prosseguir">Motivo de não prosseguir:</label>
            <textarea id="motivo-nao-prosseguir" class="form-control"></textarea>
        </div>

        <div id="encaminhamento-plantao-section" class="hidden-section">
            <div class="form-grid">
                <div class="form-group">
                    <label for="profissional-plantao">Selecione o Profissional do Plantão</label>
                    <select id="profissional-plantao" class="form-control">
                        <option value="">Carregando...</option>
                    </select>
                </div>
                 <div class="form-group">
                    <label for="tipo-profissional">O profissional que irá atender é:</label>
                    <select id="tipo-profissional" class="form-control">
                        <option value="">Selecione...</option>
                        <option value="Estagiario">Estagiário(a)</option>
                        <option value="Voluntario">Voluntário(a)</option>
                    </select>
                </div>
                 <div class="form-group">
                    <label for="data-encaminhamento">Data do Encaminhamento</label>
                    <input type="date" id="data-encaminhamento" class="form-control">
                </div>
                <div class="form-group">
                    <label for="data-primeira-sessao">Data da Primeira Sessão</label>
                    <input type="date" id="data-primeira-sessao" class="form-control">
                </div>
                <div class="form-group">
                    <label for="hora-primeira-sessao">Horário da Primeira Sessão</label>
                    <input type="time" id="hora-primeira-sessao" class="form-control">
                </div>
                <div class="form-group">
                    <label for="atendimento-sera">O atendimento será:</label>
                    <select id="atendimento-sera" class="form-control">
                        <option value="">Selecione...</option>
                        <option value="Online">Online</option>
                        <option value="Presencial">Presencial</option>
                    </select>
                </div>
            </div>
             <div class="form-group">
                <label for="observacoes">Observações</label>
                <textarea id="observacoes" class="form-control" rows="3"></textarea>
            </div>
        </div>
    `;

  // Mostra o botão de salvar
  document.getElementById("modal-save-btn").style.display = "inline-block";

  setupEncaminhamentoListeners();
  loadProfissionais(db);
}

/**
 * Adiciona listeners para a lógica condicional da seção de encaminhamento.
 */
function setupEncaminhamentoListeners() {
  const continuaSelect = document.getElementById("continua-terapia");
  const motivoSection = document.getElementById(
    "motivo-nao-prosseguir-section"
  );
  const encaminhamentoSection = document.getElementById(
    "encaminhamento-plantao-section"
  );

  continuaSelect.addEventListener("change", () => {
    const value = continuaSelect.value;
    motivoSection.classList.toggle("hidden-section", value !== "nao");
    encaminhamentoSection.classList.toggle("hidden-section", value !== "sim");
  });
}

/**
 * Carrega a lista de profissionais com função de atendimento.
 * @param {object} db - A instância do Firestore.
 */
async function loadProfissionais(db) {
  const select = document.getElementById("profissional-plantao");
  try {
    const snapshot = await db
      .collection("usuarios")
      .where("funcoes", "array-contains", "atendimento")
      .where("inativo", "==", false)
      .get();

    select.innerHTML = '<option value="">Selecione...</option>';
    const profissionais = [];
    snapshot.forEach((doc) => {
      profissionais.push({ id: doc.id, nome: doc.data().nome });
    });

    profissionais.sort((a, b) => a.nome.localeCompare(b.nome));

    profissionais.forEach((prof) => {
      const option = document.createElement("option");
      option.value = prof.nome;
      option.textContent = prof.nome;
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Erro ao carregar profissionais:", error);
    select.innerHTML = '<option value="">Erro ao carregar</option>';
  }
}
