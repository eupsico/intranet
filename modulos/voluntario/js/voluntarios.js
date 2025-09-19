export function init(db, user, userData) {
    const gridContainer = document.getElementById('voluntarios-grid-container');

    if (!gridContainer) return;

    async function carregarVoluntarios() {
        try {
            const querySnapshot = await db.collection('usuarios').orderBy('nome', 'asc').get();

            if (querySnapshot.empty) {
                gridContainer.innerHTML = '<p>Nenhum voluntário encontrado.</p>';
                return;
            }

            let cardsHtml = '';
            querySnapshot.forEach(doc => {
                const voluntario = doc.data();
                
                // --- ALTERAÇÃO APLICADA AQUI ---
                let fotoUrlFinal = '../../../assets/img/avatar-padrao.png'; // Começa com o logo padrão
                
                // Usa a foto do banco de dados APENAS se for uma URL completa (do e-mail/Google).
                if (voluntario.fotoUrl && voluntario.fotoUrl.startsWith('http')) {
                    fotoUrlFinal = voluntario.fotoUrl;
                }

                const funcoes = Array.isArray(voluntario.funcoes) ? voluntario.funcoes.join(', ') : 'Não informado';

                cardsHtml += `
                    <div class="voluntario-card">
                        <div class="profile-pic-container">
                            <img src="${fotoUrlFinal}" alt="Foto de ${voluntario.nome}" class="profile-pic" onerror="this.src='../../../assets/img/avatar-padrao.png';">
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

    carregarVoluntarios();
}