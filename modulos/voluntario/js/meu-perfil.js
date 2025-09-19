export function init(db, user, userData) {
    const container = document.getElementById('perfil-container');
    const actionsContainer = document.getElementById('perfil-actions');
    
    if (!container || !actionsContainer) return;

    let userDocRef;
    let originalData = {};

    /**
     * Função para validar CPF.
     * Retorna true se o CPF for válido, false caso contrário.
     */
    function validarCPF(cpf) {
        cpf = cpf.replace(/[^\d]+/g,'');
        if(cpf == '') return false;
        // Elimina CPFs invalidos conhecidos
        if (cpf.length != 11 ||
            cpf == "00000000000" ||
            cpf == "11111111111" ||
            cpf == "22222222222" ||
            cpf == "33333333333" ||
            cpf == "44444444444" ||
            cpf == "55555555555" ||
            cpf == "66666666666" ||
            cpf == "77777777777" ||
            cpf == "88888888888" ||
            cpf == "99999999999")
                return false;
        // Valida 1o digito
        let add = 0;
        for (let i=0; i < 9; i ++)
            add += parseInt(cpf.charAt(i)) * (10 - i);
        let rev = 11 - (add % 11);
        if (rev == 10 || rev == 11)
            rev = 0;
        if (rev != parseInt(cpf.charAt(9)))
            return false;
        // Valida 2o digito
        add = 0;
        for (let i = 0; i < 10; i ++)
            add += parseInt(cpf.charAt(i)) * (11 - i);
        rev = 11 - (add % 11);
        if (rev == 10 || rev == 11)
            rev = 0;
        if (rev != parseInt(cpf.charAt(10)))
            return false;
        return true;
    }

    function toggleFormState(enabled) {
        const inputs = container.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            if (!input.classList.contains('always-readonly')) {
                input.readOnly = !enabled;
            }
        });

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

    async function carregarPerfil() {
        try {
            container.innerHTML = '<div class="loading-spinner"></div>';
            if (!user || !user.uid) throw new Error("UID do usuário não encontrado.");
            userDocRef = db.collection('usuarios').doc(user.uid);
            const doc = await userDocRef.get();
            if (!doc.exists) throw new Error("Dados do usuário não encontrados no Firestore.");
            originalData = doc.data();
            renderForm(originalData);
            toggleFormState(false);
        } catch (error) {
            console.error("Erro ao carregar perfil:", error);
            container.innerHTML = `<p class="alert alert-error">Não foi possível carregar os dados do seu perfil.</p>`;
        }
    }
    
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
                <input type="text" id="cpf" value="${data.cpf || ''}" readonly>
            </div>
            <div class="form-group">
                <label for="rg">RG</label>
                <input type="text" id="rg" value="${data.rg || ''}" readonly>
            </div>
            <div class="form-group" style="grid-column: 1 / -1;">
                <label for="especializacoes">Especializações (separadas por vírgula)</label>
                <textarea id="especializacoes" readonly>${Array.isArray(data.especializacoes) ? data.especializacoes.join(', ') : ''}</textarea>
            </div>
            <div class="form-group">
                <label for="data-inicio">Data de Início na EuPsico</label>
                <input type="text" id="data-inicio" value="${data.dataInicio || ''}" readonly>
            </div>
        `;
    }

    async function salvarPerfil() {
        if (!userDocRef) return;

        const nome = document.getElementById('nome-completo').value;
        const telefone = document.getElementById('telefone').value;
        const cpf = document.getElementById('cpf').value;

        if (!nome || !telefone) {
            alert("Nome Completo e Telefone são obrigatórios.");
            return;
        }

        // Validação do CPF
        if (cpf && !validarCPF(cpf)) {
            alert("O CPF digitado é inválido. Por favor, verifique.");
            return;
        }

        const especializacoesRaw = document.getElementById('especializacoes').value;
        const dadosParaAtualizar = {
            nome: nome,
            telefone: telefone,
            endereco: document.getElementById('endereco').value,
            profissao: document.getElementById('profissao').value,
            cpf: cpf,
            rg: document.getElementById('rg').value,
            dataInicio: document.getElementById('data-inicio').value,
            especializacoes: especializacoesRaw.split(',').map(s => s.trim()).filter(Boolean)
        };
        
        const saveButton = document.getElementById('btn-salvar-perfil');
        saveButton.disabled = true;
        saveButton.textContent = 'Salvando...';

        try {
            await userDocRef.update(dadosParaAtualizar);
            originalData = {...originalData, ...dadosParaAtualizar};
            alert("Perfil atualizado com sucesso!");
        } catch (error) {
            console.error("Erro ao salvar o perfil:", error);
            alert("Ocorreu um erro ao salvar seu perfil.");
        } finally {
            toggleFormState(false);
        }
    }

    function attachActionListeners() {
        const editButton = document.getElementById('btn-editar-perfil');
        const saveButton = document.getElementById('btn-salvar-perfil');
        const cancelButton = document.getElementById('btn-cancelar-edicao');

        if (editButton) editButton.addEventListener('click', () => toggleFormState(true));
        if (saveButton) saveButton.addEventListener('click', salvarPerfil);
        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                renderForm(originalData);
                toggleFormState(false);
            });
        }
    }

    carregarPerfil();
}