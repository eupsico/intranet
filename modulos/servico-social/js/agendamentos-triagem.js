// Arquivo: /modulos/servico-social/js/agendamentos-triagem.js
// Descrição: Carrega e exibe as fichas de inscrição pendentes de triagem.

export function init(db, user, userData) {
    const tableBody = document.getElementById('triagem-table-body');

    if (!tableBody) {
        console.error("Elemento 'triagem-table-body' não encontrado.");
        return;
    }

    // Função para formatar a data para o padrão brasileiro.
    function formatarData(timestamp) {
        if (!timestamp || !timestamp.toDate) {
            return 'N/A';
        }
        return timestamp.toDate().toLocaleDateString('pt-BR');
    }

    // Função para formatar valores monetários.
    function formatarMoeda(valor) {
        if (typeof valor !== 'number') {
            return 'N/A';
        }
        return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    // Busca as inscrições no Firestore
    async function carregarAgendamentos() {
        tableBody.innerHTML = '<tr><td colspan="10"><div class="loading-spinner"></div></td></tr>';

        try {
            const inscricoesRef = db.collection('inscricoes').where('status', '==', 'aguardando_triagem');
            const snapshot = await inscricoesRef.get();

            if (snapshot.empty) {
                tableBody.innerHTML = '<tr><td colspan="10">Nenhuma nova inscrição aguardando triagem.</td></tr>';
                return;
            }

            let linhasTabela = '';
            snapshot.forEach(doc => {
                const data = doc.data();
                linhasTabela += `
                    <tr>
                        <td>Triagem</td>
                        <td>${data.nomeCompleto || 'Não informado'}</td>
                        <td>${data.responsavel || 'N/A'}</td>
                        <td>${data.telefoneCelular || 'Não informado'}</td>
                        <td>${formatarData(data.timestamp)}</td>
                        <td>${formatarMoeda(data.rendaMensal)}</td>
                        <td>${formatarMoeda(data.rendaFamiliar)}</td>
                        <td>${data.assistenteSocial || 'A designar'}</td>
                        <td><a href="#fila-atendimento/${doc.id}" class="action-button">Abrir Ficha</a></td>
                        <td>${data.observacoes || ''}</td>
                    </tr>
                `;
            });
            tableBody.innerHTML = linhasTabela;

        } catch (error) {
            console.error("Erro ao carregar agendamentos de triagem:", error);
            tableBody.innerHTML = '<tr><td colspan="10" class="error-message">Erro ao carregar os dados. Tente novamente mais tarde.</td></tr>';
        }
    }

    carregarAgendamentos();
}