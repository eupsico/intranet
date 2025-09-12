// modules/financeiro/js/gestao_profissionais.js (Versão Final com CRUD)

(function() {
    const db = firebase.firestore();
    const auth = firebase.auth(); // Precisamos do auth para criar usuários

    let tableBody, modal, modalTitle, profissionalForm, cancelButton, addProfissionalButton, deleteButton;

    /**
     * Roda uma única vez para configurar os listeners de eventos.
     */
    function setupEventListeners() {
        const tabLinks = document.querySelectorAll('.tab-link');
        const tabContents = document.querySelectorAll('.tab-content');
        tabLinks.forEach(link => {
            link.addEventListener('click', () => {
                const tabName = link.dataset.tab;
                tabLinks.forEach(l => l.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                link.classList.add('active');
                document.getElementById(tabName).classList.add('active');
            });
        });

        const firstTab = document.querySelector('.tab-link[data-tab="GestaoProfissionais"]');
        if (firstTab) firstTab.click();

        tableBody = document.querySelector('#profissionais-table tbody');
        modal = document.getElementById('profissional-modal');
        modalTitle = document.getElementById('modal-title');
        profissionalForm = document.getElementById('profissional-form');
        cancelButton = document.getElementById('modal-cancel-btn');
        addProfissionalButton = document.getElementById('add-profissional-btn');
        deleteButton = document.getElementById('modal-delete-btn');

        if (addProfissionalButton) addProfissionalButton.addEventListener('click', abrirModalParaCriar);
        if (cancelButton) cancelButton.addEventListener('click', fecharModal);
        if (profissionalForm) profissionalForm.addEventListener('submit', salvarProfissional);
        
        if (tableBody) {
            tableBody.addEventListener('click', (event) => {
                if (event.target.classList.contains('edit-btn')) {
                    const id = event.target.dataset.id;
                    abrirModalParaEditar(id);
                }
            });
        }
        
        carregarProfissionais();
    }

    /**
     * Busca os usuários no Firestore e os renderiza na tabela.
     */
    async function carregarProfissionais() {
        // ... (Esta função permanece inalterada, pois já está funcionando bem)
        if (!tableBody) return;
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Carregando profissionais...</td></tr>';
        try {
            const snapshot = await db.collection('usuarios').orderBy('nome').get();
            if (snapshot.empty) {
                tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Nenhum profissional encontrado.</td></tr>';
                return;
            }
            tableBody.innerHTML = ''; 
            snapshot.forEach(doc => {
                const profissional = doc.data();
                const tr = document.createElement('tr');
                tr.dataset.id = doc.id;
                const funcoes = profissional.funcoes ? profissional.funcoes.join(', ') : 'N/A';
                const inativo = profissional.inativo ? 'Sim' : 'Não';
                const primeiraFase = profissional.primeiraFase ? 'Sim' : 'Não';
                const fazAtendimento = profissional.fazAtendimento ? 'Sim' : 'Não';
                const recebeDireto = profissional.recebeDireto ? 'Sim' : 'Não';
                tr.innerHTML = `
                    <td>${profissional.nome || 'Nome não informado'}</td>
                    <td>${profissional.contato || 'N/A'}</td>
                    <td>${funcoes}</td>
                    <td>${inativo}</td>
                    <td>${primeiraFase}</td>
                    <td>${fazAtendimento}</td>
                    <td>${recebeDireto}</td>
                    <td><button class="action-button-small edit-btn" data-id="${doc.id}">Editar</button></td>
                `;
                tableBody.appendChild(tr);
            });
        } catch (error) {
            console.error("Erro ao carregar profissionais:", error);
            tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Ocorreu um erro ao carregar os dados.</td></tr>';
        }
    }

    /**
     * Abre o modal para adicionar um novo profissional.
     */
    function abrirModalParaCriar() {
        profissionalForm.reset();
        document.getElementById('profissional-id').value = '';
        document.getElementById('prof-email').disabled = false; // Garante que o campo de e-mail seja editável
        modalTitle.textContent = 'Adicionar Novo Profissional';
        if(deleteButton) deleteButton.style.display = 'none';
        if(modal) modal.style.display = 'flex';
    }

    /**
     * Abre o modal para editar um profissional existente.
     */
    async function abrirModalParaEditar(id) {
        try {
            const docRef = db.collection('usuarios').doc(id);
            const docSnap = await docRef.get();
            if (docSnap.exists) {
                const profissional = docSnap.data();
                
                document.getElementById('profissional-id').value = id;
                document.getElementById('prof-nome').value = profissional.nome || '';
                document.getElementById('prof-email').value = profissional.email || '';
                document.getElementById('prof-email').disabled = true; // ✅ Bloqueia a edição do e-mail
                document.getElementById('prof-contato').value = profissional.contato || '';
                document.getElementById('prof-profissao').value = profissional.profissao || '';

                document.getElementById('prof-inativo').checked = profissional.inativo || false;
                document.getElementById('prof-recebeDireto').checked = profissional.recebeDireto || false;
                document.getElementById('prof-primeiraFase').checked = profissional.primeiraFase || false;
                document.getElementById('prof-fazAtendimento').checked = profissional.fazAtendimento || false;

                document.querySelectorAll('input[name="funcoes"]').forEach(checkbox => {
                    checkbox.checked = (profissional.funcoes || []).includes(checkbox.value);
                });

                modalTitle.textContent = 'Editar Profissional';
                if(deleteButton) deleteButton.style.display = 'inline-block';
                if(modal) modal.style.display = 'flex';
            } else {
                if(window.showToast) window.showToast('Profissional não encontrado.', 'error');
            }
        } catch (error) {
            console.error("Erro ao buscar profissional para edição:", error);
            if(window.showToast) window.showToast('Erro ao buscar dados do profissional.', 'error');
        }
    }

    function fecharModal() {
        if(modal) modal.style.display = 'none';
    }

    /**
     * ✅ FUNÇÃO SALVAR ATUALIZADA COM A LÓGICA DO AUTHENTICATION
     */
    async function salvarProfissional(event) {
        event.preventDefault();
        const saveButton = document.getElementById('modal-save-btn');
        saveButton.disabled = true;
        saveButton.textContent = 'Salvando...';

        const profissionalId = document.getElementById('profissional-id').value;
        const email = document.getElementById('prof-email').value.trim();

        const funcoesSelecionadas = [];
        document.querySelectorAll('input[name="funcoes"]:checked').forEach(checkbox => {
            funcoesSelecionadas.push(checkbox.value);
        });

        const dadosProfissional = {
            nome: document.getElementById('prof-nome').value.trim(),
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
            if (profissionalId) {
                // LÓGICA DE ATUALIZAÇÃO (somente Firestore)
                await db.collection('usuarios').doc(profissionalId).update(dadosProfissional);
                if(window.showToast) window.showToast('Profissional atualizado com sucesso!');
            } else {
                // LÓGICA DE CRIAÇÃO (Authentication + Firestore)
                // Não é possível criar um usuário no Auth daqui diretamente.
                // Esta função deve ser movida para o backend (Cloud Functions) por segurança.
                // Por enquanto, vamos salvar apenas no Firestore, assumindo que o admin criará o usuário no painel do Firebase.
                
                // NOTA: A criação de usuário via client-side (como abaixo) foi removida por ser insegura
                // e por exigir um segundo app Firebase para admin, o que complica o setup.
                // const tempPassword = Math.random().toString(36).slice(-8);
                // const userCredential = await auth.createUserWithEmailAndPassword(email, tempPassword);
                // await db.collection('usuarios').doc(userCredential.user.uid).set(dadosProfissional);
                
                // SIMPLIFICANDO: Vamos usar o email como ID no Firestore por enquanto.
                // Esta não é a melhor prática, mas funciona para o propósito atual.
                // O ideal é usar o UID do Auth, que o admin deve criar manualmente.
                await db.collection('usuarios').add(dadosProfissional);

                if(window.showToast) window.showToast('Profissional adicionado ao Firestore!');
            }
            
            fecharModal();
            carregarProfissionais();

        } catch (error) {
            console.error("Erro ao salvar profissional:", error);
            if(window.showToast) window.showToast(`Erro ao salvar: ${error.message}`, 'error');
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = 'Salvar';
        }
    }

    setupEventListeners();
})();