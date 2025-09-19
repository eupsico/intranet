export function init(db, user, userData) {
    const container = document.getElementById('perfil-container');
    const saveButton = document.getElementById('btn-salvar-perfil');
    
    if (!container || !saveButton) return;

    let userDocRef; // Referência para o documento do usuário

    /**
     * Carrega os dados do perfil do usuário do Firestore e monta o formulário.
     */
    async function carregarPerfil() {
        try {
            container.innerHTML = '<div class="loading-spinner"></div>';
            
            // A variável 'user' do auth contém o UID
            if (!user || !user.uid) {
                throw new Error("UID do usuário não encontrado.");
            }

            userDocRef = db.collection('usuarios').doc(user.uid);
            const doc = await userDocRef.get();

            if (!doc.exists) {
                throw new Error("Dados do usuário não encontrados no Firestore.");
            }

            const data = doc.data();
            
            // Monta o HTML do formulário com os dados preenchidos
            container.innerHTML = `
                <div class="form-group">
                    <label for="nome-completo">Nome Completo *</label>
                    <input type="text" id="nome-completo" value="${data.name || ''}">
                </div>
                <div class="form-group">
                    <label for="telefone">Telefone *</label>
                    <input type="tel" id="telefone" value="${data.telefone || ''}">
                </div>
                <div class="form-group" style="grid-column: 1 / -1;">
                    <label for="endereco">Endereço</label>
                    <input type="text" id="endereco" value="${data.endereco || ''}">
                </div>

                <div class="dual-group" style="grid-column: 1 / -1;">
                    <div class="form-group">
                        <label for="cpf">CPF (somente leitura)</label>
                        <input type="text" id="cpf" value="${data.cpf || 'Não informado'}" readonly>
                    </div>
                    <div class="form-group">
                        <label for="rg">RG (somente leitura)</label>
                        <input type="text" id="rg" value="${data.rg || 'Não informado'}" readonly>
                    </div>
                </div>

                <div class="form-group">
                    <label for="profissao">Profissão</label>
                    <input type="text" id="profissao" value="${data.profissao || ''}">
                </div>
                <div class="form-group">
                    <label for="funcao">Função na EuPsico (somente leitura)</label>
                    <input type="text" id="funcao" value="${Array.isArray(data.funcoes) ? data.funcoes.join(', ') : 'Não informado'}" readonly>
                </div>
                <div class="form-group" style="grid-column: 1 / -1;">
                    <label for="especializacoes">Especializações (separadas por vírgula)</label>
                    <textarea id="especializacoes">${Array.isArray(data.especializacoes) ? data.especializacoes.join(', ') : ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="data-inicio">Data de Início na EuPsico (somente leitura)</label>
                    <input type="text" id="data-inicio" value="${data.dataInicio || 'Não informada'}" readonly>
                </div>
            `;

        } catch (error) {
            console.error("Erro ao carregar perfil:", error);
            container.innerHTML = `<p class="alert alert-error">Não foi possível carregar os dados do seu perfil. Tente novamente mais tarde.</p>`;
        }
    }

    /**
     * Salva os dados atualizados do perfil no Firestore.
     */
    async function salvarPerfil() {
        if (!userDocRef) {
            alert("Erro: referência do usuário não encontrada.");
            return;
        }

        // Coleta os valores dos campos editáveis
        const nome = document.getElementById('nome-completo').value;
        const telefone = document.getElementById('telefone').value;
        const endereco = document.getElementById('endereco').value;
        const profissao = document.getElementById('profissao').value;
        const especializacoesRaw = document.getElementById('especializacoes').value;
        
        // Validação simples
        if (!nome || !telefone) {
            alert("Por favor, preencha os campos obrigatórios (Nome Completo e Telefone).");
            return;
        }

        // Converte a string de especializações em um array
        const especializacoesArray = especializacoesRaw.split(',').map(s => s.trim()).filter(Boolean);

        const dadosParaAtualizar = {
            name: nome,
            telefone: telefone,
            endereco: endereco,
            profissao: profissao,
            especializacoes: especializacoesArray
        };

        try {
            saveButton.disabled = true;
            saveButton.textContent = 'Salvando...';

            await userDocRef.update(dadosParaAtualizar);

            alert("Perfil atualizado com sucesso!");

        } catch (error) {
            console.error("Erro ao salvar o perfil:", error);
            alert("Ocorreu um erro ao salvar seu perfil. Tente novamente.");
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = 'Salvar Alterações';
        }
    }

    // --- INICIALIZAÇÃO ---
    carregarPerfil();
    saveButton.addEventListener('click', salvarPerfil);
}