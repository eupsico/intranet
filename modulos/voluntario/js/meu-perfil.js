export function init(db, user, userData) {
    const container = document.getElementById('perfil-container');
    const actionsContainer = document.getElementById('perfil-actions');
    
    if (!container || !actionsContainer) return;

    let userDocRef;
    let originalData = {};

    function validarCPF(cpf) {
        cpf = cpf.replace(/[^\d]+/g,'');
        if(cpf === '' || cpf.length !== 11 || /^(.)\1+$/.test(cpf)) return false;
        let add = 0;
        for (let i=0; i < 9; i ++) add += parseInt(cpf.charAt(i)) * (10 - i);
        let rev = 11 - (add % 11);
        if (rev === 10 || rev === 11) rev = 0;
        if (rev !== parseInt(cpf.charAt(9))) return false;
        add = 0;
        for (let i = 0; i < 10; i ++) add += parseInt(cpf.charAt(i)) * (11 - i);
        rev = 11 - (add % 11);
        if (rev === 10 || rev === 11) rev = 0;
        if (rev !== parseInt(cpf.charAt(10))) return false;
        return true;
    }

    function formatarTelefone(value) {
        if (!value) return "";
        value = value.replace(/\D/g,'');
        value = value.substring(0, 11); // Limita a 11 dígitos
        value = value.replace(/^(\d{2})(\d)/g,"($1) $2");
        value = value.replace(/(\d{5})(\d)/,"\$1-\$2");
        return value;
    }

    function toggleFormState(enabled) {
        const inputs = container.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            if (!input.classList.contains('always-readonly')) {
                if (input.tagName.toLowerCase() === 'select') {
                    input.disabled = !enabled;
                } else {
                    input.readOnly = !enabled;
                }
            }
        });

        actionsContainer.innerHTML = enabled
            ? `<button id="btn-cancelar-edicao" class="btn btn-secondary">Cancelar</button>
               <button id="btn-salvar-perfil" class="btn btn-primary">Salvar Alterações</button>`
            : `<button id="btn-editar-perfil" class="btn btn-primary">Editar Perfil</button>`;
        
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
            await renderForm(originalData); // Tornou-se assíncrono para garantir que os listeners sejam adicionados depois
            toggleFormState(false);
        } catch (error) {
            console.error("Erro ao carregar perfil:", error);
            container.innerHTML = `<p class="alert alert-error">Não foi possível carregar os dados.</p>`;
        }
    }
    
    async function renderForm(data) {
        // Listas de opções
        const profissoes = ['Psicologia', 'Psicopedagogia', 'Musicoterapia', 'Nutrição', 'Advogado', 'Estágiario', 'Outros'];
        const conselhos = ['Nenhum', 'CRP', 'CRM', 'CRESS', 'OAB', 'CFN', 'Outro'];
        
        // Lógica para determinar a profissão selecionada
        const profissaoSalva = data.profissao || '';
        const profissaoPadrao = profissoes.includes(profissaoSalva) ? profissaoSalva : 'Outros';
        const outraProfissaoValor = profissaoPadrao === 'Outros' ? profissaoSalva : '';

        // Monta o novo layout com divs aninhadas para controle de colunas
        container.innerHTML = `
            <div class="form-row-flex">
                <div class="form-group flex-grow-2">
                    <label for="nome-completo">Nome Completo *</label>
                    <input type="text" id="nome-completo" value="${data.nome || ''}" readonly>
                </div>
                <div class="form-group flex-grow-1">
                    <label for="telefone">Telefone *</label>
                    <input type="tel" id="telefone" value="${formatarTelefone(data.contato || '')}" maxlength="15" readonly>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group full-width">
                    <label for="endereco">Endereço</label>
                    <input type="text" id="endereco" value="${data.endereco || ''}" readonly>
                </div>
            </div>

            <div class="form-row-flex">
                <div class="form-group">
                    <label for="profissao">Profissão</label>
                    <select id="profissao" readonly></select>
                </div>
                <div class="form-group" id="outra-profissao-container" style="display: none;">
                    <label for="outra-profissao">Qual?</label>
                    <input type="text" id="outra-profissao" value="${outraProfissaoValor}" readonly>
                </div>
                <div class="form-group">
                    <label for="conselho-profissional">Conselho Profissional</label>
                    <select id="conselho-profissional" readonly></select>
                </div>
                <div class="form-group">
                    <label for="registro-profissional">Nº de Registro</label>
                    <input type="text" id="registro-profissional" value="${data.registroProfissional || ''}" readonly>
                </div>
            </div>

            <div class="form-row-flex">
                <div class="form-group">
                    <label for="cpf">CPF</label>
                    <input type="text" id="cpf" value="${data.cpf || ''}" readonly>
                </div>
                <div class="form-group">
                    <label for="rg">RG</label>
                    <input type="text" id="rg" value="${data.rg || ''}" readonly>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group full-width">
                    <label for="especializacoes">Especializações (separadas por vírgula)</label>
                    <textarea id="especializacoes" readonly>${Array.isArray(data.especializacoes) ? data.especializacoes.join(', ') : ''}</textarea>
                </div>
            </div>
            
            <div class="form-row-flex">
                <div class="form-group">
                    <label for="data-inicio">Data de Início na EuPsico</label>
                    <input type="date" id="data-inicio" value="${data.dataInicio || ''}" readonly>
                </div>
                <div class="form-group">
                    <label for="funcao">Função na EuPsico</label>
                    <input type="text" id="funcao" class="always-readonly" value="${Array.isArray(data.funcoes) ? data.funcoes.join(', ') : 'Não informado'}" readonly>
                </div>
            </div>
        `;

        // Popula as listas de seleção de forma segura
        const profissaoSelect = document.getElementById('profissao');
        profissaoSelect.innerHTML = profissoes.map(p => `<option value="${p}" ${p === profissaoPadrao ? 'selected' : ''}>${p}</option>`).join('');

        const conselhoSelect = document.getElementById('conselho-profissional');
        conselhoSelect.innerHTML = conselhos.map(c => `<option value="${c}" ${c === (data.conselhoProfissional || 'Nenhum') ? 'selected' : ''}>${c}</option>`).join('');
        
        // Adiciona os listeners para os campos dinâmicos
        attachDynamicFieldListeners();
    }
    
    function attachDynamicFieldListeners() {
        const profissaoSelect = document.getElementById('profissao');
        const outraProfissaoContainer = document.getElementById('outra-profissao-container');
        
        function toggleOutraProfissao() {
            outraProfissaoContainer.style.display = profissaoSelect.value === 'Outros' ? 'block' : 'none';
        }
        
        toggleOutraProfissao(); // Executa na primeira vez para definir o estado inicial
        profissaoSelect.addEventListener('change', toggleOutraProfissao);
        
        document.getElementById('telefone').addEventListener('input', (e) => {
            e.target.value = formatarTelefone(e.target.value);
        });
    }

    async function salvarPerfil() {
        if (!userDocRef) return;

        const nome = document.getElementById('nome-completo').value;
        const telefoneInput = document.getElementById('telefone');
        const telefone = telefoneInput.value.replace(/\D/g,'');
        const cpf = document.getElementById('cpf').value;

        if (!nome || !telefone) {
            alert("Nome Completo e Telefone são obrigatórios.");
            return;
        }

        if (cpf && !validarCPF(cpf)) {
            alert("O CPF digitado é inválido. Por favor, verifique.");
            return;
        }
        
        // Lógica para salvar a profissão correta
        const profissaoSelecionada = document.getElementById('profissao').value;
        const profissaoFinal = profissaoSelecionada === 'Outros' 
            ? document.getElementById('outra-profissao').value.trim() 
            : profissaoSelecionada;

        const dadosParaAtualizar = {
            nome: nome,
            telefone: telefone,
            endereco: document.getElementById('endereco').value,
            profissao: profissaoFinal,
            conselhoProfissional: document.getElementById('conselho-profissional').value,
            registroProfissional: document.getElementById('registro-profissional').value,
            cpf: cpf,
            rg: document.getElementById('rg').value,
            dataInicio: document.getElementById('data-inicio').value,
            especializacoes: document.getElementById('especializacoes').value.split(',').map(s => s.trim()).filter(Boolean)
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
            cancelButton.addEventListener('click', async () => {
                await renderForm(originalData); // Re-renderiza para restaurar valores e listeners
                toggleFormState(false);
            });
        }
    }

    carregarPerfil();
}