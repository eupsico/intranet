// modules/financeiro/js/gestao_profissionais.js

(function() {
    // Acessa o 'db' do Firestore que foi inicializado globalmente
    const db = firebase.firestore();

    // Lógica para navegação em abas (seu código original)
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

    // Ativa a primeira aba por padrão
    document.querySelector('.tab-link[data-tab="GestaoProfissionais"]').click();

    
    // --- LÓGICA DO FIREBASE ---

    const tableBody = document.querySelector('#profissionais-table tbody');

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

            tableBody.innerHTML = ''; // Limpa a tabela antes de adicionar as novas linhas

            snapshot.forEach(doc => {
                const profissional = doc.data();
                const tr = document.createElement('tr');
                tr.dataset.id = doc.id; // Salva o ID do documento na linha da tabela

                // Formata os dados para exibição
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

    // Carrega os profissionais assim que o script é executado
    carregarProfissionais();


    // TODO:
    // - Abrir e preencher o modal ao clicar em 'Editar'
    // - Abrir o modal em branco ao clicar em 'Adicionar'
    // - Salvar, editar e excluir profissionais

})();