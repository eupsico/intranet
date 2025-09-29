// Arquivo: modulos/trilha-paciente/js/stages/1-inscricao-documentos.js

let assistentesSociais = [];

async function fetchDependencies(context) {
  if (assistentesSociais.length > 0) return;
  try {
    const snapshot = await context.db
      .collection("usuarios")
      .where("funcoes", "array-contains", "servico_social")
      .where("inativo", "==", false)
      .get();
    assistentesSociais = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Erro ao buscar assistentes sociais:", error);
  }
}

export async function render(cardData, modalContent, context) {
  await fetchDependencies(context);
  const responsavelInfo =
    cardData.responsavel && cardData.responsavel.nome
      ? `<strong>Responsável:</strong> ${cardData.responsavel.nome}<br>`
      : "";

  modalContent.innerHTML = `
        <div class="info-copy-box">
            <h4>Preciso que você me confirme se os dados do paciente estão corretos:</h4>
            <p>
                <strong>Nome:</strong> ${cardData.nomeCompleto}<br>
                <strong>Data de nascimento:</strong> ${new Date(
                  cardData.dataNascimento + "T00:00:00"
                ).toLocaleDateString("pt-BR")}<br>
                ${responsavelInfo}
                <strong>Telefone de contato:</strong> ${
                  cardData.telefoneCelular
                }<br>
                <strong>CPF:</strong> ${cardData.cpf}<br>
                <strong>E-mail:</strong> ${cardData.email}
            </p>
        </div>
        <h4>Checklist para agendar triagem:</h4>
        <form id="form-etapa1">
            <div class="form-group">
                <label><input type="checkbox" id="chk-dados" required> Confirmou os dados</label>
            </div>
            <div class="form-group">
                <label><input type="checkbox" id="chk-pagamento" required> Efetuou o pagamento</label>
            </div>
            <div class="form-group">
                 <label><input type="checkbox" id="chk-isento"> Isento da triagem</label>
            </div>
            <div id="motivo-isencao-container" class="form-group" style="display:none;">
                <label for="motivo-isencao">Informe o motivo da isenção:</label>
                <textarea id="motivo-isencao" class="form-control"></textarea>
            </div>
            <div class="form-group">
                <label><input type="checkbox" id="chk-desistiu"> Desistiu</label>
            </div>
             <div id="motivo-desistencia-container" class="form-group" style="display:none;">
                <label for="motivo-desistencia">Informe o motivo da desistência:</label>
                <textarea id="motivo-desistencia" class="form-control"></textarea>
            </div>
            <hr>
            <div id="triagem-fields">
                <div class="form-group">
                    <label>Enviou os documentos (RG, CPF, Comp. Endereço, Comp. Renda):</label>
                    <p style="font-size: 0.8em; color: #666;">Funcionalidade de upload em desenvolvimento.</p>
                    <div class="upload-area">
                        <input type="file" id="doc-upload" multiple disabled>
                        <div id="file-list"></div>
                    </div>
                </div>
                 <div class="form-group">
                    <label><input type="checkbox" id="chk-drive" required> Criar Pasta no Drive do serviço social</label>
                </div>
                <div class="form-group">
                    <label for="assistente-social">Nome Assistente Social:</label>
                    <select id="assistente-social" class="form-control" required></select>
                </div>
                <div class="form-group">
                    <label for="assistente-email">E-mail Assistente Social:</label>
                    <input type="email" id="assistente-email" class="form-control" readonly>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="tipo-triagem">Tipo de triagem:</label>
                        <select id="tipo-triagem" class="form-control" required>
                            <option value="Online">Online</option>
                            <option value="Presencial">Presencial</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="data-triagem">Data da triagem:</label>
                        <input type="date" id="data-triagem" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="hora-triagem">Horário da triagem:</label>
                        <input type="time" id="hora-triagem" class="form-control" required>
                    </div>
                </div>
            </div>
            <div class="button-bar">
                <button type="submit" class="action-button">Salvar e Mover</button>
            </div>
        </form>
    `;

  const selectAssistente = modalContent.querySelector("#assistente-social");
  selectAssistente.innerHTML = '<option value="">Selecione...</option>';
  assistentesSociais.forEach((as) => {
    selectAssistente.innerHTML += `<option value="${as.id}">${as.nome}</option>`;
  });
}

export function initListeners(cardData, modalContent, context) {
  const form = modalContent.querySelector("#form-etapa1");
  const chkIsento = form.querySelector("#chk-isento");
  const chkDesistiu = form.querySelector("#chk-desistiu");
  const motivoIsencaoContainer = form.querySelector(
    "#motivo-isencao-container"
  );
  const motivoDesistenciaContainer = form.querySelector(
    "#motivo-desistencia-container"
  );
  const triagemFields = form.querySelector("#triagem-fields");
  const selectAssistente = form.querySelector("#assistente-social");
  const emailAssistenteInput = form.querySelector("#assistente-email");

  chkIsento.addEventListener("change", (e) => {
    motivoIsencaoContainer.style.display = e.target.checked ? "block" : "none";
  });

  chkDesistiu.addEventListener("change", (e) => {
    const isChecked = e.target.checked;
    motivoDesistenciaContainer.style.display = isChecked ? "block" : "none";
    triagemFields.style.display = isChecked ? "none" : "block";
    triagemFields.querySelectorAll("input, select").forEach((el) => {
      if (el.type !== "checkbox") el.required = !isChecked;
    });
  });

  selectAssistente.addEventListener("change", () => {
    const selectedId = selectAssistente.value;
    const assistente = assistentesSociais.find((as) => as.id === selectedId);
    emailAssistenteInput.value = assistente ? assistente.email : "";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const desistiu = chkDesistiu.checked;

    if (desistiu) {
      const motivo = motivoDesistenciaContainer.querySelector(
        "#motivo-desistencia"
      ).value;
      if (!motivo) {
        alert("Por favor, informe o motivo da desistência.");
        return;
      }
      await context.updateCard(cardData.id, {
        status: "desistencia",
        motivoDesistencia: motivo,
      });
    } else {
      if (!form.checkValidity()) {
        alert("Por favor, preencha todos os campos obrigatórios.");
        form.reportValidity();
        return;
      }
      const isento = chkIsento.checked;
      const motivoIsencao =
        motivoIsencaoContainer.querySelector("#motivo-isencao").value;
      if (isento && !motivoIsencao) {
        alert("Por favor, informe o motivo da isenção.");
        return;
      }

      const dataToSave = {
        status: "triagem_agendada",
        dadosConfirmados: form.querySelector("#chk-dados").checked,
        pagamentoEfetuado: form.querySelector("#chk-pagamento").checked,
        isentoTriagem: isento,
        motivoIsencao: motivoIsencao,
        pastaDriveCriada: form.querySelector("#chk-drive").checked,
        assistenteSocialId: selectAssistente.value,
        assistenteSocialNome:
          selectAssistente.options[selectAssistente.selectedIndex].text,
        tipoTriagem: form.querySelector("#tipo-triagem").value,
        dataTriagem: form.querySelector("#data-triagem").value,
        horaTriagem: form.querySelector("#hora-triagem").value,
      };
      await context.updateCard(cardData.id, dataToSave);
    }
  });
}
