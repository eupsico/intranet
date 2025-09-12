// modules/financeiro/js/gestao_profissionais.js (Versão com Adicionar Profissional)

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

    document.querySelector('.tab-link[data-tab="GestaoProfissionais"]').click();

    
    // --- LÓGICA DO FIREBASE ---

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
            window.showToast('Erro ao carregar profissionais.', 'error');
        }
    }

    /**
     * ✅ NOVA FUNÇÃO: Abre o modal para adicionar um novo profissional.
     */
    function abrirModalParaCriar() {
        profissionalForm.reset(); // Limpa o formulário
        document.getElementById('profissional-id').value = ''; // Garante que o ID oculto está vazio
        modalTitle.textContent = 'Adicionar Novo Profissional';
        deleteButton.style.display = 'none'; // Esconde o botão de excluir
        modal.style.display = 'flex'; // Mostra o modal
    }

    /**
     * ✅ NOVA FUNÇÃO: Fecha o modal.
     */
    function fecharModal() {
        modal.style.display = 'none';
    }

    /**
     * ✅ NOVA FUNÇÃO: Salva os dados do formulário no Firestore.
     */
    async function salvarProfissional(event) {
        event.preventDefault(); // Impede o recarregamento da página

        const profissionalId = document.getElementById('profissional-id').value;

        // Coleta as funções marcadas
        const funcoesSelecionadas = [];
        document.querySelectorAll('input[name="funcoes"]:checked').forEach(checkbox => {
            funcoesSelecionadas.push(checkbox.value);
        });

        // Monta o objeto com os dados do profissional
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
                // await db.collection('usuarios').doc(profissionalId).update(dadosProfissional);
                // window.showToast('Profissional atualizado com sucesso!');
            } else {
                // Lógica de CRIAÇÃO
                await db.collection('usuarios').add(dadosProfissional);
                window.showToast('Profissional adicionado com sucesso!');
            }
            
            fecharModal();
            carregarProfissionais(); // Recarrega a tabela para mostrar o novo registro

        } catch (error) {
            console.error("Erro ao salvar profissional:", error);
            window.showToast('Erro ao salvar profissional.', 'error');
        }
    }


    // --- EVENT LISTENERS ---

    // Carrega os profissionais assim que o script é executado
    carregarProfissionais();
    
    // Adiciona evento ao botão "Adicionar Profissional"
    if (addProfissionalButton) {
        addProfissionalButton.addEventListener('click', abrirModalParaCriar);
    }

    // Adiciona evento para fechar o modal no botão "Cancelar"
    if (cancelButton) {
        cancelButton.addEventListener('click', fecharModal);
    }
    
    // Adiciona evento de submit ao formulário do modal
    if (profissionalForm) {
        profissionalForm.addEventListener('submit', salvarProfissional);
    }
    

    // TODO:
    // - Abrir e preencher o modal ao clicar em 'Editar'
    // - Implementar a lógica de 'Excluir'

})();