// modules/financeiro/js/painel-script.js (Versão Simplificada e Final)

document.addEventListener('userReady', function(event) {
    const db = firebase.firestore();
    const functions = firebase.functions();
    let localUsuariosList = [];

    // --- Seleção de Elementos ---
    const tableBody = document.querySelector('#profissionais-table tbody');
    const modal = document.getElementById('profissional-modal');
    const modalTitle = document.getElementById('modal-title');
    const profissionalForm = document.getElementById('profissional-form');
    const cancelButton = document.getElementById('modal-cancel-btn');
    const addProfissionalButton = document.getElementById('add-profissional-btn');
    const saveButton = document.getElementById('modal-save-btn');

    // --- Funções ---
    
    function ouvirMudancasProfissionais() {
        if (!tableBody) return;
        tableBody.innerHTML = '<tr><td colspan="5">Carregando...</td></tr>';
        db.collection('usuarios').orderBy('nome').onSnapshot(snapshot => {
            tableBody.innerHTML = '';
            localUsuariosList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            localUsuariosList.forEach(p => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${p.nome || ''}</td>
                    <td>${p.contato || ''}</td>
                    <td>${(p.funcoes || []).join(', ')}</td>
                    <td>${p.inativo ? 'Sim' : 'Não'}</td>
                    <td><button class="action-button-small edit-btn" data-id="${p.id}">Editar</button></td>
                `;
                tableBody.appendChild(tr);
            });
        }, error => console.error("Erro ao carregar profissionais:", error));
    }

    function abrirModal(profissional = null) {
        profissionalForm.reset();
        const emailInput = document.getElementById('prof-email');
        if (profissional) { // Edição
            modalTitle.textContent = 'Editar Profissional';
            document.getElementById('profissional-id').value = profissional.id;
            document.getElementById('prof-nome').value = profissional.nome || '';
            emailInput.value = profissional.email || '';
            emailInput.disabled = true;
            // Preencher outros campos...
        } else { // Criação
            modalTitle.textContent = 'Adicionar Novo Profissional';
            document.getElementById('profissional-id').value = '';
            emailInput.disabled = false;
        }
        if (modal) modal.style.display = 'flex';
    }

    function fecharModal() {
        if (modal) modal.style.display = 'none';
    }

    async function salvarProfissional(event) {
        event.preventDefault();
        const id = document.getElementById('profissional-id').value;
        const dados = {
            nome: document.getElementById('prof-nome').value.trim(),
            email: document.getElementById('prof-email').value.trim(),
            // Coletar outros dados...
        };

        if (!dados.nome || !dados.email) return alert('Nome e E-mail são obrigatórios.');
        
        saveButton.disabled = true;
        saveButton.textContent = 'Salvando...';
        try {
            if (id) {
                await db.collection('usuarios').doc(id).update(dados);
                alert('Profissional atualizado!');
            } else {
                const criarNovoProfissional = functions.httpsCallable('criarNovoProfissional');
                const resultado = await criarNovoProfissional(dados);
                alert(resultado.data.message || 'Profissional criado!');
            }
            fecharModal();
        } catch (error) {
            alert(`Erro: ${error.message}`);
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = 'Salvar';
        }
    }

    // --- Inicialização dos Eventos ---
    if (addProfissionalButton) addProfissionalButton.addEventListener('click', () => abrirModal(null));
    if (cancelButton) cancelButton.addEventListener('click', fecharModal);
    if (tableBody) {
        tableBody.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-btn')) {
                const id = e.target.dataset.id;
                const profissional = localUsuariosList.find(p => p.id === id);
                if (profissional) abrirModal(profissional);
            }
        });
    }
    ouvirMudancasProfissionais();
});