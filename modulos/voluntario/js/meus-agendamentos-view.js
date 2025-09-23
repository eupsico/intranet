// Arquivo: /modulos/voluntario/js/meus-agendamentos-view.js (CORRIGIDO)
// Versão: 1.3 (Lida com datas em formato de texto e Timestamp para exibir a lista)
// Descrição: Controla a aba "Meus Agendamentos", listando as solicitações recebidas.

export async function init(db, user, userData) {
    const listaContainer = document.getElementById('lista-agendamentos-container');
    if (!listaContainer) {
        console.error("Componente da aba 'Meus Agendamentos' não encontrado.");
        return;
    }

    // --- INÍCIO DA CORREÇÃO ---
    // Função robusta para converter Timestamp do Firebase OU texto para um objeto Date do Javascript
    function toDate(dateField) {
        if (!dateField) return null;
        // Se for um objeto Timestamp do Firebase, usa o método toDate()
        if (typeof dateField.toDate === 'function') {
            return dateField.toDate();
        }
        // Se for um texto (string), cria um novo objeto Date a partir dele
        return new Date(dateField);
    }
    // --- FIM DA CORREÇÃO ---

    // Formata um objeto Date para um formato amigável
    function formatarData(dateObject) {
        if (!dateObject) return 'Data não informada';
        return dateObject.toLocaleDateString('pt-BR', {
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
            const dataObj = toDate(agendamento.dataAgendamento); // Usa a função auxiliar
            const itemEl = document.createElement('div');
            itemEl.className = 'agendamento-item';
            itemEl.innerHTML = `
                <div class="agendamento-data">
                    <span class="dia">${dataObj ? dataObj.getDate() : ''}</span>
                    <span class="mes">${dataObj ? dataObj.toLocaleString('pt-BR', { month: 'short' }).toUpperCase() : ''}</span>
                </div>
                <div class="agendamento-info">
                    <h4>${agendamento.profissionalNome}</h4>
                    <p>
                        <strong>Contato:</strong> ${agendamento.profissionalEmail || 'Não informado'} | 
                        <strong>Telefone:</strong> ${agendamento.profissionalTelefone || 'Não informado'}
                    </p>
                    <p><strong>Horário Solicitado:</strong> ${formatarData(dataObj)}</p>
                </div>
            `;
            listaContainer.appendChild(itemEl);
        });
    }

    // Inicia o carregamento
    try {
        listaContainer.innerHTML = '<div class="loading-spinner"></div>';
        
        const q = db.collection("agendamentos").where("supervisorUid", "==", user.uid);
        const querySnapshot = await q.get();
        let agendamentos = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Ordena a lista usando a função auxiliar que lida com os dois formatos de data
        agendamentos.sort((a, b) => {
            const dateA = toDate(a.dataAgendamento);
            const dateB = toDate(b.dataAgendamento);
            return (dateB || 0) - (dateA || 0); // Ordena do mais recente para o mais antigo
        });
        
        renderizarLista(agendamentos);

    } catch (error) {
        console.error("Erro ao carregar agendamentos:", error);
        listaContainer.innerHTML = '<p class="alert alert-error">Ocorreu um erro ao buscar seus agendamentos.</p>';
    }
}