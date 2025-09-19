export function init(db, user, userData) {
    const gridContainer = document.getElementById('voluntarios-grid-container');

    if (!gridContainer) return;

    /**
     * Busca os voluntários no Firestore e os exibe na tela.
     */
    async function carregarVoluntarios() {
        try {
            // Busca todos os documentos da coleção 'usuarios'
            const querySnapshot = await db.collection('usuarios').orderBy('nome', 'asc').get();

            if (querySnapshot.empty) {
                gridContainer.innerHTML = '<p>Nenhum voluntário encontrado.</p>';
                return;
            }

            let cardsHtml = '';
            querySnapshot.forEach(doc => {
                const voluntario = doc.data();

                // Define uma foto padrão caso o voluntário não tenha uma
                const fotoUrl = voluntario.fotoUrl || '../../../assets/img/avatar-padrao.png';

                // Formata as funções para exibição
                const funcoes = Array.isArray(voluntario.funcoes) ? voluntario.funcoes.join(', ') : 'Não informado';

                cardsHtml += `
                    <div class="voluntario-card">
                        <div class="profile-pic-container">
                            <img src="${fotoUrl}" alt="Foto de ${voluntario.nome}" class="profile-pic" onerror="this.src='../../../assets/img/avatar-padrao.png';">
                        </div>
                        <h3 class="nome">${voluntario.nome || 'Nome não informado'}</h3>
                        <p class="funcao">${funcoes}</p>
                        <ul class="info-list">
                            <li>
                                <strong>Profissão:</strong>
                                <span>${voluntario.profissao || 'Não informada'}</span>
                            </li>
                            <li>
                                <strong>Início:</strong>
                                <span>${voluntario.dataInicio || 'Não informada'}</span>
                            </li>
                        </ul>
                    </div>
                `;
            });

            gridContainer.innerHTML = cardsHtml;

        } catch (error) {
            console.error("Erro ao carregar voluntários:", error);
            gridContainer.innerHTML = `<p class="alert alert-error">Não foi possível carregar a lista de voluntários.</p>`;
        }
    }

    // --- INICIALIZAÇÃO ---
    carregarVoluntarios();
}