export function init(db, user, userData) {
    const container = document.getElementById('perfil-container');
    const actionsContainer = document.getElementById('perfil-actions');
    
    if (!container || !actionsContainer) return;

    let userDocRef;
    let originalData = {}; // Guarda os dados originais para o cancelamento

    /**
     * Alterna o estado dos campos do formulário (habilitado/desabilitado).
     */
    function toggleFormState(enabled) {
        const inputs = container.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            // Não altera o estado de campos que devem ser sempre somente leitura
            if (!input.classList.contains('always-readonly')) {
                input.readOnly = !enabled;
            }
        });

        // Atualiza os botões visíveis
        actionsContainer.innerHTML = enabled
            ? `
                <button id="btn-cancelar-edicao" class="btn btn-secondary">Cancelar</button>
                <button id="btn-salvar-perfil" class="btn btn-primary">Salvar Alterações</button>
              `
            : `
                <button id="btn-editar-perfil" class="btn btn-primary">Editar Perfil</button>
              `;

        attachActionListeners();
    }

    /**
     * Carrega os dados do perfil do usuário e monta o formulário.
     */
    async function carregarPerfil() {
        try {
            container.innerHTML = '<div class="loading-spinner"></div>';
            
            if (!user || !user.uid) throw new Error("UID do usuário não encontrado.");

            userDocRef = db.collection('usuarios').doc(user.uid);
            const doc = await userDocRef.get();

            if (!doc.exists) throw new Error("Dados do usuário não encontrados no Firestore.");

            originalData = doc.data();
            renderForm(originalData);
            toggleFormState(false); // Inicia com os campos desabilitados

        } catch (error) {
            console.error("Erro ao carregar perfil:", error);
            container.innerHTML = `<p class="alert alert-error">Não foi possível carregar os dados do seu perfil.</p>`;
        }
    }
    
    /**
     * Renderiza o HTML do formulário com os dados.
     */
    function renderForm(data) {
        container.innerHTML = `
            <div class="form-group">
                <label for="nome-completo">Nome Completo *</label>
                <input type="text" id="nome-completo" value="${data.nome || ''}" readonly>
            </div>
            <div class="form-group">
                <label for="telefone">Telefone *</label>
                <input type="tel" id="telefone" value="${data.telefone || ''}" readonly>
            </div>
            <div class="form-group" style="grid-column: 1 / -1;">
                <label for="endereco">Endereço</label>
                <input type="text" id="endereco" value="${data.endereco || ''}" readonly>
            </div>
            <div class="form-group">
                <label for="profissao">Profissão</label>
                <input type="text" id="profissao" value="${data.profissao || ''}" readonly>
            </div>
             <div class="form-group">
                <label for="funcao">Função na EuPsico</label>
                <input type="text" id="funcao" class="always-readonly" value="${Array.isArray(data.funcoes) ? data.funcoes.join(', ') : 'Não informado'}" readonly>
            </div>
            <div class="form-group">
                <label for="cpf">CPF</label>
                <input type="text" id="cpf" class="always-readonly" value="${data.cpf || 'Não informado'}" readonly>
            </div>
            <div class="form-group">
                <label for="rg">RG</label>
                <input type="text" id="rg" class="always-readonly" value="${data.rg || 'Não informado'}" readonly>
            </div>
            <div class="form-group" style="grid-column: 1 / -1;">
                <label for="especializacoes">Especializações (separadas por vírgula)</label>
                <textarea id="especializacoes" readonly>${Array.isArray(data.especializacoes) ? data.especializacoes.join(', ') : ''}</textarea>
            </div>
            <div class="form-group">
                <label for="data-inicio">Data de Início na EuPsico</label>
                <input type="text" id="data-inicio" class="always-readonly" value="${data.dataInicio || 'Não informada'}" readonly>
            </div>
        `;
    }

    /**
     * Salva os dados atualizados do perfil no Firestore.
     */
    async function salvarPerfil() {
        if (!userDocRef) return;

        const nome = document.getElementById('nome-completo').value;
        const telefone = document.getElementById('telefone').value;
        if (!nome || !telefone) {
            alert("Nome Completo e Telefone são obrigatórios.");
            return;
        }

        const especializacoesRaw = document.getElementById('especializacoes').value;
        const dadosParaAtualizar = {
            nome: nome,
            telefone: telefone,
            endereco: document.getElementById('endereco').value,
            profissao: document.getElementById('profissao').value,
            especializacoes: especializacoesRaw.split(',').map(s => s.trim()).filter(Boolean)
        };
        
        const saveButton = document.getElementById('btn-salvar-perfil');
        saveButton.disabled = true;
        saveButton.textContent = 'Salvando...';

        try {
            await userDocRef.update(dadosParaAtualizar);
            originalData = {...originalData, ...dadosParaAtualizar}; // Atualiza os dados locais
            alert("Perfil atualizado com sucesso!");
        } catch (error) {
            console.error("Erro ao salvar o perfil:", error);
            alert("Ocorreu um erro ao salvar seu perfil.");
        } finally {
            toggleFormState(false); // Volta ao estado de visualização
        }
    }

    /**
     * Adiciona os listeners aos botões de ação (Editar, Salvar, Cancelar).
     */
    function attachActionListeners() {
        const editButton = document.getElementById('btn-editar-perfil');
        const saveButton = document.getElementById('btn-salvar-perfil');
        const cancelButton = document.getElementById('btn-cancelar-edicao');

        if (editButton) {
            editButton.addEventListener('click', () => toggleFormState(true));
        }
        if (saveButton) {
            saveButton.addEventListener('click', salvarPerfil);
        }
        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                renderForm(originalData); // Restaura os dados originais
                toggleFormState(false);
            });
        }
    }

    // --- INICIALIZAÇÃO ---
    carregarPerfil();
}