// modules/financeiro/js/gestao_profissionais.js (Versão com funcionalidade de Adicionar)

(function() {
    // Acessa o 'db' do Firestore que foi inicializado globalmente
    const db = firebase.firestore();

    // Lógica para navegação em abas
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

    // Garante que o elemento existe antes de clicar
    const firstTab = document.querySelector('.tab-link[data-tab="GestaoProfissionais"]');
    if (firstTab) {
        firstTab.click();
    }

    
    // --- LÓGICA DO FIREBASE E DO MODAL ---

    // Elementos da Tabela
    const tableBody = document.querySelector('#profissionais-table tbody');
    
    // Elementos do Modal
    const modal = document.getElementById('profissional-modal');
    const modalTitle = document.getElementById('modal-title');
    const profissionalForm = document.getElementById('profissional-form');
    const cancelButton = document.getElementById('modal-cancel-btn');
    const addProfissionalButton = document.getElementById('add-profissional-btn');
    const deleteButton = document.getElementById('modal-delete-btn');

    /**
     * Busca os usuários no Firestore e os renderiza na tabela.
     */
    async function carregarProfissionais() {
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
                    <td>
                        <button class="action-button-small edit-btn" data-id="${doc.id}">Editar</button>
                    </td>
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
        modalTitle.textContent = 'Adicionar Novo Profissional';
        if(deleteButton) deleteButton.style.display = 'none';
        if(modal) modal.style.display = 'flex';
    }

    /**
     * Fecha o modal.
     */
    function fecharModal() {
        if(modal) modal.style.display = 'none';
    }

    /**
     * Salva os dados do formulário no Firestore (criação ou edição).
     */
    async function salvarProfissional(event) {
        event.preventDefault();

        const profissionalId = document.getElementById('profissional-id').value;

        const funcoesSelecionadas = [];
        document.querySelectorAll('input[name="funcoes"]:checked').forEach(checkbox => {
            funcoesSelecionadas.push(checkbox.value);
        });

        const dadosProfissional = {
            nome: document.getElementById('prof-nome').value.trim(),
            email: document.getElementById('prof-email').value.trim(),
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
                // Lógica de ATUALIZAÇÃO (será implementada no próximo passo)
                await db.collection('usuarios').doc(profissionalId).update(dadosProfissional);
                if(window.showToast) window.showToast('Profissional atualizado com sucesso!');
            } else {
                // Lógica de CRIAÇÃO
                await db.collection('usuarios').add(dadosProfissional);
                if(window.showToast) window.showToast('Profissional adicionado com sucesso!');
            }
            
            fecharModal();
            carregarProfissionais();

        } catch (error) {
            console.error("Erro ao salvar profissional:", error);
            if(window.showToast) window.showToast('Erro ao salvar profissional.', 'error');
        }
    }

    // --- EVENT LISTENERS ---
    
    if (addProfissionalButton) {
        addProfissionalButton.addEventListener('click', abrirModalParaCriar);
    }
    if (cancelButton) {
        cancelButton.addEventListener('click', fecharModal);
    }
    if (profissionalForm) {
        profissionalForm.addEventListener('submit', salvarProfissional);
    }

    // Carrega os profissionais quando a aba é ativada.
    if (firstTab && firstTab.dataset.tab === 'GestaoProfissionais') {
        carregarProfissionais();
    }
    
})();