// modules/financeiro/js/painel-script.js (Versão Consolidada e Final)

document.addEventListener('userReady', function(event) {
    const { user, userData } = event.detail;
    const db = firebase.firestore();
    const functions = firebase.functions();

    // Elementos da UI
    const contentArea = document.getElementById('content-area');
    const navButtons = document.querySelectorAll('.sidebar-menu .nav-button');
    let tableBody, modal, modalTitle, profissionalForm, cancelButton, addProfissionalButton, deleteButton, saveButton;
    let localUsuariosList = [];

    async function loadView(viewName) {
        navButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.view === viewName));
        
        try {
            contentArea.innerHTML = '<div class="loading-spinner">Carregando...</div>';
            const response = await fetch(`./${viewName}.html`);
            if (!response.ok) throw new Error(`HTML da view '${viewName}' não encontrado.`);
            contentArea.innerHTML = await response.text();

            // Após carregar o HTML da view, inicializa os componentes dela
            if (viewName === 'gestao_profissionais') {
                initializeGestaoProfissionais();
            }
            // Adicionar 'else if' para outras views que precisem de JS
            
        } catch (error) {
            console.error(`Erro ao carregar a view ${viewName}:`, error);
            contentArea.innerHTML = `<h2>Módulo em Desenvolvimento</h2>`;
        }
    }

    function initializeGestaoProfissionais() {
        // Seleciona todos os elementos da view recém-carregada
        tableBody = document.querySelector('#profissionais-table tbody');
        modal = document.getElementById('profissional-modal');
        modalTitle = document.getElementById('modal-title');
        profissionalForm = document.getElementById('profissional-form');
        cancelButton = document.getElementById('modal-cancel-btn');
        addProfissionalButton = document.getElementById('add-profissional-btn');
        deleteButton = document.getElementById('modal-delete-btn');
        saveButton = document.getElementById('modal-save-btn');

        // Adiciona os eventos
        if (addProfissionalButton) addProfissionalButton.addEventListener('click', () => abrirModal(null));
        if (cancelButton) cancelButton.addEventListener('click', fecharModal);
        if (profissionalForm) profissionalForm.addEventListener('submit', salvarProfissional);
        if (deleteButton) deleteButton.addEventListener('click', excluirProfissional);

        if (tableBody) {
            tableBody.addEventListener('click', (event) => {
                if (event.target.classList.contains('edit-btn')) {
                    const id = event.target.dataset.id;
                    const profissional = localUsuariosList.find(p => p.id === id);
                    if (profissional) abrirModal(profissional);
                }
            });
        }
        ouvirMudancasProfissionais();
    }
    
    function ouvirMudancasProfissionais() {
        if (!tableBody) return;
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Carregando...</td></tr>';
        db.collection('usuarios').orderBy('nome').onSnapshot(snapshot => {
            tableBody.innerHTML = '';
            if (snapshot.empty) {
                tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Nenhum profissional.</td></tr>';
                return;
            }
            localUsuariosList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            localUsuariosList.forEach(p => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${p.nome || ''}</td><td>${p.contato || ''}</td><td>${(p.funcoes || []).join(', ')}</td>
                    <td>${p.inativo ? 'Sim' : 'Não'}</td><td>${p.primeiraFase ? 'Sim' : 'Não'}</td>
                    <td>${p.fazAtendimento ? 'Sim' : 'Não'}</td><td>${p.recebeDireto ? 'Sim' : 'Não'}</td>
                    <td><button class="action-button-small edit-btn" data-id="${p.id}">Editar</button></td>`;
                tableBody.appendChild(tr);
            });
        }, error => console.error("Erro ao ouvir profissionais:", error));
    }

    function abrirModal(p) { // p para profissional
        profissionalForm.reset();
        const emailInput = document.getElementById('prof-email');
        if (p) { // Editando
            modalTitle.textContent = 'Editar Profissional';
            document.getElementById('profissional-id').value = p.id;
            document.getElementById('prof-nome').value = p.nome || '';
            emailInput.value = p.email || '';
            emailInput.disabled = true;
            document.getElementById('prof-contato').value = p.contato || '';
            document.getElementById('prof-profissao').value = p.profissao || '';
            document.getElementById('prof-inativo').checked = p.inativo || false;
            document.getElementById('prof-recebeDireto').checked = p.recebeDireto || false;
            document.getElementById('prof-primeiraFase').checked = p.primeiraFase || false;
            document.getElementById('prof-fazAtendimento').checked = p.fazAtendimento || false;
            document.querySelectorAll('input[name="funcoes"]').forEach(cb => { cb.checked = (p.funcoes || []).includes(cb.value); });
            if(deleteButton) deleteButton.style.display = 'inline-block';
        } else { // Criando
            modalTitle.textContent = 'Adicionar Novo Profissional';
            document.getElementById('profissional-id').value = '';
            emailInput.disabled = false;
            if(deleteButton) deleteButton.style.display = 'none';
        }
        if(modal) modal.style.display = 'flex';
    }

    function fecharModal() { if(modal) modal.style.display = 'none'; }

    async function salvarProfissional(event) {
        event.preventDefault();
        const id = document.getElementById('profissional-id').value;
        const dados = {
            nome: document.getElementById('prof-nome').value.trim(),
            email: document.getElementById('prof-email').value.trim(),
            contato: document.getElementById('prof-contato').value.trim(),
            profissao: document.getElementById('prof-profissao').value,
            funcoes: Array.from(document.querySelectorAll('input[name="funcoes"]:checked')).map(cb => cb.value),
            inativo: document.getElementById('prof-inativo').checked,
            recebeDireto: document.getElementById('prof-recebeDireto').checked,
            primeiraFase: document.getElementById('prof-primeiraFase').checked,
            fazAtendimento: document.getElementById('prof-fazAtendimento').checked,
        };
        if (!dados.nome || !dados.email) { return alert('Nome e E-mail são obrigatórios.'); }

        saveButton.disabled = true;
        saveButton.textContent = 'Salvando...';
        try {
            if (id) {
                await db.collection('usuarios').doc(id).update(dados);
                alert('Profissional atualizado com sucesso!');
            } else {
                const criarNovoProfissional = functions.httpsCallable('criarNovoProfissional');
                const resultado = await criarNovoProfissional(dados);
                alert(resultado.data.message || 'Profissional criado com sucesso!');
            }
            fecharModal();
        } catch (error) {
            console.error("Erro ao salvar:", error);
            alert(`Erro ao salvar: ${error.message}`);
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = 'Salvar';
        }
    }

    async function excluirProfissional() {
        const id = document.getElementById('profissional-id').value;
        if (!id || !confirm('Tem certeza? Esta ação NÃO remove o login.')) return;
        try {
            await db.collection('usuarios').doc(id).delete();
            alert('Profissional excluído do Firestore.');
            fecharModal();
        } catch (error) {
            console.error("Erro ao excluir:", error);
            alert(`Erro ao excluir: ${error.message}`);
        }
    }

    // Inicializador do Painel
    const hash = window.location.hash.substring(1) || 'dashboard';
    loadView(hash);
    window.addEventListener('hashchange', () => loadView(window.location.hash.substring(1) || 'dashboard'));
    navButtons.forEach(button => {
        if (button.tagName === 'BUTTON') {
            button.addEventListener('click', (e) => window.location.hash = e.currentTarget.dataset.view);
        }
    });
});