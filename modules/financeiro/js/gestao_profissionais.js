// modules/financeiro/js/gestao_profissionais.js (Versão Final com a sua lógica original)

(function() {
    // Acessa os serviços do Firebase inicializados globalmente
    const db = firebase.firestore();
    const functions = firebase.functions(); // Habilita o uso de Cloud Functions

    // Variáveis para os elementos da UI
    let tableBody, modal, modalTitle, profissionalForm, cancelButton, addProfissionalButton, deleteButton, saveButton;
    let localUsuariosList = []; // Cache local para a lista de profissionais

    /**
     * Roda uma única vez para configurar os listeners de eventos.
     */
    function setupEventListeners() {
        // Lógica para navegação em abas
        const tabLinks = document.querySelectorAll('.tab-link');
        const tabContents = document.querySelectorAll('.tab-content');
        tabLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                tabLinks.forEach(l => l.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                e.currentTarget.classList.add('active');
                document.getElementById(tabName).classList.add('active');
            });
        });
        
        // Ativa a primeira aba
        const firstTab = document.querySelector('.tab-link[data-tab="GestaoProfissionais"]');
        if (firstTab) firstTab.click();
        
        // Seleciona os elementos do DOM
        tableBody = document.querySelector('#profissionais-table tbody');
        modal = document.getElementById('profissional-modal');
        modalTitle = document.getElementById('modal-title');
        profissionalForm = document.getElementById('profissional-form');
        cancelButton = document.getElementById('modal-cancel-btn');
        addProfissionalButton = document.getElementById('add-profissional-btn');
        deleteButton = document.getElementById('modal-delete-btn');
        saveButton = document.getElementById('modal-save-btn');

        // Adiciona os eventos aos botões
        if (addProfissionalButton) addProfissionalButton.addEventListener('click', () => abrirModal(null));
        if (cancelButton) cancelButton.addEventListener('click', fecharModal);
        if (profissionalForm) profissionalForm.addEventListener('submit', salvarProfissional);
        if (deleteButton) deleteButton.addEventListener('click', excluirProfissional);

        // Event listener na tabela para os botões de edição
        if (tableBody) {
            tableBody.addEventListener('click', (event) => {
                if (event.target.classList.contains('edit-btn')) {
                    const id = event.target.dataset.id;
                    const profissionalParaEditar = localUsuariosList.find(p => p.id === id);
                    if (profissionalParaEditar) {
                        abrirModal(profissionalParaEditar);
                    }
                }
            });
        }
    }

    /**
     * Usa onSnapshot para ouvir por mudanças em tempo real na coleção de usuários.
     */
    function ouvirMudancasProfissionais() {
        if (!tableBody) return;
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Carregando profissionais...</td></tr>';

        db.collection('usuarios').orderBy('nome').onSnapshot(snapshot => {
            tableBody.innerHTML = '';
            if (snapshot.empty) {
                tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Nenhum profissional encontrado.</td></tr>';
                return;
            }
            
            localUsuariosList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            localUsuariosList.forEach(profissional => {
                const tr = document.createElement('tr');
                const funcoes = profissional.funcoes ? profissional.funcoes.join(', ') : 'N/A';
                tr.innerHTML = `
                    <td>${profissional.nome || ''}</td>
                    <td>${profissional.contato || ''}</td>
                    <td>${funcoes}</td>
                    <td>${profissional.inativo ? 'Sim' : 'Não'}</td>
                    <td>${profissional.primeiraFase ? 'Sim' : 'Não'}</td>
                    <td>${profissional.fazAtendimento ? 'Sim' : 'Não'}</td>
                    <td>${profissional.recebeDireto ? 'Sim' : 'Não'}</td>
                    <td><button class="action-button-small edit-btn" data-id="${profissional.id}">Editar</button></td>
                `;
                tableBody.appendChild(tr);
            });
        }, error => {
            console.error("Erro ao ouvir profissionais:", error);
            tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Ocorreu um erro ao carregar os dados.</td></tr>';
        });
    }

    /**
     * Abre e configura o modal, seja para criar ou editar.
     */
    function abrirModal(profissional) {
        profissionalForm.reset();
        const emailInput = document.getElementById('prof-email');
        
        if (profissional) { // Modo Edição
            modalTitle.textContent = 'Editar Profissional';
            document.getElementById('profissional-id').value = profissional.id;
            document.getElementById('prof-nome').value = profissional.nome || '';
            emailInput.value = profissional.email || '';
            emailInput.disabled = true; // Bloqueia e-mail na edição
            document.getElementById('prof-contato').value = profissional.contato || '';
            document.getElementById('prof-profissao').value = profissional.profissao || '';
            document.getElementById('prof-inativo').checked = profissional.inativo || false;
            document.getElementById('prof-recebeDireto').checked = profissional.recebeDireto || false;
            document.getElementById('prof-primeiraFase').checked = profissional.primeiraFase || false;
            document.getElementById('prof-fazAtendimento').checked = profissional.fazAtendimento || false;
            document.querySelectorAll('input[name="funcoes"]').forEach(cb => {
                cb.checked = (profissional.funcoes || []).includes(cb.value);
            });
            if(deleteButton) deleteButton.style.display = 'inline-block';
        } else { // Modo Criação
            modalTitle.textContent = 'Adicionar Novo Profissional';
            document.getElementById('profissional-id').value = '';
            emailInput.disabled = false;
            if(deleteButton) deleteButton.style.display = 'none';
        }
        if(modal) modal.style.display = 'flex';
    }

    function fecharModal() {
        if(modal) modal.style.display = 'none';
    }

    /**
     * ✅ FUNÇÃO SALVAR ATUALIZADA COM A LÓGICA CORRETA
     */
    async function salvarProfissional(event) {
        event.preventDefault();
        
        const profissionalId = document.getElementById('profissional-id').value;
        const email = document.getElementById('prof-nome').value.trim();
        const nome = document.getElementById('prof-email').value.trim();


        if (!nome || !email) {
            if(window.showToast) window.showToast('Nome e E-mail são obrigatórios.', 'error');
            return;
        }

        saveButton.disabled = true;
        saveButton.textContent = 'Salvando...';

        const funcoesSelecionadas = Array.from(document.querySelectorAll('input[name="funcoes"]:checked')).map(cb => cb.value);

        const dadosProfissional = {
            nome: nome,
            email: email,
            contato: document.getElementById('prof-contato').value.trim(),
            profissao: document.getElementById('prof-profissao').value,
            funcoes: funcoesSelecionadas,
            inativo: document.getElementById('prof-inativo').checked,
            recebeDireto: document.getElementById('prof-recebeDireto').checked,
            primeiraFase: document.getElementById('prof-primeiraFase').checked,
            fazAtendimento: document.getElementById('prof-fazAtendimento').checked,
        };

        try {
            if (profissionalId) { // Modo Edição
                await db.collection('usuarios').doc(profissionalId).update(dadosProfissional);
                if(window.showToast) window.showToast('Profissional atualizado com sucesso!');
            } else { // Modo Criação
                const criarNovoProfissional = functions.httpsCallable('criarNovoProfissional');
                const resultado = await criarNovoProfissional(dadosProfissional);
                if(window.showToast) window.showToast(resultado.data.message || 'Profissional criado com sucesso!');
            }
            fecharModal(); // A tabela se atualizará sozinha por causa do 'onSnapshot'
        } catch (error) {
            console.error("Erro ao salvar profissional:", error);
            if(window.showToast) window.showToast(`Erro: ${error.message}`, 'error');
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = 'Salvar';
        }
    }

    /**
     * Exclui um profissional (apenas do Firestore).
     */
    async function excluirProfissional() {
        const profissionalId = document.getElementById('profissional-id').value;
        if (!profissionalId) return;

        if (confirm('Tem certeza que deseja excluir este profissional? Esta ação não pode ser desfeita e NÃO remove o login do Firebase Authentication.')) {
            try {
                await db.collection('usuarios').doc(profissionalId).delete();
                if(window.showToast) window.showToast('Profissional excluído do Firestore.');
                fecharModal();
            } catch (error) {
                console.error("Erro ao excluir profissional:", error);
                if(window.showToast) window.showToast(`Erro ao excluir: ${error.message}`, 'error');
            }
        }
    }

    // --- INICIALIZAÇÃO ---
    setupEventListeners();
    ouvirMudancasProfissionais(); // Inicia o listener em tempo real
})();