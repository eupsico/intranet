// Arquivo: /modulos/voluntario/js/meus-agendamentos-view.js
// Descrição: Controla a aba "Meus Agendamentos", listando as solicitações recebidas.

export async function init(db, user, userData) {
    const listaContainer = document.getElementById('lista-agendamentos-container');
    if (!listaContainer) {
        console.error("Componente da aba 'Meus Agendamentos' não encontrado.");
        return;
    }

    // Formata a data para um formato amigável
    function formatarData(isoString) {
        if (!isoString) return 'Data não informada';
        const data = new Date(isoString);
        return data.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }

    // Renderiza a lista de agendamentos
    function renderizarLista(agendamentos) {
        listaContainer.innerHTML = '';
        if (agendamentos.length === 0) {
            listaContainer.innerHTML = '<p class="no-fichas-message">Nenhum agendamento encontrado.</p>';
            return;
        }

        agendamentos.forEach(agendamento => {
            const itemEl = document.createElement('div');
            itemEl.className = 'agendamento-item';
            itemEl.innerHTML = `
                <div class="agendamento-data">
                    <span class="dia">${new Date(agendamento.dataAgendamento).getDate()}</span>
                    <span class="mes">${new Date(agendamento.dataAgendamento).toLocaleString('pt-BR', { month: 'short' }).toUpperCase()}</span>
                </div>
                <div class="agendamento-info">
                    <h4>${agendamento.profissionalNome}</h4>
                    <p>
                        <strong>Contato:</strong> ${agendamento.profissionalEmail || 'Não informado'} | 
                        <strong>Telefone:</strong> ${agendamento.profissionalTelefone || 'Não informado'}
                    </p>
                    <p><strong>Horário Solicitado:</strong> ${formatarData(agendamento.dataAgendamento)}</p>
                </div>
            `;
            listaContainer.appendChild(itemEl);
        });
    }

    // Inicia o carregamento
    try {
        listaContainer.innerHTML = '<div class="loading-spinner"></div>';
        const q = db.collection("agendamentos")
                    .where("supervisorUid", "==", user.uid)
                    .orderBy("dataAgendamento", "desc"); // Mais recentes primeiro

        const querySnapshot = await q.get();
        const agendamentos = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        renderizarLista(agendamentos);

    } catch (error) {
        console.error("Erro ao carregar agendamentos:", error);
        listaContainer.innerHTML = '<p class="alert alert-error">Ocorreu um erro ao buscar seus agendamentos.</p>';
    }
}